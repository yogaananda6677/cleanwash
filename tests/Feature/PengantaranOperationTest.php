<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\StatusPengantaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Models\AuditLog;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Pengantaran;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Services\JenisLayananService;
use App\Services\PengantaranService;
use App\Services\ProduksiService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PengantaranOperationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function createPetugasUser(bool $active = true, string $name = 'Kasir Rina'): User
    {
        $factory = User::factory()->petugas();
        if (! $active) {
            $factory = $factory->inactive();
        }
        $user = $factory->create(['name' => $name]);
        Petugas::create([
            'user_id' => $user->id,
            'nama_petugas' => $user->name,
        ]);

        return $user;
    }

    private function createPegawaiUser(string $name = 'Pegawai Budi'): User
    {
        $user = User::factory()->pegawai()->create(['name' => $name]);
        Pegawai::create([
            'user_id' => $user->id,
            'nama_pegawai' => $user->name,
        ]);

        return $user;
    }

    private function createPengantarUser(bool $active = true, string $name = 'Kurir Andi'): User
    {
        $factory = User::factory()->pengantar();
        if (! $active) {
            $factory = $factory->inactive();
        }
        $user = $factory->create(['name' => $name]);
        PetugasPengantaran::create([
            'user_id' => $user->id,
            'nama_petugas_antar' => $user->name,
        ]);

        return $user;
    }

    private function createPelanggan(string $nama, string $phone, bool $bolehBayarAkhir = false): Pelanggan
    {
        return Pelanggan::create([
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Gejayan No. 10',
            'boleh_bayar_akhir' => $bolehBayarAkhir,
        ]);
    }

    private function createLayanan(): JenisLayanan
    {
        return app(JenisLayananService::class)->create([
            'nama_layanan' => 'Cuci Setrika',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER->value,
            'metode_hitung' => MetodeHitung::BERAT->value,
            'satuan' => SatuanLayanan::KG->value,
            'harga_satuan' => '10000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);
    }

    private function createSelesaiTransaksi(
        Petugas $petugas,
        Pegawai $pegawai,
        Pelanggan $pelanggan,
        JenisLayanan $layanan,
        string $qty = '2.00',
        string $dp = '20000.00'
    ): Transaksi {
        $trx = app(TransaksiService::class)->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $qty,
            'nominal_dp' => $dp,
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        foreach ([
            TahapProduksi::DICUCI->value,
            TahapProduksi::DIKERINGKAN->value,
            TahapProduksi::DISETRIKA->value,
            TahapProduksi::SELESAI->value,
        ] as $tahap) {
            $trx = app(ProduksiService::class)->ubahStatusProduksi($trx->nomor_nota, $pegawai, [
                'tahap_status' => $tahap,
            ]);
        }

        return $trx;
    }

    public function test_ac_p3_01_pengantaran_rbac_and_courier_ownership_isolation(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 9, 0, 0, 'Asia/Jakarta'));

        try {
            $petugasUser = $this->createPetugasUser();
            $pegawaiUser = $this->createPegawaiUser();
            $kurirAUser = $this->createPengantarUser(true, 'Kurir Alpha');
            $kurirBUser = $this->createPengantarUser(true, 'Kurir Beta');
            $inactivePetugas = $this->createPetugasUser(false, 'Kasir Nonaktif');
            $inactiveKurir = $this->createPengantarUser(false, 'Kurir Nonaktif');

            $petugas = $petugasUser->petugas;
            $pegawai = $pegawaiUser->pegawai;
            $kurirA = $kurirAUser->petugasPengantaran;
            $kurirB = $kurirBUser->petugasPengantaran;

            $layanan = $this->createLayanan();
            $pelanggan1 = $this->createPelanggan('Pelanggan Satu', '081300000001');
            $pelanggan2 = $this->createPelanggan('Pelanggan Dua', '081300000002');

            $trx1 = $this->createSelesaiTransaksi($petugas, $pegawai, $pelanggan1, $layanan);
            $trx2 = $this->createSelesaiTransaksi($petugas, $pegawai, $pelanggan2, $layanan);

            $pengantaranService = app(PengantaranService::class);
            $sesiKurirA = $pengantaranService->buatJadwal($petugas, [
                'id_petugas_antar' => $kurirA->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trx1->nomor_nota],
            ], $petugasUser);
            $itemKurirA = $sesiKurirA->itemPengantaran->firstOrFail();

            $sesiKurirB = $pengantaranService->buatJadwal($petugas, [
                'id_petugas_antar' => $kurirB->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trx2->nomor_nota],
            ], $petugasUser);

            // Guest redirected to login
            $this->get('/pengantaran')->assertRedirect('/login');
            $this->post('/pengantaran', [])->assertRedirect('/login');

            // PEGAWAI forbidden across all endpoints
            $this->actingAs($pegawaiUser)->get('/pengantaran')->assertForbidden();
            $this->actingAs($pegawaiUser)->get("/pengantaran/{$sesiKurirA->id_pengantaran}")->assertForbidden();
            $this->actingAs($pegawaiUser)->post('/pengantaran', [])->assertForbidden();
            $this->actingAs($pegawaiUser)->post("/pengantaran/{$sesiKurirA->id_pengantaran}/mulai")->assertForbidden();
            $this->actingAs($pegawaiUser)->post("/pengantaran/item/{$itemKurirA->id_item_antar}/status", [])->assertForbidden();
            $this->actingAs($pegawaiUser)->post("/pengantaran/item/{$itemKurirA->id_item_antar}/jadwalkan-ulang", [])->assertForbidden();

            // Inactive users forbidden
            $this->actingAs($inactivePetugas)->get('/pengantaran')->assertForbidden();
            $this->actingAs($inactiveKurir)->get('/pengantaran')->assertForbidden();

            // PENGANTAR forbidden creating schedule & PETUGAS forbidden starting or updating item status
            $this->actingAs($kurirAUser)->post('/pengantaran', [
                'id_petugas_antar' => $kurirA->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trx1->nomor_nota],
            ])->assertForbidden();
            $this->actingAs($petugasUser)->post("/pengantaran/{$sesiKurirA->id_pengantaran}/mulai")->assertForbidden();
            $this->actingAs($petugasUser)->post("/pengantaran/item/{$itemKurirA->id_item_antar}/status", [
                'status_terima_pelanggan' => 'DIAMBIL',
            ])->assertForbidden();

            // Kurir B cannot view, start, update item, or reschedule Kurir A's session/item (even with invalid payload!)
            $this->actingAs($kurirBUser)->get("/pengantaran/{$sesiKurirA->id_pengantaran}")->assertForbidden();
            $this->actingAs($kurirBUser)->post("/pengantaran/{$sesiKurirA->id_pengantaran}/mulai")->assertForbidden();
            $this->actingAs($kurirBUser)->postJson("/pengantaran/item/{$itemKurirA->id_item_antar}/status", [
                'status_terima_pelanggan' => 'DIAMBIL',
            ])->assertForbidden();
            $this->actingAs($kurirBUser)->postJson("/pengantaran/item/{$itemKurirA->id_item_antar}/status", [])->assertForbidden();
            $this->actingAs($kurirBUser)->postJson("/pengantaran/item/{$itemKurirA->id_item_antar}/jadwalkan-ulang", [
                'tanggal_pengantaran' => '2026-11-11',
            ])->assertForbidden();
            $this->actingAs($kurirBUser)->postJson("/pengantaran/item/{$itemKurirA->id_item_antar}/jadwalkan-ulang", [])->assertForbidden();

            // Kurir A GET /pengantaran only returns his own session & statusCounts = 1 (not Kurir B's)
            $this->actingAs($kurirAUser)
                ->get('/pengantaran')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('pengantaran.data', 1)
                    ->where('pengantaran.data.0.id_pengantaran', $sesiKurirA->id_pengantaran)
                    ->where('statusCounts.DIJADWALKAN', 1)
                    ->where('statusCounts.BERJALAN', 0)
                    ->where('statusCounts.SELESAI', 0)
                    ->has('eligibleTransaksiOptions', 0)
                );

            // PETUGAS GET /pengantaran sees both sessions
            $this->actingAs($petugasUser)
                ->get('/pengantaran')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('pengantaran.data', 2)
                    ->where('statusCounts.DIJADWALKAN', 2)
                );

            // Kurir B can view his own session
            $this->actingAs($kurirBUser)
                ->get("/pengantaran/{$sesiKurirB->id_pengantaran}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Show')
                    ->where('pengantaran.id_pengantaran', $sesiKurirB->id_pengantaran)
                );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_ac_p3_02_store_multi_customer_delivery_and_rejects_invalid_requests(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 0, 0, 'Asia/Jakarta'));

        try {
            $petugasUser = $this->createPetugasUser();
            $pegawaiUser = $this->createPegawaiUser();
            $kurirUser = $this->createPengantarUser(true, 'Kurir Jono');
            $kurirInactive = $this->createPengantarUser(false, 'Kurir Off');

            $petugas = $petugasUser->petugas;
            $pegawai = $pegawaiUser->pegawai;
            $kurir = $kurirUser->petugasPengantaran;
            $layanan = $this->createLayanan();

            $pelangganA = $this->createPelanggan('Ani_100%', '081311110001');
            $pelangganB = $this->createPelanggan('Budi Mulia', '081311110002');

            $trxA = $this->createSelesaiTransaksi($petugas, $pegawai, $pelangganA, $layanan);
            $trxB = $this->createSelesaiTransaksi($petugas, $pegawai, $pelangganB, $layanan);
            $trxAktif = app(TransaksiService::class)->buatTransaksi($petugas, [
                'id_pelanggan' => $pelangganA->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '1.00',
                'detail_pakaian' => [['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
            ]);

            // 422 on AKTIF transaction
            $this->actingAs($petugasUser)
                ->from('/pengantaran')
                ->post('/pengantaran', [
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxAktif->nomor_nota],
                ])
                ->assertRedirect('/pengantaran')
                ->assertSessionHas('error')
                ->assertSessionHasErrors('nomor_nota_list');

            // 422 on inactive courier, duplicate notas, past date
            $this->actingAs($petugasUser)
                ->postJson('/pengantaran', [
                    'id_petugas_antar' => $kurirInactive->petugasPengantaran->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxA->nomor_nota],
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('id_petugas_antar');

            $this->actingAs($petugasUser)
                ->postJson('/pengantaran', [
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-09',
                    'nomor_nota_list' => [$trxA->nomor_nota, $trxA->nomor_nota],
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['tanggal_pengantaran', 'nomor_nota_list.1']);

            // Happy path: create multi-customer Pengantaran
            $response = $this->actingAs($petugasUser)
                ->post('/pengantaran', [
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxA->nomor_nota, $trxB->nomor_nota],
                ]);

            $created = Pengantaran::firstOrFail();
            $response->assertRedirect("/pengantaran/{$created->id_pengantaran}")
                ->assertSessionHas('success');

            $this->assertSame(StatusPengantaran::DIJADWALKAN, $created->status_pengantaran);
            $this->assertCount(2, $created->itemPengantaran);

            // Re-scheduling active nota -> 422
            $this->actingAs($petugasUser)
                ->postJson('/pengantaran', [
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxA->nomor_nota],
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('nomor_nota_list');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_ac_p3_03_to_ac_p3_05_full_delivery_kk06_kk07_and_n_plus_one_budget(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 12, 0, 0, 'Asia/Jakarta'));

        try {
            $petugasUser = $this->createPetugasUser();
            $pegawaiUser = $this->createPegawaiUser();
            $kurirAUser = $this->createPengantarUser(true, 'Kurir Satu');
            $kurirBUser = $this->createPengantarUser(true, 'Kurir Dua');

            $petugas = $petugasUser->petugas;
            $pegawai = $pegawaiUser->pegawai;
            $kurirA = $kurirAUser->petugasPengantaran;
            $kurirB = $kurirBUser->petugasPengantaran;
            $layanan = $this->createLayanan();

            $pelangganLunas = $this->createPelanggan('Andi Lunas', '081322220001', false);
            $pelangganPayLater = $this->createPelanggan('Hendra PayLater', '081322220002', true);
            $pelangganRegulerUnpaid = $this->createPelanggan('Siti Unpaid', '081322220003', false);

            $trxLunas = $this->createSelesaiTransaksi($petugas, $pegawai, $pelangganLunas, $layanan, '2.00', '20000.00');
            $trxPayLater = $this->createSelesaiTransaksi($petugas, $pegawai, $pelangganPayLater, $layanan, '3.00', '10000.00');
            $trxRegulerUnpaid = $this->createSelesaiTransaksi($petugas, $pegawai, $pelangganRegulerUnpaid, $layanan, '2.50', '0.00');

            // Create delivery session with 3 customers
            $this->actingAs($petugasUser)
                ->post('/pengantaran', [
                    'id_petugas_antar' => $kurirA->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [
                        $trxLunas->nomor_nota,
                        $trxPayLater->nomor_nota,
                        $trxRegulerUnpaid->nomor_nota,
                    ],
                ])
                ->assertRedirect();

            $sesi = Pengantaran::with('itemPengantaran')->firstOrFail();
            $itemLunas = $sesi->itemPengantaran->firstWhere('nomor_nota', $trxLunas->nomor_nota);
            $itemPayLater = $sesi->itemPengantaran->firstWhere('nomor_nota', $trxPayLater->nomor_nota);
            $itemReguler = $sesi->itemPengantaran->firstWhere('nomor_nota', $trxRegulerUnpaid->nomor_nota);

            // 1. Start session
            $this->actingAs($kurirAUser)
                ->post("/pengantaran/{$sesi->id_pengantaran}/mulai")
                ->assertRedirect("/pengantaran/{$sesi->id_pengantaran}")
                ->assertSessionHas('success');

            $this->assertSame(StatusPengantaran::BERJALAN, $sesi->refresh()->status_pengantaran);

            // 2. Reject jump & empty GAGAL reason via FormRequest/service (422)
            $this->actingAs($kurirAUser)
                ->postJson("/pengantaran/item/{$itemLunas->id_item_antar}/status", [
                    'status_terima_pelanggan' => 'DALAM_PERJALANAN',
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('status_terima_pelanggan');

            // 3. Deliver itemLunas: MENUNGGU -> DIAMBIL -> DALAM_PERJALANAN -> DITERIMA
            foreach (['DIAMBIL', 'DALAM_PERJALANAN', 'DITERIMA'] as $next) {
                $this->actingAs($kurirAUser)
                    ->post("/pengantaran/item/{$itemLunas->id_item_antar}/status", [
                        'status_terima_pelanggan' => $next,
                    ])
                    ->assertRedirect("/pengantaran/{$sesi->id_pengantaran}")
                    ->assertSessionHas('success');
            }
            $trxLunas->refresh();
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxLunas->status_transaksi);
            $this->assertSame(StatusPembayaran::LUNAS, $trxLunas->status_pembayaran);

            // 4. Deliver itemPayLater (KK-06 allowed with piutang BELUM_LUNAS)
            foreach (['DIAMBIL', 'DALAM_PERJALANAN', 'DITERIMA'] as $next) {
                $this->actingAs($kurirAUser)
                    ->post("/pengantaran/item/{$itemPayLater->id_item_antar}/status", [
                        'status_terima_pelanggan' => $next,
                    ])
                    ->assertRedirect("/pengantaran/{$sesi->id_pengantaran}")
                    ->assertSessionHas('success');
            }
            $trxPayLater->refresh();
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxPayLater->status_transaksi);
            $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxPayLater->status_pembayaran);

            // 5. itemReguler unpaid (!boleh_bayar_akhir) -> DITERIMA blocked 422 (KK-06), then mark GAGAL
            $this->actingAs($kurirAUser)
                ->post("/pengantaran/item/{$itemReguler->id_item_antar}/status", ['status_terima_pelanggan' => 'DIAMBIL'])
                ->assertRedirect();
            $this->actingAs($kurirAUser)
                ->post("/pengantaran/item/{$itemReguler->id_item_antar}/status", ['status_terima_pelanggan' => 'DALAM_PERJALANAN'])
                ->assertRedirect();

            $this->actingAs($kurirAUser)
                ->from("/pengantaran/{$sesi->id_pengantaran}")
                ->post("/pengantaran/item/{$itemReguler->id_item_antar}/status", [
                    'status_terima_pelanggan' => 'DITERIMA',
                ])
                ->assertRedirect("/pengantaran/{$sesi->id_pengantaran}")
                ->assertSessionHas('error')
                ->assertSessionHasErrors('status_terima_pelanggan');

            $this->actingAs($kurirAUser)
                ->postJson("/pengantaran/item/{$itemReguler->id_item_antar}/status", [
                    'status_terima_pelanggan' => 'GAGAL',
                    'alasan_gagal' => 'no',
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('alasan_gagal');

            $this->actingAs($kurirAUser)
                ->post("/pengantaran/item/{$itemReguler->id_item_antar}/status", [
                    'status_terima_pelanggan' => 'GAGAL',
                    'alasan_gagal' => 'Pelanggan belum melunasi sisa tagihan & rumah kosong.',
                ])
                ->assertRedirect("/pengantaran/{$sesi->id_pengantaran}")
                ->assertSessionHas('success');

            $this->assertSame(StatusPengantaran::SELESAI, $sesi->refresh()->status_pengantaran);

            // 6. KK-07 Reschedule: Kurir A assigning Kurir B -> 422; Petugas assigning Kurir B -> 302 to new Pengantaran
            $this->actingAs($kurirAUser)
                ->from("/pengantaran/{$sesi->id_pengantaran}")
                ->post("/pengantaran/item/{$itemReguler->id_item_antar}/jadwalkan-ulang", [
                    'tanggal_pengantaran' => '2026-11-11',
                    'id_petugas_antar' => $kurirB->id_petugas_antar,
                ])
                ->assertRedirect("/pengantaran/{$sesi->id_pengantaran}")
                ->assertSessionHas('error')
                ->assertSessionHasErrors('id_petugas_antar');

            $rescheduleResponse = $this->actingAs($petugasUser)
                ->post("/pengantaran/item/{$itemReguler->id_item_antar}/jadwalkan-ulang", [
                    'tanggal_pengantaran' => '2026-11-11',
                    'id_petugas_antar' => $kurirB->id_petugas_antar,
                ]);

            $sesiBaru = Pengantaran::where('id_pengantaran', '>', $sesi->id_pengantaran)->firstOrFail();
            $rescheduleResponse->assertRedirect("/pengantaran/{$sesiBaru->id_pengantaran}")
                ->assertSessionHas('success');

            // Double reschedule rejected 422
            $this->actingAs($petugasUser)
                ->postJson("/pengantaran/item/{$itemReguler->id_item_antar}/jadwalkan-ulang", [
                    'tanggal_pengantaran' => '2026-11-12',
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('item');

            // KK-07 isolation verified
            $this->assertSame(StatusItemPengantaran::DITERIMA, $itemLunas->refresh()->status_terima_pelanggan);
            $this->assertSame(StatusItemPengantaran::DITERIMA, $itemPayLater->refresh()->status_terima_pelanggan);
            $this->assertSame(StatusItemPengantaran::GAGAL, $itemReguler->refresh()->status_terima_pelanggan);
            $this->assertNotNull(AuditLog::where('action', 'PENGANTARAN_RESCHEDULED')->where('subject_id', $trxRegulerUnpaid->nomor_nota)->first());

            // 7. Create 9 more deliveries so pagination (perPage 10) is exercised, and assert N+1 budget <= 18 queries
            for ($i = 1; $i <= 9; $i++) {
                $pel = $this->createPelanggan("Pelanggan Extra {$i}", sprintf('08135555%04d', $i));
                $trxExtra = $this->createSelesaiTransaksi($petugas, $pegawai, $pel, $layanan, '2.00', '20000.00');
                app(PengantaranService::class)->buatJadwal($petugas, [
                    'id_petugas_antar' => ($i % 2 === 0 ? $kurirA : $kurirB)->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxExtra->nomor_nota],
                ]);
            }

            // Eligible Selesai transaction for dropdown check
            $trxReady = $this->createSelesaiTransaksi($petugas, $pegawai, $pelangganLunas, $layanan, '1.00', '10000.00');

            // Check GET /pengantaran N+1 budget for PETUGAS
            DB::flushQueryLog();
            DB::enableQueryLog();
            $indexResponse = $this->actingAs($petugasUser)->get('/pengantaran');
            $indexQueries = DB::getQueryLog();
            DB::disableQueryLog();

            $this->assertLessThanOrEqual(18, count($indexQueries), 'Possible N+1 query on GET /pengantaran: '.count($indexQueries));

            $indexResponse->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('pengantaran.data', 10)
                    ->where('pengantaran.total', 11)
                    ->has('kurirOptions', 2)
                    ->has('eligibleTransaksiOptions', 1)
                    ->where('eligibleTransaksiOptions.0.nomor_nota', $trxReady->nomor_nota)
                    ->where('statusCounts.DIJADWALKAN', 10)
                    ->where('statusCounts.BERJALAN', 0)
                    ->where('statusCounts.SELESAI', 1)
                );

            // Check GET /pengantaran filter by status, search, date, courier
            $this->actingAs($petugasUser)
                ->get('/pengantaran?status_pengantaran=SELESAI&search='.$trxLunas->nomor_nota)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('pengantaran.data', 1)
                    ->where('pengantaran.data.0.id_pengantaran', $sesi->id_pengantaran)
                    ->where('pengantaran.data.0.item_selesai_count', 3)
                    ->where('pengantaran.data.0.item_gagal_count', 1)
                    ->where('pengantaran.data.0.total_item', 3)
                );

            // Check GET /pengantaran/{id} N+1 budget & Transaksi/Show Phase 3 props
            DB::flushQueryLog();
            DB::enableQueryLog();
            $showResponse = $this->actingAs($petugasUser)->get("/pengantaran/{$sesi->id_pengantaran}");
            $showQueries = DB::getQueryLog();
            DB::disableQueryLog();

            $this->assertLessThanOrEqual(18, count($showQueries), 'Possible N+1 query on GET /pengantaran/{id}: '.count($showQueries));

            $showResponse->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Show')
                    ->where('pengantaran.id_pengantaran', $sesi->id_pengantaran)
                    ->has('pengantaran.items', 3)
                    ->where('pengantaran.items.2.bisa_jadwalkan_ulang', false)
                    ->has('kurirOptions', 2)
                );

            // Transaksi/Show includes Phase 3 delivery history & active delivery flags
            $this->actingAs($petugasUser)
                ->get("/transaksi/{$trxRegulerUnpaid->nomor_nota}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Transaksi/Show')
                    ->where('transaksi.bisa_pelunasan', true)
                    ->where('transaksi.bisa_serah_terima_loket', false)
                    ->where('transaksi.sedang_diantar_kurir', false)
                    ->where('transaksi.pengantaran_aktif.id_pengantaran', $sesiBaru->id_pengantaran)
                    ->has('transaksi.riwayat_pengantaran', 2)
                );

            // Check GET /pengantaran N+1 budget for PENGANTAR (courier)
            DB::flushQueryLog();
            DB::enableQueryLog();
            $kurirIndexResponse = $this->actingAs($kurirBUser)->get('/pengantaran');
            $kurirQueries = DB::getQueryLog();
            DB::disableQueryLog();

            $this->assertLessThanOrEqual(18, count($kurirQueries), 'Possible N+1 query on courier GET /pengantaran: '.count($kurirQueries));
            $kurirIndexResponse->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('eligibleTransaksiOptions', 0)
                );

            // Filter by tanggal_pengantaran and id_petugas_antar
            $this->actingAs($petugasUser)
                ->get('/pengantaran?tanggal_pengantaran=2026-11-11&id_petugas_antar='.$kurirB->id_petugas_antar)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('pengantaran.data', 1)
                    ->where('pengantaran.data.0.id_pengantaran', $sesiBaru->id_pengantaran)
                );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_pengantaran_handles_sql_like_escaping_normalization_missing_profile_and_404(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 16, 0, 0, 'Asia/Jakarta'));

        try {
            $petugasUser = $this->createPetugasUser();
            $pegawaiUser = $this->createPegawaiUser();
            $kurirUser = $this->createPengantarUser(true, 'Kurir Escape');
            $kurirWithoutProfile = User::factory()->pengantar()->create(['name' => 'Kurir Tanpa Profil']);

            $petugas = $petugasUser->petugas;
            $pegawai = $pegawaiUser->pegawai;
            $kurir = $kurirUser->petugasPengantaran;
            $layanan = $this->createLayanan();

            $pelWildcard = $this->createPelanggan('Ani_100% Promo', '081366660001');
            $pelNormal = $this->createPelanggan('Budi Biasa', '081366660002');

            $trxWildcard = $this->createSelesaiTransaksi($petugas, $pegawai, $pelWildcard, $layanan);
            $trxNormal = $this->createSelesaiTransaksi($petugas, $pegawai, $pelNormal, $layanan);

            // Store with whitespace around nomor_nota_list element
            $this->actingAs($petugasUser)
                ->post('/pengantaran', [
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => ["  {$trxWildcard->nomor_nota}  "],
                ])
                ->assertRedirect();

            $this->actingAs($petugasUser)
                ->post('/pengantaran', [
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxNormal->nomor_nota],
                ])
                ->assertRedirect();

            // Search for literal "100%" only matches Ani_100% Promo (not Budi Biasa)
            $this->actingAs($petugasUser)
                ->get('/pengantaran?search=100%25')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('pengantaran.data', 1)
                    ->where('pengantaran.data.0.items.0.nomor_nota', $trxWildcard->nomor_nota)
                );

            // Lowercase status & whitespace alasan_gagal normalization
            $sesiWildcard = Pengantaran::orderBy('id_pengantaran')->firstOrFail();
            $itemWildcard = $sesiWildcard->itemPengantaran()->firstOrFail();

            $this->actingAs($kurirUser)
                ->post("/pengantaran/item/{$itemWildcard->id_item_antar}/status", [
                    'status_terima_pelanggan' => '  diambil  ',
                    'alasan_gagal' => '   ',
                ])
                ->assertRedirect("/pengantaran/{$sesiWildcard->id_pengantaran}")
                ->assertSessionHas('success');

            $itemWildcard->refresh();
            $this->assertSame(StatusItemPengantaran::DIAMBIL, $itemWildcard->status_terima_pelanggan);
            $this->assertNull($itemWildcard->alasan_gagal);

            // Missing PetugasPengantaran profile -> 403
            $this->actingAs($kurirWithoutProfile)->get('/pengantaran')->assertForbidden();

            // Unknown IDs -> 404
            $this->actingAs($petugasUser)->get('/pengantaran/999999')->assertNotFound();
            $this->actingAs($kurirUser)->post('/pengantaran/999999/mulai')->assertNotFound();
            $this->actingAs($kurirUser)->post('/pengantaran/item/999999/status', [
                'status_terima_pelanggan' => 'DIAMBIL',
            ])->assertNotFound();
            $this->actingAs($petugasUser)->post('/pengantaran/item/999999/jadwalkan-ulang', [
                'tanggal_pengantaran' => '2026-11-11',
            ])->assertNotFound();
        } finally {
            Carbon::setTestNow();
        }
    }
}
