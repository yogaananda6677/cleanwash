<?php

namespace Tests\Feature;

use App\Enums\JenisInsiden;
use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\StatusPengantaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Http\Middleware\EnsureUserHasRole;
use App\Models\AuditLog;
use App\Models\JenisLayanan;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Pengantaran;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class Phase3EndToEndTest extends TestCase
{
    use RefreshDatabase;

    private const TEST_PASSWORD = 'secret123';

    /**
     * @return array{
     *     petugasUser: User,
     *     petugas: Petugas,
     *     pegawaiUser: User,
     *     pegawai: Pegawai,
     *     kurir1User: User,
     *     kurir1: PetugasPengantaran,
     *     kurir2User: User,
     *     kurir2: PetugasPengantaran
     * }
     */
    private function createActors(): array
    {
        $petugasUser = User::factory()->petugas()->create([
            'name' => 'Rina Kasir',
            'email' => 'rina.p3@cleanwash.test',
            'password' => Hash::make(self::TEST_PASSWORD),
        ]);
        $petugas = Petugas::create([
            'user_id' => $petugasUser->id,
            'nama_petugas' => 'Rina Kasir',
        ]);

        $pegawaiUser = User::factory()->pegawai()->create([
            'name' => 'Bambang Produksi',
            'email' => 'bambang.p3@cleanwash.test',
            'password' => Hash::make(self::TEST_PASSWORD),
        ]);
        $pegawai = Pegawai::create([
            'user_id' => $pegawaiUser->id,
            'nama_pegawai' => 'Bambang Produksi',
        ]);

        $kurir1User = User::factory()->pengantar()->create([
            'name' => 'Agus Kurir Satu',
            'email' => 'agus.kurir1@cleanwash.test',
            'password' => Hash::make(self::TEST_PASSWORD),
        ]);
        $kurir1 = PetugasPengantaran::create([
            'user_id' => $kurir1User->id,
            'nama_petugas_antar' => 'Agus Kurir Satu',
        ]);

        $kurir2User = User::factory()->pengantar()->create([
            'name' => 'Dedi Kurir Dua',
            'email' => 'dedi.kurir2@cleanwash.test',
            'password' => Hash::make(self::TEST_PASSWORD),
        ]);
        $kurir2 = PetugasPengantaran::create([
            'user_id' => $kurir2User->id,
            'nama_petugas_antar' => 'Dedi Kurir Dua',
        ]);

        return [
            'petugasUser' => $petugasUser,
            'petugas' => $petugas,
            'pegawaiUser' => $pegawaiUser,
            'pegawai' => $pegawai,
            'kurir1User' => $kurir1User,
            'kurir1' => $kurir1,
            'kurir2User' => $kurir2User,
            'kurir2' => $kurir2,
        ];
    }

    private function loginAs(User $user): void
    {
        if (auth()->check()) {
            $this->post('/logout')->assertRedirect('/login');
        }

        $this->post('/login', [
            'email' => $user->email,
            'password' => self::TEST_PASSWORD,
        ])->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    private function createKiloanLayananViaHttp(): JenisLayanan
    {
        $this->post('/layanan', [
            'nama_layanan' => 'Cuci Setrika Kiloan',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER->value,
            'metode_hitung' => MetodeHitung::BERAT->value,
            'satuan' => SatuanLayanan::KG->value,
            'harga_satuan' => '10000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ])->assertRedirect('/layanan');

        return JenisLayanan::where('nama_layanan', 'Cuci Setrika Kiloan')->firstOrFail();
    }

    private function createPelangganViaHttp(string $nama, string $phone, bool $bolehBayarAkhir): Pelanggan
    {
        $this->post('/pelanggan', [
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Merdeka No. 10, Yogyakarta',
            'boleh_bayar_akhir' => $bolehBayarAkhir,
        ])->assertRedirect('/pelanggan');

        return Pelanggan::where('no_telepon', $phone)->firstOrFail();
    }

    /**
     * @param  list<array{jenis_pakaian: string, jumlah_potong: int, kondisi_pakaian: string}>  $detailPakaian
     */
    private function createTransaksiViaHttp(
        Pelanggan $pelanggan,
        JenisLayanan $layanan,
        string $beratAtauJumlah,
        string $nominalDp,
        string $catatanKhusus,
        array $detailPakaian
    ): Transaksi {
        $this->post('/transaksi', [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $beratAtauJumlah,
            'nominal_dp' => $nominalDp,
            'catatan_khusus' => $catatanKhusus,
            'detail_pakaian' => $detailPakaian,
        ])->assertRedirect();

        return Transaksi::where('catatan_khusus', $catatanKhusus)->firstOrFail();
    }

    private function advanceToSelesaiAsPegawai(string $nomorNota): void
    {
        foreach ([
            TahapProduksi::DICUCI->value,
            TahapProduksi::DIKERINGKAN->value,
            TahapProduksi::DISETRIKA->value,
            TahapProduksi::SELESAI->value,
        ] as $tahap) {
            $this->post("/produksi/{$nomorNota}/status", [
                'tahap_status' => $tahap,
            ])->assertRedirect('/produksi')->assertSessionHas('success');
        }
    }

    /**
     * Assert an HTTP GET request renders with the real Vite manifest and stays within query budget.
     */
    private function getWithinQueryBudget(string $uri, string $manifestEntryFile, int $maxQueries = 20): TestResponse
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->get($uri);

        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(
            $maxQueries,
            $queryCount,
            "Query budget exceeded on {$uri}: {$queryCount} queries (max {$maxQueries})."
        );

        $response->assertOk();
        $response->assertSee($manifestEntryFile, false);

        return $response;
    }

    public function test_skenario_1_multi_customer_delivery_kk06_reschedule_kk07_and_post_adjustment_settlement(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 0, 0, 'Asia/Jakarta'));

        try {
            // Verify ensure_pages_exist & all 15 Inertia pages in public/build/manifest.json (AC-P3-12)
            $this->assertTrue((bool) config('inertia.testing.ensure_pages_exist'));

            $manifestPath = public_path('build/manifest.json');
            $this->assertFileExists($manifestPath, 'Vite build manifest must exist before running Phase 3 E2E test.');

            $manifest = json_decode((string) file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
            foreach ([
                'resources/js/app.tsx',
                'resources/js/Pages/Auth/Login.tsx',
                'resources/js/Pages/Dashboard/Index.tsx',
                'resources/js/Pages/Pelanggan/Index.tsx',
                'resources/js/Pages/Layanan/Index.tsx',
                'resources/js/Pages/Voucher/Index.tsx',
                'resources/js/Pages/Transaksi/Index.tsx',
                'resources/js/Pages/Transaksi/Create.tsx',
                'resources/js/Pages/Transaksi/Show.tsx',
                'resources/js/Pages/Transaksi/Nota.tsx',
                'resources/js/Pages/Produksi/Index.tsx',
                'resources/js/Pages/Insiden/Index.tsx',
                'resources/js/Pages/Pengantaran/Index.tsx',
                'resources/js/Pages/Pengantaran/Show.tsx',
                'resources/js/Pages/SerahTerima/Index.tsx',
                'resources/js/Pages/Audit/Index.tsx',
            ] as $pageEntry) {
                $this->assertArrayHasKey($pageEntry, $manifest, "Vite manifest missing page entry: {$pageEntry}");
            }

            $appJsFile = $manifest['resources/js/app.tsx']['file'];

            $actors = $this->createActors();
            $petugasUser = $actors['petugasUser'];
            $pegawaiUser = $actors['pegawaiUser'];
            $kurir1User = $actors['kurir1User'];
            $kurir1 = $actors['kurir1'];
            $kurir2User = $actors['kurir2User'];
            $kurir2 = $actors['kurir2'];

            // 1. Verify /login & PETUGAS creates service, customers (reguler vs paylater), and Nota A, B, C
            $this->get('/login')
                ->assertOk()
                ->assertSee($appJsFile, false)
                ->assertInertia(fn (Assert $page) => $page->component('Auth/Login'));

            $this->loginAs($petugasUser);

            $layanan = $this->createKiloanLayananViaHttp();
            $pelangganReguler = $this->createPelangganViaHttp('Siti Reguler', '0811110001', false);
            $pelangganKhusus = $this->createPelangganViaHttp('Hotel Mulia PayLater', '0811110002', true);

            // Nota A: reguler, initial 2.00 kg * 10000 = 20000, DP 5000 -> adjusted via KK-01 & KK-04
            $trxA = $this->createTransaksiViaHttp(
                $pelangganReguler,
                $layanan,
                '2.00',
                '5000.00',
                'P3-S1-NOTA-A',
                [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                    ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ]
            );
            $notaA = $trxA->nomor_nota;
            $detailKemejaA = $trxA->detailPakaian()->where('jenis_pakaian', 'Kemeja')->firstOrFail();

            // Nota B: paylater (boleh_bayar_akhir = true), 3.00 kg * 10000 = 30000, DP 0
            $trxB = $this->createTransaksiViaHttp(
                $pelangganKhusus,
                $layanan,
                '3.00',
                '0.00',
                'P3-S1-NOTA-B',
                [
                    ['jenis_pakaian' => 'Handuk Hotel', 'jumlah_potong' => 5, 'kondisi_pakaian' => 'Baik'],
                ]
            );
            $notaB = $trxB->nomor_nota;

            // Nota C: reguler, 2.00 kg * 10000 = 20000, DP 2000 -> cancelled post-wash (KK-08)
            $trxC = $this->createTransaksiViaHttp(
                $pelangganReguler,
                $layanan,
                '2.00',
                '2000.00',
                'P3-S1-NOTA-C',
                [
                    ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ]
            );
            $notaC = $trxC->nomor_nota;

            // 2. PEGAWAI re-weighs Nota A (KK-01: 2.00 -> 4.00 kg => 40000), reports RUSAK (KK-04),
            //    completes Nota A & Nota B to SELESAI, and advances Nota C to DICUCI
            $this->loginAs($pegawaiUser);

            $this->post("/produksi/{$notaA}/timbang-ulang", [
                'berat_aktual' => '4.00',
                'catatan' => 'Berat aktual pasca sortir lebih berat.',
            ])->assertRedirect('/produksi')->assertSessionHas('success');

            $this->post("/transaksi/{$notaA}/insiden", [
                'id_detail' => $detailKemejaA->id_detail,
                'jenis_insiden' => JenisInsiden::RUSAK->value,
                'keterangan' => 'Kemeja tersangkut mesin saat pengeringan.',
            ])->assertRedirect('/produksi')->assertSessionHas('success');

            $laporanA = LaporanKerusakanKehilangan::where('nomor_nota', $notaA)->firstOrFail();

            $this->advanceToSelesaiAsPegawai($notaA);
            $this->advanceToSelesaiAsPegawai($notaB);

            $this->post("/produksi/{$notaC}/status", [
                'tahap_status' => TahapProduksi::DICUCI->value,
            ])->assertRedirect('/produksi')->assertSessionHas('success');

            // 3. PETUGAS confirms compensation 15000 on Nota A (40000 - 15000 = 25000; DP 5000 => sisa 20000),
            //    cancels Nota C post-wash (50% of 20000 = 10000; DP 2000 => sisa 8000),
            //    verifies Nota C exclusion from delivery & handover while still allowing settlement
            $this->loginAs($petugasUser);

            $this->post("/insiden/{$laporanA->id_laporan}/konfirmasi", [
                'nilai_kompensasi' => '15000.00',
                'keterangan_konfirmasi' => 'Disetujui potongan kompensasi Rp 15.000.',
            ])->assertRedirect('/insiden')->assertSessionHas('success');

            $trxA->refresh();
            $this->assertSame('25000.00', (string) $trxA->total_harga);
            $this->assertSame('15000.00', (string) $trxA->total_kompensasi);
            $this->assertSame(StatusPembayaran::DP, $trxA->status_pembayaran);

            $this->post("/transaksi/{$notaC}/batalkan", [
                'alasan_pembatalan' => 'Pelanggan membatalkan setelah pencucian dimulai.',
            ])->assertRedirect("/transaksi/{$notaC}")->assertSessionHas('success');

            $trxC->refresh();
            $this->assertSame(StatusTransaksi::DIBATALKAN, $trxC->status_transaksi);
            $this->assertSame('10000.00', (string) $trxC->biaya_pembatalan);
            $this->assertSame('10000.00', (string) $trxC->total_harga);

            // Nota C must NOT appear in eligibleTransaksiOptions on GET /pengantaran
            $this->get('/pengantaran')
                ->assertOk()
                ->assertSee($appJsFile, false)
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Index')
                    ->has('eligibleTransaksiOptions', 2)
                    ->where('eligibleTransaksiOptions', function ($options) use ($notaA, $notaB, $notaC): bool {
                        $notas = collect($options)->pluck('nomor_nota')->all();
                        $notaAOpt = collect($options)->firstWhere('nomor_nota', $notaA);

                        return in_array($notaA, $notas, true)
                            && in_array($notaB, $notas, true)
                            && ! in_array($notaC, $notas, true)
                            && $notaAOpt !== null
                            && $notaAOpt['sisa_tagihan'] === '20000.00';
                    })
                );

            // Nota C rejected 422 from POST /pengantaran and POST /transaksi/{notaC}/serah-terima
            $this->postJson('/pengantaran', [
                'id_petugas_antar' => $kurir1->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$notaC],
            ])->assertStatus(422)->assertJsonValidationErrors('nomor_nota_list');

            $this->postJson("/transaksi/{$notaC}/serah-terima", [])
                ->assertStatus(422)
                ->assertJsonValidationErrors('status_transaksi');

            // Nota C cancellation fee (sisa 8000.00) CAN still be settled via POST /transaksi/{notaC}/pembayaran
            $this->post("/transaksi/{$notaC}/pembayaran", [
                'nominal_bayar' => '8000.00',
            ])->assertRedirect("/transaksi/{$notaC}")->assertSessionHas('success');

            $this->assertSame(StatusPembayaran::LUNAS, $trxC->refresh()->status_pembayaran);

            // 4. PETUGAS schedules Nota A & Nota B into 1 Pengantaran for Kurir 1
            $storeDeliveryResponse = $this->post('/pengantaran', [
                'id_petugas_antar' => $kurir1->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$notaA, $notaB],
            ]);

            $sesi1 = Pengantaran::with('itemPengantaran')->orderByDesc('id_pengantaran')->firstOrFail();
            $storeDeliveryResponse
                ->assertRedirect("/pengantaran/{$sesi1->id_pengantaran}")
                ->assertSessionHas('success');

            $itemA = $sesi1->itemPengantaran->firstWhere('nomor_nota', $notaA);
            $itemB = $sesi1->itemPengantaran->firstWhere('nomor_nota', $notaB);
            $this->assertNotNull($itemA);
            $this->assertNotNull($itemB);

            // Verify Kurir 2 (403) & PEGAWAI (403) isolation on /pengantaran*
            $this->actingAs($kurir2User)->get("/pengantaran/{$sesi1->id_pengantaran}")->assertForbidden();
            $this->actingAs($kurir2User)->post("/pengantaran/{$sesi1->id_pengantaran}/mulai")->assertForbidden();
            $this->actingAs($kurir2User)->postJson("/pengantaran/item/{$itemA->id_item_antar}/status", [
                'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
            ])->assertForbidden();
            $this->actingAs($kurir2User)->postJson("/pengantaran/item/{$itemA->id_item_antar}/jadwalkan-ulang", [
                'tanggal_pengantaran' => '2026-11-11',
            ])->assertForbidden();
            $this->actingAs($kurir2User)->post('/pengantaran', [
                'id_petugas_antar' => $kurir2->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$notaA],
            ])->assertForbidden();

            $this->actingAs($pegawaiUser)->get('/pengantaran')->assertForbidden();
            $this->actingAs($pegawaiUser)->get("/pengantaran/{$sesi1->id_pengantaran}")->assertForbidden();
            $this->actingAs($pegawaiUser)->post('/pengantaran', [])->assertForbidden();
            $this->actingAs($pegawaiUser)->post("/pengantaran/{$sesi1->id_pengantaran}/mulai")->assertForbidden();
            $this->actingAs($pegawaiUser)->post("/pengantaran/item/{$itemA->id_item_antar}/status", [])->assertForbidden();
            $this->actingAs($pegawaiUser)->post("/pengantaran/item/{$itemA->id_item_antar}/jadwalkan-ulang", [])->assertForbidden();

            // 5. Kurir 1 logs in, verifies /dashboard KPI & /pengantaran/{id}, clicks mulai,
            //    advances Nota A to DALAM_PERJALANAN, and gets blocked 422 by KK-06 on DITERIMA
            $this->loginAs($kurir1User);

            $this->get('/dashboard')
                ->assertOk()
                ->assertSee($appJsFile, false)
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Dashboard/Index')
                    ->where('summary.role', UserRole::PENGANTAR->value)
                    ->where('summary.jadwal_pengantaran_aktif', 1)
                    ->where('summary.item_pengantaran_aktif', 2)
                    ->where('summary.item_terkirim_hari_ini', 0)
                    ->where('summary.item_gagal_perlu_tindak_lanjut', 0)
                );

            $this->get("/pengantaran/{$sesi1->id_pengantaran}")
                ->assertOk()
                ->assertSee($appJsFile, false)
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Pengantaran/Show')
                    ->where('pengantaran.id_pengantaran', $sesi1->id_pengantaran)
                    ->where('pengantaran.status_pengantaran', StatusPengantaran::DIJADWALKAN->value)
                    ->has('pengantaran.items', 2)
                );

            $this->post("/pengantaran/{$sesi1->id_pengantaran}/mulai")
                ->assertRedirect("/pengantaran/{$sesi1->id_pengantaran}")
                ->assertSessionHas('success');
            $this->assertSame(StatusPengantaran::BERJALAN, $sesi1->refresh()->status_pengantaran);

            foreach ([StatusItemPengantaran::DIAMBIL->value, StatusItemPengantaran::DALAM_PERJALANAN->value] as $nextStatus) {
                $this->post("/pengantaran/item/{$itemA->id_item_antar}/status", [
                    'status_terima_pelanggan' => $nextStatus,
                ])->assertRedirect("/pengantaran/{$sesi1->id_pengantaran}")->assertSessionHas('success');
            }

            // Attempt DITERIMA while Nota A still owes 20000.00 (reguler) -> blocked 422 & clean rollback
            $this->from("/pengantaran/{$sesi1->id_pengantaran}")
                ->post("/pengantaran/item/{$itemA->id_item_antar}/status", [
                    'status_terima_pelanggan' => StatusItemPengantaran::DITERIMA->value,
                ])
                ->assertRedirect("/pengantaran/{$sesi1->id_pengantaran}")
                ->assertSessionHas('error')
                ->assertSessionHasErrors('status_terima_pelanggan');

            $this->assertSame(
                StatusItemPengantaran::DALAM_PERJALANAN,
                $itemA->refresh()->status_terima_pelanggan
            );
            $this->assertSame(StatusTransaksi::SELESAI, $trxA->refresh()->status_transaksi);
            $this->assertNull($trxA->diambil_pada);

            // 6. PETUGAS settles Nota A remaining balance (20000.00 -> LUNAS), then Kurir 1 marks Nota A DITERIMA
            $this->loginAs($petugasUser);

            $this->post("/transaksi/{$notaA}/pembayaran", [
                'nominal_bayar' => '20000.00',
            ])->assertRedirect("/transaksi/{$notaA}")->assertSessionHas('success');

            $this->assertSame(StatusPembayaran::LUNAS, $trxA->refresh()->status_pembayaran);

            $this->loginAs($kurir1User);

            $this->post("/pengantaran/item/{$itemA->id_item_antar}/status", [
                'status_terima_pelanggan' => StatusItemPengantaran::DITERIMA->value,
            ])->assertRedirect("/pengantaran/{$sesi1->id_pengantaran}")->assertSessionHas('success');

            $trxA->refresh();
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxA->status_transaksi);
            $this->assertSame(StatusPembayaran::LUNAS, $trxA->status_pembayaran);
            $this->assertNotNull($trxA->diambil_pada);
            $this->assertSame('2026-11-10', $trxA->diambil_pada->copy()->timezone('Asia/Jakarta')->toDateString());
            $this->assertDatabaseHas('audit_logs', [
                'action' => 'SERAH_TERIMA',
                'subject_id' => $notaA,
                'actor_role' => UserRole::PENGANTAR->value,
            ]);

            // 7. Kurir 1 advances Nota B: DIAMBIL -> DALAM_PERJALANAN -> GAGAL (parent session auto SELESAI, Nota A isolated)
            foreach ([StatusItemPengantaran::DIAMBIL->value, StatusItemPengantaran::DALAM_PERJALANAN->value] as $nextStatus) {
                $this->post("/pengantaran/item/{$itemB->id_item_antar}/status", [
                    'status_terima_pelanggan' => $nextStatus,
                ])->assertRedirect("/pengantaran/{$sesi1->id_pengantaran}")->assertSessionHas('success');
            }

            $this->post("/pengantaran/item/{$itemB->id_item_antar}/status", [
                'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                'alasan_gagal' => 'Penerima gedung sedang tutup di luar jam penerimaan.',
            ])->assertRedirect("/pengantaran/{$sesi1->id_pengantaran}")->assertSessionHas('success');

            $sesi1->refresh();
            $this->assertSame(StatusPengantaran::SELESAI, $sesi1->status_pengantaran);
            $this->assertSame(StatusItemPengantaran::DITERIMA, $itemA->refresh()->status_terima_pelanggan);
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxA->refresh()->status_transaksi);
            $this->assertSame(StatusItemPengantaran::GAGAL, $itemB->refresh()->status_terima_pelanggan);
            $this->assertSame(StatusTransaksi::SELESAI, $trxB->refresh()->status_transaksi);

            // 8. PETUGAS reschedules Nota B to Kurir 2 (KK-07), double-reschedule rejected 422
            $this->loginAs($petugasUser);

            $rescheduleResponse = $this->post("/pengantaran/item/{$itemB->id_item_antar}/jadwalkan-ulang", [
                'tanggal_pengantaran' => '2026-11-10',
                'id_petugas_antar' => $kurir2->id_petugas_antar,
            ]);

            $sesi2 = Pengantaran::with('itemPengantaran')->where('id_pengantaran', '>', $sesi1->id_pengantaran)->firstOrFail();
            $rescheduleResponse
                ->assertRedirect("/pengantaran/{$sesi2->id_pengantaran}")
                ->assertSessionHas('success');

            $this->assertSame($kurir2->id_petugas_antar, $sesi2->id_petugas_antar);
            $this->assertSame(StatusPengantaran::DIJADWALKAN, $sesi2->status_pengantaran);
            $itemBRescheduled = $sesi2->itemPengantaran->firstOrFail();
            $this->assertSame($notaB, $itemBRescheduled->nomor_nota);
            $this->assertSame(StatusItemPengantaran::MENUNGGU, $itemBRescheduled->status_terima_pelanggan);

            // KK-07 isolation check on original session & item A
            $this->assertSame(StatusItemPengantaran::DITERIMA, $itemA->refresh()->status_terima_pelanggan);
            $this->assertSame(StatusItemPengantaran::GAGAL, $itemB->refresh()->status_terima_pelanggan);

            // Double-reschedule on old GAGAL itemB rejected 422
            $this->postJson("/pengantaran/item/{$itemB->id_item_antar}/jadwalkan-ulang", [
                'tanggal_pengantaran' => '2026-11-11',
                'id_petugas_antar' => $kurir2->id_petugas_antar,
            ])->assertStatus(422)->assertJsonValidationErrors('item');

            // 9. Kurir 2 starts & delivers Nota B -> DITERIMA (KK-06 paylater allowed: DIAMBIL + BELUM_LUNAS)
            $this->loginAs($kurir2User);

            $this->post("/pengantaran/{$sesi2->id_pengantaran}/mulai")
                ->assertRedirect("/pengantaran/{$sesi2->id_pengantaran}")
                ->assertSessionHas('success');

            foreach ([
                StatusItemPengantaran::DIAMBIL->value,
                StatusItemPengantaran::DALAM_PERJALANAN->value,
                StatusItemPengantaran::DITERIMA->value,
            ] as $nextStatus) {
                $this->post("/pengantaran/item/{$itemBRescheduled->id_item_antar}/status", [
                    'status_terima_pelanggan' => $nextStatus,
                ])->assertRedirect("/pengantaran/{$sesi2->id_pengantaran}")->assertSessionHas('success');
            }

            $trxB->refresh();
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxB->status_transaksi);
            $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxB->status_pembayaran);
            $this->assertNotNull($trxB->diambil_pada);
            $this->assertSame(StatusPengantaran::SELESAI, $sesi2->refresh()->status_pengantaran);

            // 10. PETUGAS verifies Nota B appears in /serah-terima?mode=PIUTANG & /audit, then settles Nota B -> LUNAS
            $this->loginAs($petugasUser);

            $this->get('/serah-terima?mode=PIUTANG')
                ->assertOk()
                ->assertSee($appJsFile, false)
                ->assertInertia(fn (Assert $page) => $page
                    ->component('SerahTerima/Index')
                    ->where('filters.mode', 'PIUTANG')
                    ->where('summary.piutang_count', 1)
                    ->where('summary.total_piutang_nominal', '30000.00')
                    ->has('transaksi.data', 1)
                    ->where('transaksi.data.0.nomor_nota', $notaB)
                    ->where('transaksi.data.0.sisa_tagihan', '30000.00')
                );

            $this->get('/audit')
                ->assertOk()
                ->assertSee($appJsFile, false)
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Audit/Index')
                    ->where('piutangSummary.total_nota_piutang', 1)
                    ->where('piutangSummary.total_nominal_piutang', '30000.00')
                    ->has('piutangSummary.items', 1)
                    ->where('piutangSummary.items.0.nomor_nota', $notaB)
                    ->has('logs.data')
                );

            $this->get('/dashboard')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Dashboard/Index')
                    ->where('summary.piutang_belum_lunas', 1)
                    ->where('summary.piutang_nominal_total', '30000.00')
                );

            $this->post("/transaksi/{$notaB}/pembayaran", [
                'nominal_bayar' => '30000.00',
                'redirect_to' => 'serah-terima',
            ])->assertRedirect('/serah-terima')->assertSessionHas('success');

            $this->assertSame(StatusPembayaran::LUNAS, $trxB->refresh()->status_pembayaran);

            $this->get('/dashboard')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Dashboard/Index')
                    ->where('summary.piutang_belum_lunas', 0)
                    ->where('summary.piutang_nominal_total', '0.00')
                );

            $this->get('/audit')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Audit/Index')
                    ->where('piutangSummary.total_nota_piutang', 0)
                    ->where('piutangSummary.total_nominal_piutang', '0.00')
                    ->has('piutangSummary.items', 0)
                );

            $this->get("/transaksi/{$notaB}")
                ->assertOk()
                ->assertSee($appJsFile, false)
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Transaksi/Show')
                    ->where('transaksi.nomor_nota', $notaB)
                    ->where('transaksi.status_transaksi', StatusTransaksi::DIAMBIL->value)
                    ->where('transaksi.status_pembayaran', StatusPembayaran::LUNAS->value)
                    ->where('transaksi.bisa_pelunasan', false)
                    ->where('transaksi.sedang_diantar_kurir', false)
                    ->has('transaksi.riwayat_pengantaran', 2)
                );

            $this->assertGreaterThanOrEqual(10, AuditLog::count());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_skenario_2_loket_serah_terima_kk06_courier_conflict_and_query_budget(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 14, 0, 0, 'Asia/Jakarta'));

        try {
            $manifest = json_decode((string) file_get_contents(public_path('build/manifest.json')), true, 512, JSON_THROW_ON_ERROR);
            $appJsFile = $manifest['resources/js/app.tsx']['file'];

            $actors = $this->createActors();
            $petugasUser = $actors['petugasUser'];
            $pegawaiUser = $actors['pegawaiUser'];
            $kurir1User = $actors['kurir1User'];
            $kurir1 = $actors['kurir1'];

            $this->loginAs($petugasUser);
            $layanan = $this->createKiloanLayananViaHttp();
            $pelangganReguler = $this->createPelangganViaHttp('Budi Loket', '0812220001', false);

            // Nota D: reguler unpaid (2.00 kg = 20000, DP 5000 -> sisa 15000)
            $trxD = $this->createTransaksiViaHttp(
                $pelangganReguler,
                $layanan,
                '2.00',
                '5000.00',
                'P3-S2-NOTA-D',
                [['jenis_pakaian' => 'Seragam', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik']]
            );
            $notaD = $trxD->nomor_nota;

            // Nota E: reguler paid (1.00 kg = 10000, DP 10000 -> LUNAS)
            $trxE = $this->createTransaksiViaHttp(
                $pelangganReguler,
                $layanan,
                '1.00',
                '10000.00',
                'P3-S2-NOTA-E',
                [['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik']]
            );
            $notaE = $trxE->nomor_nota;

            $this->loginAs($pegawaiUser);
            $this->advanceToSelesaiAsPegawai($notaD);
            $this->advanceToSelesaiAsPegawai($notaE);

            // PETUGAS schedules Nota D & Nota E to a new Pengantaran
            $this->loginAs($petugasUser);
            $this->post('/pengantaran', [
                'id_petugas_antar' => $kurir1->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$notaD, $notaE],
            ])->assertRedirect();

            $sesi = Pengantaran::with('itemPengantaran')->orderByDesc('id_pengantaran')->firstOrFail();
            $itemD = $sesi->itemPengantaran->firstWhere('nomor_nota', $notaD);
            $itemE = $sesi->itemPengantaran->firstWhere('nomor_nota', $notaE);
            $this->assertNotNull($itemD);
            $this->assertNotNull($itemE);

            // 1. PETUGAS attempts loket handover for unpaid regular Nota D -> rejected 422 (KK-06)
            $this->postJson("/transaksi/{$notaD}/serah-terima", [
                'catatan' => 'Mencoba serah terima sebelum lunas.',
            ])->assertStatus(422)->assertJsonValidationErrors('status_pembayaran');

            // 2. PETUGAS settles Nota D, then hands over Nota D at loket -> succeeds,
            //    auto-closes MENUNGGU itemD -> GAGAL, and syncs parent Pengantaran DIJADWALKAN -> BERJALAN
            $this->post("/transaksi/{$notaD}/pembayaran", [
                'nominal_bayar' => '15000.00',
            ])->assertRedirect("/transaksi/{$notaD}")->assertSessionHas('success');

            $this->post("/transaksi/{$notaD}/serah-terima", [
                'catatan' => 'Pelanggan mengambil langsung di loket.',
                'redirect_to' => 'serah-terima',
            ])->assertRedirect('/serah-terima')->assertSessionHas('success');

            $trxD->refresh();
            $itemD->refresh();
            $sesi->refresh();
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxD->status_transaksi);
            $this->assertSame(StatusPembayaran::LUNAS, $trxD->status_pembayaran);
            $this->assertSame(StatusItemPengantaran::GAGAL, $itemD->status_terima_pelanggan);
            $this->assertSame('Diambil langsung oleh pelanggan di loket kasir.', $itemD->alasan_gagal);
            $this->assertSame(StatusPengantaran::BERJALAN, $sesi->status_pengantaran);

            // 3. Kurir 1 picks up Nota E (MENUNGGU -> DIAMBIL); PETUGAS loket handover on Nota E rejected 422
            $this->loginAs($kurir1User);
            $this->post("/pengantaran/item/{$itemE->id_item_antar}/status", [
                'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
            ])->assertRedirect("/pengantaran/{$sesi->id_pengantaran}")->assertSessionHas('success');

            $this->loginAs($petugasUser);
            $conflictResponse = $this->postJson("/transaksi/{$notaE}/serah-terima", []);
            $conflictResponse->assertStatus(422)->assertJsonValidationErrors('serah_terima');
            $this->assertStringContainsString(
                'sedang dibawa kurir',
                implode(' ', $conflictResponse->json('errors.serah_terima', []))
            );

            // 4. Query Budget Check (<= 20 queries) across all Phase 3 pages with real Vite manifest
            $this->getWithinQueryBudget('/pengantaran', $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('Pengantaran/Index'));

            $this->getWithinQueryBudget("/pengantaran/{$sesi->id_pengantaran}", $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('Pengantaran/Show'));

            $this->getWithinQueryBudget('/serah-terima', $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('SerahTerima/Index'));

            $this->getWithinQueryBudget('/audit', $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('Audit/Index'));

            $this->getWithinQueryBudget('/dashboard', $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('Dashboard/Index'));

            // Also verify courier query budget <= 20 on /pengantaran, /pengantaran/{id}, and /dashboard
            $this->loginAs($kurir1User);

            $this->getWithinQueryBudget('/pengantaran', $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('Pengantaran/Index'));

            $this->getWithinQueryBudget("/pengantaran/{$sesi->id_pengantaran}", $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('Pengantaran/Show'));

            $this->getWithinQueryBudget('/dashboard', $appJsFile)
                ->assertInertia(fn (Assert $page) => $page->component('Dashboard/Index'));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_skenario_3_security_nfr_fillable_csrf_rbac_and_decimal_precision(): void
    {
        // 1. Verify all 16 Eloquent models define non-empty $fillable and default guarded=['*']
        $modelFiles = glob(app_path('Models/*.php'));
        $this->assertNotFalse($modelFiles);
        $this->assertCount(16, $modelFiles, 'Expected exactly 16 Eloquent models in app/Models/.');

        foreach ($modelFiles as $modelFile) {
            $className = 'App\\Models\\'.basename($modelFile, '.php');
            $this->assertTrue(class_exists($className), "Model class {$className} does not exist.");

            $model = new $className;
            $this->assertNotEmpty($model->getFillable(), "{$className} must define non-empty \$fillable.");
            $this->assertSame(['*'], $model->getGuarded(), "{$className} must keep \$guarded = ['*'].");
        }

        // 2. Verify CSRF middleware is in the 'web' group and every mutating route uses web + auth + role:...
        app(HttpKernel::class);
        $router = app('router');
        $webMiddlewares = $router->getMiddlewareGroups()['web'] ?? [];
        $this->assertContains(
            ValidateCsrfToken::class,
            $webMiddlewares,
            'The web middleware group must enforce CSRF token validation.'
        );
        $this->assertSame(
            EnsureUserHasRole::class,
            $router->getMiddleware()['role'] ?? null,
            'Role middleware alias must point to EnsureUserHasRole.'
        );

        $checkedBusinessMutatingRoutes = 0;

        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();
            if (
                str_starts_with($uri, 'up')
                || str_starts_with($uri, '_')
                || str_starts_with((string) $route->getName(), 'storage.')
            ) {
                continue;
            }

            $methods = array_diff($route->methods(), ['GET', 'HEAD', 'OPTIONS']);
            if ($methods === []) {
                continue;
            }

            $middlewares = $route->gatherMiddleware();
            $this->assertContains('web', $middlewares, "Mutating route {$uri} must include 'web' (CSRF) middleware.");

            if ($uri === 'login') {
                $this->assertContains('guest', $middlewares);

                continue;
            }

            $this->assertContains('auth', $middlewares, "Mutating route {$uri} must include 'auth' middleware.");

            if ($uri === 'logout') {
                continue;
            }

            $hasRoleMiddleware = collect($middlewares)->contains(
                fn (string $middleware): bool => str_starts_with($middleware, 'role:')
            );
            $this->assertTrue($hasRoleMiddleware, "Mutating route {$uri} must enforce 'role:...' RBAC middleware.");
            $checkedBusinessMutatingRoutes++;
        }

        $this->assertGreaterThanOrEqual(24, $checkedBusinessMutatingRoutes);

        // 3. Verify all monetary columns in MySQL schema use DECIMAL(12,2)
        $monetaryColumns = DB::select(
            "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND COLUMN_NAME IN (
                   'harga_satuan', 'nilai', 'harga_satuan_snapshot', 'nilai_voucher_snapshot',
                   'total_kompensasi', 'biaya_pembatalan', 'total_harga', 'nominal_bayar',
                   'nilai_kompensasi', 'kelebihan_ganti_rugi'
               )"
        );
        $this->assertCount(10, $monetaryColumns, 'Expected all 10 monetary columns across CleanWash schema.');
        foreach ($monetaryColumns as $column) {
            $this->assertSame(
                'decimal(12,2)',
                strtolower((string) $column->COLUMN_TYPE),
                "Column {$column->TABLE_NAME}.{$column->COLUMN_NAME} must be DECIMAL(12,2)."
            );
        }

        // 4. Verify non-PETUGAS roles (PEGAWAI & PENGANTAR) and inactive PETUGAS are blocked 403
        $actors = $this->createActors();
        $petugasUser = $actors['petugasUser'];
        $pegawaiUser = $actors['pegawaiUser'];
        $kurir1User = $actors['kurir1User'];
        $kurir1 = $actors['kurir1'];

        $inactivePetugas = User::factory()->petugas()->inactive()->create([
            'name' => 'Kasir Nonaktif',
            'email' => 'nonaktif.p3@cleanwash.test',
        ]);
        Petugas::create([
            'user_id' => $inactivePetugas->id,
            'nama_petugas' => 'Kasir Nonaktif',
        ]);

        $this->loginAs($petugasUser);
        $layanan = $this->createKiloanLayananViaHttp();
        $pelanggan = $this->createPelangganViaHttp('Security Test Customer', '0813330001', false);
        $trx = $this->createTransaksiViaHttp(
            $pelanggan,
            $layanan,
            '2.00',
            '5000.00',
            'P3-S3-SEC',
            [['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']]
        );
        $this->post('/logout')->assertRedirect('/login');

        foreach ([$pegawaiUser, $kurir1User, $inactivePetugas] as $forbiddenUser) {
            $this->actingAs($forbiddenUser)->get('/audit')->assertForbidden();
            $this->actingAs($forbiddenUser)->get('/serah-terima')->assertForbidden();
            $this->actingAs($forbiddenUser)->post("/transaksi/{$trx->nomor_nota}/pembayaran", [
                'nominal_bayar' => '5000.00',
            ])->assertForbidden();
            $this->actingAs($forbiddenUser)->post("/transaksi/{$trx->nomor_nota}/serah-terima", [])->assertForbidden();
            $this->actingAs($forbiddenUser)->post('/pengantaran', [
                'id_petugas_antar' => $kurir1->id_petugas_antar,
                'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
                'nomor_nota_list' => [$trx->nomor_nota],
            ])->assertForbidden();
        }
    }
}
