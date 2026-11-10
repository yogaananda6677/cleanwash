<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Enums\VoucherStatus;
use App\Models\AuditLog;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\RiwayatStatusProduksi;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use App\Services\JenisLayananService;
use App\Services\ProduksiService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProduksiOperationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function createPetugasUser(): User
    {
        $user = User::factory()->petugas()->create(['name' => 'Kasir Satu']);
        Petugas::create([
            'user_id' => $user->id,
            'nama_petugas' => $user->name,
        ]);

        return $user;
    }

    private function createPegawaiUser(bool $active = true, bool $withProfile = true, string $name = 'Pegawai Produksi'): User
    {
        $factory = User::factory()->pegawai();
        if (! $active) {
            $factory = $factory->inactive();
        }

        $user = $factory->create(['name' => $name]);

        if ($withProfile) {
            Pegawai::create([
                'user_id' => $user->id,
                'nama_pegawai' => $user->name,
            ]);
        }

        return $user;
    }

    private function createPengantarUser(): User
    {
        $user = User::factory()->pengantar()->create(['name' => 'Kurir Satu']);
        PetugasPengantaran::create([
            'user_id' => $user->id,
            'nama_petugas_antar' => $user->name,
        ]);

        return $user;
    }

    private function createPelanggan(string $nama = 'Budi Santoso', string $phone = '081234567890'): Pelanggan
    {
        return Pelanggan::create([
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Kaliurang KM 5',
            'boleh_bayar_akhir' => false,
        ]);
    }

    private function createLayanan(
        string $nama = 'Cuci Setrika',
        MetodeHitung $metode = MetodeHitung::BERAT,
        SatuanLayanan $satuan = SatuanLayanan::KG,
        string $harga = '10000.00',
        bool $perluSetrika = true
    ): JenisLayanan {
        return app(JenisLayananService::class)->create([
            'nama_layanan' => $nama,
            'tingkat_kecepatan' => TingkatKecepatan::REGULER->value,
            'metode_hitung' => $metode->value,
            'satuan' => $satuan->value,
            'harga_satuan' => $harga,
            'perlu_setrika' => $perluSetrika,
            'is_active' => true,
        ]);
    }

    private function createTransaksiViaService(
        Petugas $petugas,
        Pelanggan $pelanggan,
        JenisLayanan $layanan,
        string $qty = '2.00',
        ?string $voucherCode = null,
        string $dp = '0.00'
    ): Transaksi {
        return app(TransaksiService::class)->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $qty,
            'nomor_voucher' => $voucherCode,
            'nominal_dp' => $dp,
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
    }

    public function test_ac_p2_01_produksi_endpoints_enforce_active_pegawai_rbac_and_cross_role_denial(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser();
        $inactivePegawai = $this->createPegawaiUser(active: false);
        $pegawaiWithoutProfile = $this->createPegawaiUser(active: true, withProfile: false);
        $pengantarUser = $this->createPengantarUser();

        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan();
        $transaksi = $this->createTransaksiViaService($petugas, $pelanggan, $layanan);

        // Guests redirected to login
        $this->get('/produksi')->assertRedirect('/login');
        $this->post("/produksi/{$transaksi->nomor_nota}/timbang-ulang", ['berat_aktual' => '2.50'])->assertRedirect('/login');
        $this->post("/produksi/{$transaksi->nomor_nota}/status", ['tahap_status' => 'DICUCI'])->assertRedirect('/login');

        // PETUGAS, PENGANTAR, and inactive PEGAWAI receive 403
        foreach ([$petugasUser, $pengantarUser, $inactivePegawai] as $user) {
            $this->actingAs($user)->get('/produksi')->assertForbidden();
            $this->actingAs($user)
                ->post("/produksi/{$transaksi->nomor_nota}/timbang-ulang", ['berat_aktual' => '2.50'])
                ->assertForbidden();
            $this->actingAs($user)
                ->post("/produksi/{$transaksi->nomor_nota}/status", ['tahap_status' => 'DICUCI'])
                ->assertForbidden();
        }

        // Active PEGAWAI without Pegawai profile record is also rejected 403 on state mutations
        $this->actingAs($pegawaiWithoutProfile)
            ->post("/produksi/{$transaksi->nomor_nota}/timbang-ulang", ['berat_aktual' => '2.50'])
            ->assertForbidden();
        $this->actingAs($pegawaiWithoutProfile)
            ->post("/produksi/{$transaksi->nomor_nota}/status", ['tahap_status' => 'DICUCI'])
            ->assertForbidden();

        // PEGAWAI remains forbidden on Petugas routes
        foreach (['/pelanggan', '/layanan', '/voucher', '/transaksi'] as $petugasRoute) {
            $this->actingAs($pegawaiUser)->get($petugasRoute)->assertForbidden();
        }

        // Gate abilities registered via ProduksiPolicy
        $this->assertTrue(Gate::forUser($pegawaiUser)->allows('produksi.viewAny'));
        $this->assertTrue(Gate::forUser($pegawaiUser)->allows('produksi.timbangUlang', $transaksi));
        $this->assertTrue(Gate::forUser($pegawaiUser)->allows('produksi.ubahStatus', $transaksi));
        $this->assertTrue(Gate::forUser($petugasUser)->denies('produksi.viewAny'));
        $this->assertTrue(Gate::forUser($pengantarUser)->denies('produksi.timbangUlang', $transaksi));
    }

    public function test_ac_p2_01_pegawai_can_browse_filter_search_and_paginate_produksi_queue_without_n_plus_1(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser();
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();

        $pelangganA = $this->createPelanggan('Andi Wijaya', '081111000111');
        $pelangganB = $this->createPelanggan('Citra Lestari', '082222000222');
        $layanan = $this->createLayanan();
        $produksiService = app(ProduksiService::class);

        $notas = [];
        for ($i = 1; $i <= 12; $i++) {
            Carbon::setTestNow(Carbon::create(2026, 11, 10, 8, $i, 0, 'Asia/Jakarta'));
            $trx = $this->createTransaksiViaService(
                $petugas,
                $i === 1 ? $pelangganA : $pelangganB,
                $layanan,
                '2.00'
            );
            $notas[] = $trx->nomor_nota;
        }
        Carbon::setTestNow();

        // Advance stages on specific transactions:
        // nota[0] (Andi): DICUCI
        $produksiService->ubahStatusProduksi($notas[0], $pegawai, ['tahap_status' => TahapProduksi::DICUCI->value]);

        // nota[1]: DICUCI -> DIKERINGKAN
        $produksiService->ubahStatusProduksi($notas[1], $pegawai, ['tahap_status' => TahapProduksi::DICUCI->value]);
        $produksiService->ubahStatusProduksi($notas[1], $pegawai, ['tahap_status' => TahapProduksi::DIKERINGKAN->value]);

        // nota[2]: full pipeline to SELESAI
        foreach ([TahapProduksi::DICUCI, TahapProduksi::DIKERINGKAN, TahapProduksi::DISETRIKA, TahapProduksi::SELESAI] as $stage) {
            $produksiService->ubahStatusProduksi($notas[2], $pegawai, ['tahap_status' => $stage->value]);
        }

        // nota[3]: DIAMBIL (must be excluded from queue & stageCounts)
        foreach ([TahapProduksi::DICUCI, TahapProduksi::DIKERINGKAN, TahapProduksi::DISETRIKA, TahapProduksi::SELESAI] as $stage) {
            $produksiService->ubahStatusProduksi($notas[3], $pegawai, ['tahap_status' => $stage->value]);
        }
        Transaksi::where('nomor_nota', $notas[3])->update([
            'status_transaksi' => StatusTransaksi::DIAMBIL,
            'diambil_pada' => now('Asia/Jakarta'),
        ]);

        // nota[4]: DIBATALKAN (must be excluded from queue & stageCounts)
        Transaksi::where('nomor_nota', $notas[4])->update([
            'status_transaksi' => StatusTransaksi::DIBATALKAN,
        ]);

        // Active queue now has: 7 DITERIMA + 1 DICUCI + 1 DIKERINGKAN = 9 AKTIF, plus 1 SELESAI (total ALL = 10)
        // Create 2 more DITERIMA AKTIF rows so AKTIF = 11 (> 10 per page) to test pagination
        for ($j = 13; $j <= 14; $j++) {
            Carbon::setTestNow(Carbon::create(2026, 11, 10, 9, $j, 0, 'Asia/Jakarta'));
            $this->createTransaksiViaService($petugas, $pelangganB, $layanan, '2.00');
        }
        Carbon::setTestNow();

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($pegawaiUser)->get('/produksi');

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        // Single stageCounts query + count + paginate + eager relations <= 18 queries (N+1 would exceed 50+)
        $this->assertLessThanOrEqual(18, count($queries), 'Possible N+1 query on GET /produksi: '.count($queries));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Produksi/Index', shouldExist: false)
                ->where('filters.search', '')
                ->where('filters.tahap_status', '')
                ->where('filters.status_transaksi', 'AKTIF')
                ->has('transaksi.data', 10)
                ->where('transaksi.total', 11)
                ->where('stageCounts.DITERIMA', 9)
                ->where('stageCounts.DICUCI', 1)
                ->where('stageCounts.DIKERINGKAN', 1)
                ->where('stageCounts.DISETRIKA', 0)
                ->where('stageCounts.SELESAI', 1)
            );

        // Search by customer name + filter tahap_status
        $this->actingAs($pegawaiUser)
            ->get('/produksi?search=Andi&tahap_status=DICUCI')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Produksi/Index', shouldExist: false)
                ->where('filters.search', 'Andi')
                ->where('filters.tahap_status', 'DICUCI')
                ->where('filters.status_transaksi', 'AKTIF')
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $notas[0])
                ->where('transaksi.data.0.tahap_produksi_terakhir', 'DICUCI')
                ->where('transaksi.data.0.tahap_produksi_berikutnya', 'DIKERINGKAN')
            );

        // Search by nomor_nota and customer phone
        $this->actingAs($pegawaiUser)
            ->get('/produksi?search=081111000111')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $notas[0])
            );

        // Filter status_transaksi=SELESAI and status_transaksi=ALL
        $this->actingAs($pegawaiUser)
            ->get('/produksi?status_transaksi=SELESAI')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.status_transaksi', 'SELESAI')
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $notas[2])
            );

        $this->actingAs($pegawaiUser)
            ->get('/produksi?status_transaksi=ALL')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.status_transaksi', 'ALL')
                ->where('transaksi.total', 12)
            );

        $this->actingAs($pegawaiUser)
            ->get('/produksi?tahap_status=SELESAI')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.tahap_status', 'SELESAI')
                ->where('filters.status_transaksi', 'SELESAI')
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $notas[2])
            );
    }

    public function test_ac_p2_02_pegawai_can_advance_production_status_sequentially_for_setrika_and_non_setrika_services(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 11, 0, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugasUser()->petugas()->firstOrFail();
            $pegawaiUser = $this->createPegawaiUser();
            $pegawai = $pegawaiUser->pegawai()->firstOrFail();
            $pelanggan = $this->createPelanggan();

            $layananSetrika = $this->createLayanan(nama: 'Cuci Setrika', perluSetrika: true);
            $layananSepatu = $this->createLayanan(
                nama: 'Cuci Sepatu',
                metode: MetodeHitung::JUMLAH,
                satuan: SatuanLayanan::PCS,
                harga: '30000.00',
                perluSetrika: false
            );

            $trxSetrika = $this->createTransaksiViaService($petugas, $pelanggan, $layananSetrika, '2.00');
            $trxSepatu = $this->createTransaksiViaService($petugas, $pelanggan, $layananSepatu, '1');

            // perlu_setrika = true: DITERIMA -> DICUCI -> DIKERINGKAN -> DISETRIKA -> SELESAI
            foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
                $response = $this->actingAs($pegawaiUser)
                    ->post("/produksi/{$trxSetrika->nomor_nota}/status", [
                        'tahap_status' => $stage,
                        'catatan' => "Tahap {$stage}",
                    ]);

                $response->assertRedirect('/produksi');
                $response->assertSessionHas('success');
            }

            $trxSetrika->refresh();
            $this->assertSame(StatusTransaksi::SELESAI, $trxSetrika->status_transaksi);

            $historySetrika = RiwayatStatusProduksi::where('nomor_nota', $trxSetrika->nomor_nota)
                ->orderBy('waktu_update')
                ->orderBy('id_status_produksi')
                ->get();

            $this->assertSame(
                ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'],
                $historySetrika->map(fn ($r) => $r->tahap_status->value)->all()
            );
            $this->assertSame($pegawai->id_pegawai, $historySetrika->last()->id_pegawai);

            $auditCount = AuditLog::where('subject_id', $trxSetrika->nomor_nota)
                ->where('action', 'PRODUKSI_STATUS_UPDATED')
                ->count();
            $this->assertSame(4, $auditCount);

            // perlu_setrika = false: DITERIMA -> DICUCI -> DIKERINGKAN -> SELESAI
            foreach (['DICUCI', 'DIKERINGKAN', 'SELESAI'] as $stage) {
                $this->actingAs($pegawaiUser)
                    ->post("/produksi/{$trxSepatu->nomor_nota}/status", [
                        'tahap_status' => $stage,
                    ])
                    ->assertRedirect('/produksi')
                    ->assertSessionHas('success');
            }

            $trxSepatu->refresh();
            $this->assertSame(StatusTransaksi::SELESAI, $trxSepatu->status_transaksi);
            $this->assertSame(
                ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'],
                $trxSepatu->riwayatStatusProduksi->map(fn ($r) => $r->tahap_status->value)->all()
            );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_ac_p2_03_rejects_422_on_illegal_production_transitions_and_non_active_transactions(): void
    {
        $petugas = $this->createPetugasUser()->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser();
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();
        $pelanggan = $this->createPelanggan();

        $layananSepatu = $this->createLayanan(
            nama: 'Cuci Sepatu',
            metode: MetodeHitung::JUMLAH,
            satuan: SatuanLayanan::PCS,
            harga: '25000.00',
            perluSetrika: false
        );

        $trx = $this->createTransaksiViaService($petugas, $pelanggan, $layananSepatu, '1');

        // 1. Skip stage (DITERIMA -> DIKERINGKAN) -> 422 JSON & redirect flash error
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trx->nomor_nota}/status", ['tahap_status' => 'DIKERINGKAN'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('tahap_status');

        $this->actingAs($pegawaiUser)
            ->from('/produksi')
            ->post("/produksi/{$trx->nomor_nota}/status", ['tahap_status' => 'DIKERINGKAN'])
            ->assertRedirect('/produksi')
            ->assertSessionHas('error')
            ->assertSessionHasErrors('tahap_status');

        // Advance to DICUCI then DIKERINGKAN
        app(ProduksiService::class)->ubahStatusProduksi($trx->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);
        app(ProduksiService::class)->ubahStatusProduksi($trx->nomor_nota, $pegawai, ['tahap_status' => 'DIKERINGKAN']);

        // 2. Reject DISETRIKA when perlu_setrika = false
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trx->nomor_nota}/status", ['tahap_status' => 'DISETRIKA'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('tahap_status');

        // 3. Reject repeat (DIKERINGKAN) and backward (DICUCI)
        foreach (['DIKERINGKAN', 'DICUCI'] as $invalidStage) {
            $this->actingAs($pegawaiUser)
                ->postJson("/produksi/{$trx->nomor_nota}/status", ['tahap_status' => $invalidStage])
                ->assertStatus(422)
                ->assertJsonValidationErrors('tahap_status');
        }

        // Complete to SELESAI
        app(ProduksiService::class)->ubahStatusProduksi($trx->nomor_nota, $pegawai, ['tahap_status' => 'SELESAI']);

        // 4. Reject updates on SELESAI, DIAMBIL, DIBATALKAN
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trx->nomor_nota}/status", ['tahap_status' => 'SELESAI'])
            ->assertStatus(422);

        $trxDiambil = $this->createTransaksiViaService($petugas, $pelanggan, $layananSepatu, '1');
        $trxDiambil->update(['status_transaksi' => StatusTransaksi::DIAMBIL]);
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trxDiambil->nomor_nota}/status", ['tahap_status' => 'DICUCI'])
            ->assertStatus(422);

        $trxBatal = $this->createTransaksiViaService($petugas, $pelanggan, $layananSepatu, '1');
        $trxBatal->update(['status_transaksi' => StatusTransaksi::DIBATALKAN]);
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trxBatal->nomor_nota}/status", ['tahap_status' => 'DICUCI'])
            ->assertStatus(422);

        // 5. Unknown nota -> 404
        $this->actingAs($pegawaiUser)
            ->postJson('/produksi/CW-99999999-9999/status', ['tahap_status' => 'DICUCI'])
            ->assertNotFound();
    }

    public function test_ac_p2_04_and_ac_p2_05_timbang_ulang_via_http_enforces_kk01_kk09_and_validation_rules(): void
    {
        $petugas = $this->createPetugasUser()->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser();
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();
        $pelanggan = $this->createPelanggan();

        $layananKg = $this->createLayanan(
            nama: 'Cuci Setrika Kiloan',
            metode: MetodeHitung::BERAT,
            satuan: SatuanLayanan::KG,
            harga: '10000.00',
            perluSetrika: true
        );
        $layananPcs = $this->createLayanan(
            nama: 'Cuci Sepatu',
            metode: MetodeHitung::JUMLAH,
            satuan: SatuanLayanan::PCS,
            harga: '25000.00',
            perluSetrika: false
        );

        Voucher::create([
            'nomor_voucher' => 'HEMAT5K',
            'nilai' => '5000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // Scenario 1 (LUNAS -> BELUM_LUNAS, KK-09 preserved after master rate update)
        // 2.00 kg * 10000 - 5000 = 15000.00, paid 15000.00 (LUNAS)
        $trxLunas = $this->createTransaksiViaService($petugas, $pelanggan, $layananKg, '2.00', 'HEMAT5K', '15000.00');
        $this->assertSame(StatusPembayaran::LUNAS, $trxLunas->status_pembayaran);

        // Master tariff rises to 16000.00 after transaction creation
        $layananKg->update(['harga_satuan' => '16000.00']);

        $this->actingAs($pegawaiUser)
            ->post("/produksi/{$trxLunas->nomor_nota}/timbang-ulang", [
                'berat_aktual' => '3.25',
                'catatan' => 'Timbangan aktual lebih berat 1.25 kg',
            ])
            ->assertRedirect('/produksi')
            ->assertSessionHas('success');

        $trxLunas->refresh();
        // 3.25 * 10000.00 snapshot - 5000.00 voucher = 27500.00
        $this->assertSame('3.25', $trxLunas->berat_atau_jumlah);
        $this->assertSame('10000.00', $trxLunas->harga_satuan_snapshot);
        $this->assertSame('27500.00', $trxLunas->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxLunas->status_pembayaran);

        $audit = AuditLog::where('subject_id', $trxLunas->nomor_nota)
            ->where('action', 'TIMBANG_ULANG')
            ->firstOrFail();
        $this->assertTrue($audit->payload_after['weight_changed'] ?? false);
        $this->assertSame('27500.00', $audit->payload_after['total_harga'] ?? null);

        // Scenario 2 (DP -> LUNAS when weight decreases)
        // Uses current master 16000.00: 3.00 * 16000 = 48000.00, DP 20000.00
        $trxDp = $this->createTransaksiViaService($petugas, $pelanggan, $layananKg, '3.00', null, '20000.00');
        $this->assertSame(StatusPembayaran::DP, $trxDp->status_pembayaran);

        $this->actingAs($pegawaiUser)
            ->post("/produksi/{$trxDp->nomor_nota}/timbang-ulang", [
                'berat_aktual' => '1.25',
            ])
            ->assertRedirect('/produksi')
            ->assertSessionHas('success');

        $trxDp->refresh();
        // 1.25 * 16000 = 20000.00 <= 20000.00 paid -> LUNAS
        $this->assertSame('20000.00', $trxDp->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxDp->status_pembayaran);

        // Scenario 3: Reject 422 on JUMLAH (pcs) service
        $trxPcs = $this->createTransaksiViaService($petugas, $pelanggan, $layananPcs, '2');
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trxPcs->nomor_nota}/timbang-ulang", ['berat_aktual' => '3.00'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('berat_aktual');

        // Scenario 4: Reject 422 when already DICUCI or SELESAI/DIAMBIL/DIBATALKAN
        app(ProduksiService::class)->ubahStatusProduksi($trxLunas->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trxLunas->nomor_nota}/timbang-ulang", ['berat_aktual' => '3.50'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('berat_aktual');

        $trxSelesai = $this->createTransaksiViaService($petugas, $pelanggan, $layananKg, '2.00');
        $trxSelesai->update(['status_transaksi' => StatusTransaksi::SELESAI]);
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trxSelesai->nomor_nota}/timbang-ulang", ['berat_aktual' => '2.50'])
            ->assertStatus(422);

        $trxDiambil = $this->createTransaksiViaService($petugas, $pelanggan, $layananKg, '2.00');
        $trxDiambil->update(['status_transaksi' => StatusTransaksi::DIAMBIL]);
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trxDiambil->nomor_nota}/timbang-ulang", ['berat_aktual' => '2.50'])
            ->assertStatus(422);

        $trxBatal = $this->createTransaksiViaService($petugas, $pelanggan, $layananKg, '2.00');
        $trxBatal->update(['status_transaksi' => StatusTransaksi::DIBATALKAN]);
        $this->actingAs($pegawaiUser)
            ->postJson("/produksi/{$trxBatal->nomor_nota}/timbang-ulang", ['berat_aktual' => '2.50'])
            ->assertStatus(422);

        // Scenario 5: Invalid payload & 404
        $trxValid = $this->createTransaksiViaService($petugas, $pelanggan, $layananKg, '2.00');
        foreach (['0', '-1.50', '1.234', ''] as $invalidWeight) {
            $this->actingAs($pegawaiUser)
                ->postJson("/produksi/{$trxValid->nomor_nota}/timbang-ulang", ['berat_aktual' => $invalidWeight])
                ->assertStatus(422)
                ->assertJsonValidationErrors('berat_aktual');
        }

        $this->actingAs($pegawaiUser)
            ->postJson('/produksi/CW-99999999-9999/timbang-ulang', ['berat_aktual' => '2.50'])
            ->assertNotFound();
    }
}
