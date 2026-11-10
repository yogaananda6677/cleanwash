<?php

namespace Tests\Feature;

use App\Enums\JenisInsiden;
use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TingkatKecepatan;
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Services\JenisLayananService;
use App\Services\KompensasiService;
use App\Services\ProduksiService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InsidenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function createPetugasUser(bool $active = true, bool $withProfile = true, string $name = 'Sinta Kasir'): User
    {
        $factory = User::factory()->petugas();
        if (! $active) {
            $factory = $factory->inactive();
        }
        $user = $factory->create(['name' => $name]);

        if ($withProfile) {
            Petugas::create([
                'user_id' => $user->id,
                'nama_petugas' => $user->name,
            ]);
        }

        return $user;
    }

    private function createPegawaiUser(bool $active = true, bool $withProfile = true, string $name = 'Tono Produksi'): User
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

    private function createPengantarUser(string $name = 'Dedi Kurir'): User
    {
        $user = User::factory()->pengantar()->create(['name' => $name]);
        PetugasPengantaran::create([
            'user_id' => $user->id,
            'nama_petugas_antar' => $user->name,
        ]);

        return $user;
    }

    private function createPelanggan(string $nama = 'Rina Kusuma', string $phone = '081399990001'): Pelanggan
    {
        return Pelanggan::create([
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Magelang KM 4',
            'boleh_bayar_akhir' => false,
        ]);
    }

    private function createLayanan(string $nama = 'Cuci Setrika', string $harga = '10000.00'): JenisLayanan
    {
        return app(JenisLayananService::class)->create([
            'nama_layanan' => $nama,
            'tingkat_kecepatan' => TingkatKecepatan::REGULER->value,
            'metode_hitung' => MetodeHitung::BERAT->value,
            'satuan' => SatuanLayanan::KG->value,
            'harga_satuan' => $harga,
            'perlu_setrika' => true,
            'is_active' => true,
        ]);
    }

    /**
     * @param  list<array{jenis_pakaian: string, jumlah_potong: int, kondisi_pakaian: string}>  $items
     */
    private function createTransaksiViaService(
        Petugas $petugas,
        Pelanggan $pelanggan,
        JenisLayanan $layanan,
        string $qty = '5.00',
        string $dp = '0.00',
        array $items = [
            ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
        ]
    ): Transaksi {
        return app(TransaksiService::class)->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $qty,
            'nominal_dp' => $dp,
            'detail_pakaian' => $items,
        ]);
    }

    public function test_insiden_endpoints_enforce_rbac_and_laporan_kerusakan_policy(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser();
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();
        $inactivePetugas = $this->createPetugasUser(active: false, name: 'Kasir Nonaktif');
        $inactivePegawai = $this->createPegawaiUser(active: false, name: 'Pegawai Nonaktif');
        $pegawaiNoProfile = $this->createPegawaiUser(active: true, withProfile: false, name: 'Pegawai Tanpa Profil');
        $petugasNoProfile = $this->createPetugasUser(active: true, withProfile: false, name: 'Kasir Tanpa Profil');
        $pengantarUser = $this->createPengantarUser();

        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan();
        $trx = $this->createTransaksiViaService($petugas, $pelanggan, $layanan);
        $detail = $trx->detailPakaian->firstOrFail();

        $laporanPending = app(KompensasiService::class)->laporInsiden($pegawaiUser, [
            'nomor_nota' => $trx->nomor_nota,
            'id_detail' => $detail->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Laporan awal untuk pengujian RBAC.',
        ]);

        // Guests redirected to login
        $this->get('/insiden')->assertRedirect('/login');
        $this->post('/insiden', [])->assertRedirect('/login');
        $this->post("/transaksi/{$trx->nomor_nota}/insiden", [])->assertRedirect('/login');
        $this->post("/insiden/{$laporanPending->id_laporan}/konfirmasi", [])->assertRedirect('/login');

        // PENGANTAR and inactive actors are rejected 403 on all incident endpoints
        foreach ([$pengantarUser, $inactivePetugas, $inactivePegawai] as $forbiddenUser) {
            $this->actingAs($forbiddenUser)->get('/insiden')->assertForbidden();
            $this->actingAs($forbiddenUser)->post('/insiden', [
                'nomor_nota' => $trx->nomor_nota,
                'id_detail' => $detail->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Aktor terlarang mencoba melapor.',
            ])->assertForbidden();
            $this->actingAs($forbiddenUser)->post("/transaksi/{$trx->nomor_nota}/insiden", [
                'id_detail' => $detail->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Aktor terlarang mencoba melapor dari nota.',
            ])->assertForbidden();
            $this->actingAs($forbiddenUser)->post("/insiden/{$laporanPending->id_laporan}/konfirmasi", [])
                ->assertForbidden();
        }

        // PEGAWAI is forbidden 403 on konfirmasi
        $this->actingAs($pegawaiUser)
            ->post("/insiden/{$laporanPending->id_laporan}/konfirmasi", [])
            ->assertForbidden();

        // Missing profile users receive 403 on state mutations
        $this->actingAs($pegawaiNoProfile)
            ->post('/insiden', [
                'nomor_nota' => $trx->nomor_nota,
                'id_detail' => $detail->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Pegawai tanpa profil.',
            ])
            ->assertForbidden();

        $this->actingAs($petugasNoProfile)
            ->post("/transaksi/{$trx->nomor_nota}/insiden", [
                'id_detail' => $detail->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Petugas tanpa profil.',
            ])
            ->assertForbidden();

        $this->actingAs($petugasNoProfile)
            ->post("/insiden/{$laporanPending->id_laporan}/konfirmasi", [])
            ->assertForbidden();

        // Policy assertions
        $this->assertTrue(Gate::forUser($petugasUser)->allows('viewAny', LaporanKerusakanKehilangan::class));
        $this->assertTrue(Gate::forUser($pegawaiUser)->allows('viewAny', LaporanKerusakanKehilangan::class));
        $this->assertTrue(Gate::forUser($pengantarUser)->denies('viewAny', LaporanKerusakanKehilangan::class));
        $this->assertTrue(Gate::forUser($petugasUser)->allows('create', LaporanKerusakanKehilangan::class));
        $this->assertTrue(Gate::forUser($pegawaiUser)->allows('create', LaporanKerusakanKehilangan::class));
        $this->assertTrue(Gate::forUser($petugasUser)->allows('konfirmasi', $laporanPending));
        $this->assertTrue(Gate::forUser($pegawaiUser)->denies('konfirmasi', $laporanPending));
        $this->assertTrue(Gate::forUser($pengantarUser)->denies('konfirmasi', $laporanPending));
    }

    public function test_insiden_index_paginates_filters_searches_with_sql_like_and_avoids_n_plus_1_queries(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser();
        $pelangganA = $this->createPelanggan('Andi_100% Promo', '081399990011');
        $pelangganB = $this->createPelanggan('Budi Santoso', '081399990012');
        $layanan = $this->createLayanan('Cuci Setrika', '10000.00');

        $kompensasiService = app(KompensasiService::class);

        $trxAktif = $this->createTransaksiViaService($petugas, $pelangganA, $layanan, '4.00', '10000.00', [
            ['jenis_pakaian' => 'Jaket Kulit', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
        ]);
        $trxSelesai = $this->createTransaksiViaService($petugas, $pelangganB, $layanan, '3.00');
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
            app(ProduksiService::class)->ubahStatusProduksi($trxSelesai->nomor_nota, $pegawai, ['tahap_status' => $stage]);
        }

        // Terminal transactions should be excluded from eligibleTransaksiOptions
        $trxDiambil = $this->createTransaksiViaService($petugas, $pelangganB, $layanan, '2.00');
        $trxDiambil->update(['status_transaksi' => StatusTransaksi::DIAMBIL]);
        $trxBatal = $this->createTransaksiViaService($petugas, $pelangganB, $layanan, '2.00');
        $trxBatal->update(['status_transaksi' => StatusTransaksi::DIBATALKAN]);

        $jaket = $trxAktif->detailPakaian->firstWhere('jenis_pakaian', 'Jaket Kulit');
        $kaos = $trxAktif->detailPakaian->firstWhere('jenis_pakaian', 'Kaos');
        $selesaiItem = $trxSelesai->detailPakaian->firstOrFail();
        $this->assertInstanceOf(DetailPakaian::class, $jaket);
        $this->assertInstanceOf(DetailPakaian::class, $kaos);

        Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 0, 0, 'Asia/Jakarta'));
        try {
            // 11 pending reports by PEGAWAI + 1 confirmed report by PETUGAS = 12 total (> 10 per page)
            $kompensasiService->laporInsiden($pegawaiUser, [
                'nomor_nota' => $trxAktif->nomor_nota,
                'id_detail' => $jaket->id_detail,
                'jenis_insiden' => 'HILANG',
                'keterangan' => 'Jaket kulit hilang 100% di rak pengering.',
            ]);

            for ($i = 1; $i <= 10; $i++) {
                Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, $i, 0, 'Asia/Jakarta'));
                $kompensasiService->laporInsiden($pegawaiUser, [
                    'nomor_nota' => $trxSelesai->nomor_nota,
                    'id_detail' => $selesaiItem->id_detail,
                    'jenis_insiden' => 'RUSAK',
                    'keterangan' => "Laporan rutin ke-{$i} menunggu konfirmasi.",
                ]);
            }

            Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 30, 0, 'Asia/Jakarta'));
            $kompensasiService->laporInsiden($petugasUser, [
                'nomor_nota' => $trxAktif->nomor_nota,
                'id_detail' => $kaos->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Kaos sobek langsung dikonfirmasi.',
                'nilai_kompensasi' => '15000.00',
            ]);
        } finally {
            Carbon::setTestNow();
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($pegawaiUser)->get('/insiden');

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(18, count($queries), 'Possible N+1 query on GET /insiden: '.count($queries));

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                // Temporary shouldExist: false until P2-05 creates Insiden/Index.tsx
                ->component('Insiden/Index', shouldExist: false)
                ->where('filters.search', '')
                ->where('filters.jenis_insiden', '')
                ->where('filters.status_konfirmasi', '')
                ->where('pendingCount', 11)
                ->has('laporan.data', 10)
                ->where('laporan.total', 12)
                ->has('eligibleTransaksiOptions', 2)
                ->where('eligibleTransaksiOptions.0.status_transaksi', fn (string $status): bool => in_array($status, ['AKTIF', 'SELESAI'], true))
                ->where('eligibleTransaksiOptions.1.status_transaksi', fn (string $status): bool => in_array($status, ['AKTIF', 'SELESAI'], true))
                ->where('laporan.data.0.status_konfirmasi', 'TERKONFIRMASI')
                ->where('laporan.data.0.transaksi.nomor_nota', $trxAktif->nomor_nota)
                ->where('laporan.data.0.transaksi.pelanggan.nama', 'Andi_100% Promo')
                ->where('laporan.data.0.transaksi.layanan.nama_layanan', 'Cuci Setrika')
            );

        // Search by SQL LIKE literal characters (% and _) on pelanggan.nama + detailPakaian.jenis_pakaian
        $this->actingAs($petugasUser)
            ->get('/insiden?search='.urlencode('100%').'&jenis_insiden=HILANG&status_konfirmasi=MENUNGGU_KONFIRMASI')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                // Temporary shouldExist: false until P2-05 creates Insiden/Index.tsx
                ->component('Insiden/Index', shouldExist: false)
                ->where('pendingCount', 11)
                ->has('laporan.data', 1)
                ->where('laporan.data.0.detail_pakaian.jenis_pakaian', 'Jaket Kulit')
                ->where('laporan.data.0.jenis_insiden', 'HILANG')
                ->where('laporan.data.0.status_konfirmasi', 'MENUNGGU_KONFIRMASI')
            );

        // Search by detailPakaian.jenis_pakaian
        $this->actingAs($petugasUser)
            ->get('/insiden?search=Kaos&status_konfirmasi=TERKONFIRMASI')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                // Temporary shouldExist: false until P2-05 creates Insiden/Index.tsx
                ->component('Insiden/Index', shouldExist: false)
                ->has('laporan.data', 1)
                ->where('laporan.data.0.detail_pakaian.jenis_pakaian', 'Kaos')
                ->where('laporan.data.0.nilai_kompensasi', '15000.00')
            );
    }

    public function test_ac_p2_09_and_ac_p2_10_full_http_incident_lifecycle_confirmation_multi_incident_and_validations(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser();
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan('Cuci Setrika', '10000.00');

        // 5.00 * 10000 = 50000.00; total_potong = 5 (Kemeja 2, Celana 3); DP = 20000.00 (sisa = 30000.00)
        $trx = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '5.00', '20000.00');
        $kemeja = $trx->detailPakaian->firstWhere('jenis_pakaian', 'Kemeja');
        $celana = $trx->detailPakaian->firstWhere('jenis_pakaian', 'Celana');
        $this->assertInstanceOf(DetailPakaian::class, $kemeja);
        $this->assertInstanceOf(DetailPakaian::class, $celana);

        // 1. PEGAWAI submits via POST /transaksi/{nota}/insiden omitting nomor_nota (merged via prepareForValidation)
        $this->actingAs($pegawaiUser)
            ->post("/transaksi/{$trx->nomor_nota}/insiden", [
                'id_detail' => $kemeja->id_detail,
                'jenis_insiden' => 'rusak',
                'keterangan' => 'Kemeja terkena noda luntur saat dicuci.',
            ])
            ->assertRedirect('/produksi')
            ->assertSessionHas('success');

        $laporan1 = LaporanKerusakanKehilangan::where('nomor_nota', $trx->nomor_nota)->firstOrFail();
        $this->assertNull($laporan1->id_petugas);
        $this->assertSame($pegawai->id_pegawai, $laporan1->id_pegawai_pelapor);
        $this->assertSame('0.00', (string) $laporan1->nilai_kompensasi);
        $this->assertSame('0.00', (string) $laporan1->kelebihan_ganti_rugi);

        // 2. PETUGAS confirms laporan1 with explicit nilai_kompensasi = 40000.00
        // sisa_sebelum = 50000 - 20000 = 30000 -> kelebihan_ganti_rugi = 10000.00, total_harga = 10000.00, status = LUNAS
        $this->actingAs($petugasUser)
            ->post("/insiden/{$laporan1->id_laporan}/konfirmasi", [
                'nilai_kompensasi' => '40000.00',
                'keterangan_konfirmasi' => 'Pelanggan setuju kompensasi potong tagihan dan pengembalian selisih.',
            ])
            ->assertRedirect('/insiden')
            ->assertSessionHas('success');

        $laporan1->refresh();
        $trx->refresh();
        $this->assertSame($petugas->id_petugas, $laporan1->id_petugas);
        $this->assertSame('40000.00', (string) $laporan1->nilai_kompensasi);
        $this->assertSame('10000.00', (string) $laporan1->kelebihan_ganti_rugi);
        $this->assertSame('40000.00', (string) $trx->total_kompensasi);
        $this->assertSame('10000.00', (string) $trx->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trx->status_pembayaran);

        // AuditLog includes keterangan_konfirmasi
        $confirmAudit = AuditLog::where('subject_id', $trx->nomor_nota)
            ->where('action', 'KOMPENSASI_CONFIRMED')
            ->latest('id')
            ->firstOrFail();
        $this->assertSame(
            'Pelanggan setuju kompensasi potong tagihan dan pengembalian selisih.',
            $confirmAudit->payload_after['keterangan_konfirmasi'] ?? null
        );

        // Reject double confirmation with 422 (JSON and Inertia redirect)
        $this->actingAs($petugasUser)
            ->postJson("/insiden/{$laporan1->id_laporan}/konfirmasi", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('laporan');

        $this->actingAs($petugasUser)
            ->from('/insiden')
            ->post("/insiden/{$laporan1->id_laporan}/konfirmasi", [])
            ->assertRedirect('/insiden')
            ->assertSessionHas('error')
            ->assertSessionHasErrors('laporan');

        // 3. PETUGAS reports second incident directly via POST /insiden without custom nilai -> uses hitungKompensasi()
        // Celana (3/5 of 50000 = 30000.00), HILANG = 10 * 30000 = 300000.00
        // sisa_sebelum = max(0, 10000 - 20000) = 0.00 -> kelebihan_ganti_rugi = 300000.00
        $this->actingAs($petugasUser)
            ->post('/insiden', [
                'nomor_nota' => $trx->nomor_nota,
                'id_detail' => $celana->id_detail,
                'jenis_insiden' => 'HILANG',
                'keterangan' => 'Celana tidak ditemukan pada keranjang selesai.',
                'id_pegawai_pelapor' => $pegawai->id_pegawai,
            ])
            ->assertRedirect('/insiden')
            ->assertSessionHas('success');

        $trx->refresh();
        $this->assertSame('340000.00', (string) $trx->total_kompensasi);
        $this->assertSame('0.00', (string) $trx->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trx->status_pembayaran);

        // Verify Transaksi/Show reflects aggregated total_kelebihan_ganti_rugi = 310000.00 without double counting
        $this->actingAs($petugasUser)
            ->get("/transaksi/{$trx->nomor_nota}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Show')
                ->where('transaksi.total_kompensasi', '340000.00')
                ->where('transaksi.total_harga', '0.00')
                ->where('transaksi.sisa_tagihan', '0.00')
                ->where('transaksi.kelebihan_bayar_tunai', '0.00')
                ->where('transaksi.total_kelebihan_ganti_rugi', '310000.00')
                ->where('transaksi.total_pengembalian_pelanggan', '310000.00')
                ->where('transaksi.insiden_pending_count', 0)
                ->has('transaksi.laporan_insiden', 2)
                ->has('auditLogs', 5)
            );

        // 4. PETUGAS submits via POST /transaksi/{nota}/insiden -> redirects back to transaksi.show
        $trxSelesai = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '2.00', '0.00', [
            ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
        ]);
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
            app(ProduksiService::class)->ubahStatusProduksi($trxSelesai->nomor_nota, $pegawai, ['tahap_status' => $stage]);
        }
        $jaketSelesai = $trxSelesai->detailPakaian->firstOrFail();

        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxSelesai->nomor_nota}/insiden", [
                'id_detail' => $jaketSelesai->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Resleting jaket macet setelah proses setrika.',
                'nilai_kompensasi' => '20000.00',
            ])
            ->assertRedirect("/transaksi/{$trxSelesai->nomor_nota}")
            ->assertSessionHas('success');

        $trxSelesai->refresh();
        // 20000 - 20000 = 0.00 -> LUNAS
        $this->assertSame('0.00', (string) $trxSelesai->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxSelesai->status_pembayaran);

        // 5. Validation 422 & 404 guards
        // Cross-nota id_detail -> 422
        $this->actingAs($pegawaiUser)
            ->postJson("/transaksi/{$trxSelesai->nomor_nota}/insiden", [
                'id_detail' => $kemeja->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Mencoba kirim detail pakaian nota lain.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('id_detail');

        // Conflicting nomor_nota in body vs route param -> 422
        $this->actingAs($pegawaiUser)
            ->postJson("/transaksi/{$trxSelesai->nomor_nota}/insiden", [
                'nomor_nota' => $trx->nomor_nota,
                'id_detail' => $jaketSelesai->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Nomor nota payload bertentangan dengan parameter URL.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nomor_nota');

        // Reject DIAMBIL and DIBATALKAN -> 422
        $trxDiambil = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '2.00');
        $detailDiambil = $trxDiambil->detailPakaian->firstOrFail();
        $trxDiambil->update(['status_transaksi' => StatusTransaksi::DIAMBIL]);
        $this->actingAs($petugasUser)
            ->postJson('/insiden', [
                'nomor_nota' => $trxDiambil->nomor_nota,
                'id_detail' => $detailDiambil->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'Nota sudah diambil harus ditolak.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nomor_nota');

        $trxBatal = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '2.00');
        $detailBatal = $trxBatal->detailPakaian->firstOrFail();
        $trxBatal->update(['status_transaksi' => StatusTransaksi::DIBATALKAN]);
        $this->actingAs($pegawaiUser)
            ->postJson('/insiden', [
                'nomor_nota' => $trxBatal->nomor_nota,
                'id_detail' => $detailBatal->id_detail,
                'jenis_insiden' => 'HILANG',
                'keterangan' => 'Nota sudah dibatalkan harus ditolak.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nomor_nota');

        // Reject invalid nilai_kompensasi (0.00 / >2 decimals) and short keterangan -> 422
        $this->actingAs($petugasUser)
            ->postJson('/insiden', [
                'nomor_nota' => $trx->nomor_nota,
                'id_detail' => $kemeja->id_detail,
                'jenis_insiden' => 'RUSAK',
                'keterangan' => 'abc',
                'nilai_kompensasi' => '0.00',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['keterangan', 'nilai_kompensasi']);

        // Unknown laporan id on konfirmasi -> 404
        $this->actingAs($petugasUser)
            ->postJson('/insiden/999999/konfirmasi', [])
            ->assertNotFound();
    }
}
