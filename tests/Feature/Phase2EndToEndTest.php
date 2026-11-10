<?php

namespace Tests\Feature;

use App\Enums\JenisInsiden;
use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Enums\VoucherStatus;
use App\Models\AuditLog;
use App\Models\JenisLayanan;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class Phase2EndToEndTest extends TestCase
{
    use RefreshDatabase;

    public function test_phase_2_end_to_end_cross_actor_workflows_and_all_acceptance_criteria(): void
    {
        $this->assertTrue((bool) config('inertia.testing.ensure_pages_exist'));

        $manifestPath = public_path('build/manifest.json');
        $this->assertFileExists($manifestPath, 'Vite build manifest must exist before running Phase 2 E2E test.');

        $manifest = json_decode((string) file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        foreach ([
            'resources/js/app.tsx',
            'resources/js/Pages/Auth/Login.tsx',
            'resources/js/Pages/Dashboard/Index.tsx',
            'resources/js/Pages/Transaksi/Index.tsx',
            'resources/js/Pages/Transaksi/Create.tsx',
            'resources/js/Pages/Transaksi/Show.tsx',
            'resources/js/Pages/Transaksi/Nota.tsx',
            'resources/js/Pages/Produksi/Index.tsx',
            'resources/js/Pages/Insiden/Index.tsx',
        ] as $pageEntry) {
            $this->assertArrayHasKey($pageEntry, $manifest, "Vite manifest missing page entry: {$pageEntry}");
        }

        // Prepare actors across all 3 staff roles
        $petugasUser = User::factory()->petugas()->create([
            'name' => 'Rina Kasir',
            'email' => 'rina.p2@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        $petugas = Petugas::create([
            'user_id' => $petugasUser->id,
            'nama_petugas' => 'Rina Kasir',
        ]);

        $pegawaiUser = User::factory()->pegawai()->create([
            'name' => 'Bambang Produksi',
            'email' => 'bambang.p2@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        $pegawai = Pegawai::create([
            'user_id' => $pegawaiUser->id,
            'nama_pegawai' => 'Bambang Produksi',
        ]);

        $pengantarUser = User::factory()->pengantar()->create([
            'name' => 'Agus Kurir',
            'email' => 'agus.p2@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        PetugasPengantaran::create([
            'user_id' => $pengantarUser->id,
            'nama_petugas_antar' => 'Agus Kurir',
        ]);

        // =========================================================================
        // SKENARIO 1: Reception -> KK-09 Master Tariff Update -> Pegawai Dashboard
        // & Produksi -> KK-01 Timbang Ulang (LUNAS -> BELUM_LUNAS) -> Dynamic Stages
        // (perlu_setrika = false) -> Pegawai Incident -> Petugas Confirmation ->
        // Transaksi/Show & Transaksi/Nota
        // =========================================================================

        $this->post('/login', [
            'email' => $petugasUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($petugasUser);

        $this->post('/pelanggan', [
            'nama' => 'Siti Rahmawati',
            'no_telepon' => '081234000999',
            'alamat' => 'Jl. Seturan Raya No. 45, Sleman',
            'boleh_bayar_akhir' => false,
        ])->assertRedirect('/pelanggan');
        $pelanggan = Pelanggan::where('no_telepon', '081234000999')->firstOrFail();

        // Create BERAT service (perlu_setrika = true) and Sepatu service (perlu_setrika = false)
        $this->post('/layanan', [
            'nama_layanan' => 'Cuci Setrika Kiloan',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER->value,
            'metode_hitung' => MetodeHitung::BERAT->value,
            'satuan' => SatuanLayanan::KG->value,
            'harga_satuan' => '10000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ])->assertRedirect('/layanan');
        $layananBerat = JenisLayanan::where('nama_layanan', 'Cuci Setrika Kiloan')->firstOrFail();

        $this->post('/layanan', [
            'nama_layanan' => 'Cuci Sepatu Kilat',
            'tingkat_kecepatan' => TingkatKecepatan::EXPRESS->value,
            'metode_hitung' => MetodeHitung::JUMLAH->value,
            'satuan' => SatuanLayanan::PCS->value,
            'harga_satuan' => '30000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ])->assertRedirect('/layanan');
        $layananSepatu = JenisLayanan::where('nama_layanan', 'Cuci Sepatu Kilat')->firstOrFail();

        $validUntil = Carbon::today('Asia/Jakarta')->addDays(14)->toDateString();
        $this->post('/voucher', [
            'nomor_voucher' => 'HEMAT5K',
            'nilai' => '5000.00',
            'masa_berlaku' => $validUntil,
        ])->assertRedirect('/voucher');

        // Transaction 1 (BERAT): 2.00 kg * 10000.00 - 5000.00 voucher = 15000.00, paid 15000.00 -> LUNAS
        $this->post('/transaksi', [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananBerat->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nomor_voucher' => 'HEMAT5K',
            'nominal_dp' => '15000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
            ],
        ])->assertRedirect();

        $trxBerat = Transaksi::where('id_layanan', $layananBerat->id_layanan)->firstOrFail();
        $notaBerat = $trxBerat->nomor_nota;
        $this->assertSame(StatusPembayaran::LUNAS, $trxBerat->status_pembayaran);
        $this->assertSame('15000.00', (string) $trxBerat->total_harga);

        // Transaction 2 (Sepatu perlu_setrika = false): 2 pcs * 30000.00 = 60000.00, DP 20000.00 -> DP (sisa 40000.00)
        $this->post('/transaksi', [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananSepatu->id_layanan,
            'berat_atau_jumlah' => '2',
            'nominal_dp' => '20000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Sneakers Putih', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Sol kotor'],
            ],
        ])->assertRedirect();

        $trxSepatu = Transaksi::where('id_layanan', $layananSepatu->id_layanan)->firstOrFail();
        $notaSepatu = $trxSepatu->nomor_nota;
        $detailSepatu = $trxSepatu->detailPakaian()->firstOrFail();
        $this->assertSame(StatusPembayaran::DP, $trxSepatu->status_pembayaran);
        $this->assertSame('60000.00', (string) $trxSepatu->total_harga);

        // Update master tariff for layananBerat from 10000.00 -> 18000.00 (KK-09)
        $this->put("/layanan/{$layananBerat->id_layanan}", [
            'nama_layanan' => 'Cuci Setrika Kiloan',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER->value,
            'metode_hitung' => MetodeHitung::BERAT->value,
            'satuan' => SatuanLayanan::KG->value,
            'harga_satuan' => '18000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ])->assertRedirect('/layanan');

        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('summary.role', UserRole::PETUGAS->value)
                ->where('summary.transaksi_aktif', 2)
                ->where('summary.insiden_menunggu_konfirmasi', 0)
                ->where('summary.transaksi_selesai_siap_ambil', 0)
            );

        $this->post('/logout')->assertRedirect('/login');

        // PEGAWAI logs in and checks Dashboard KPIs + Produksi queue
        $this->post('/login', [
            'email' => $pegawaiUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($pegawaiUser);

        $pegawaiDashboard = $this->get('/dashboard');
        $pegawaiDashboard->assertOk();
        $pegawaiDashboard->assertSee($manifest['resources/js/app.tsx']['file'], false);
        $pegawaiDashboard->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Index')
            ->where('summary.role', UserRole::PEGAWAI->value)
            ->where('summary.antrean_aktif', 2)
            ->where('summary.laporan_insiden_saya', 0)
            ->where('summary.perlu_timbang_ulang', 1)
            ->where('summary.siap_proses_berikutnya', 2)
        );

        $produksiResponse = $this->get('/produksi');
        $produksiResponse->assertOk();
        $produksiResponse->assertSee($manifest['resources/js/app.tsx']['file'], false);
        $produksiResponse->assertInertia(fn (Assert $page) => $page
            ->component('Produksi/Index')
            ->where('transaksi.total', 2)
            ->where('stageCounts.DITERIMA', 2)
        );

        // KK-01 + KK-09: PEGAWAI re-weighs $notaBerat from 2.00 kg -> 3.50 kg
        // Must use old snapshot 10000.00 (NOT master 18000.00): 3.50 * 10000 - 5000 = 30000.00 -> LUNAS -> BELUM_LUNAS
        $this->post("/produksi/{$notaBerat}/timbang-ulang", [
            'berat_aktual' => '3.50',
            'catatan' => 'Berat aktual lebih berat setelah disortir.',
        ])->assertRedirect('/produksi')->assertSessionHas('success');

        $trxBerat->refresh();
        $this->assertSame('3.50', (string) $trxBerat->berat_atau_jumlah);
        $this->assertSame('10000.00', (string) $trxBerat->harga_satuan_snapshot);
        $this->assertSame('30000.00', (string) $trxBerat->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxBerat->status_pembayaran);
        $this->assertDatabaseHas('audit_logs', [
            'subject_id' => $notaBerat,
            'action' => 'TIMBANG_ULANG',
        ]);

        // Dynamic stages for Sepatu (perlu_setrika = false): DITERIMA -> DICUCI -> DIKERINGKAN -> SELESAI
        $this->post("/produksi/{$notaSepatu}/status", ['tahap_status' => 'DICUCI'])
            ->assertRedirect('/produksi')
            ->assertSessionHas('success');
        $this->post("/produksi/{$notaSepatu}/status", ['tahap_status' => 'DIKERINGKAN'])
            ->assertRedirect('/produksi')
            ->assertSessionHas('success');

        // Reject DISETRIKA on perlu_setrika = false (AC-P2-03)
        $this->postJson("/produksi/{$notaSepatu}/status", ['tahap_status' => 'DISETRIKA'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('tahap_status');

        $this->post("/produksi/{$notaSepatu}/status", ['tahap_status' => 'SELESAI'])
            ->assertRedirect('/produksi')
            ->assertSessionHas('success');

        $trxSepatu->refresh();
        $this->assertSame(StatusTransaksi::SELESAI, $trxSepatu->status_transaksi);

        // PEGAWAI dashboard updates after Sepatu completes
        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('summary.antrean_aktif', 1)
                ->where('summary.perlu_timbang_ulang', 1)
                ->where('summary.siap_proses_berikutnya', 1)
            );

        // PEGAWAI reports incident on Sepatu detail item (MENUNGGU_KONFIRMASI)
        $this->post("/transaksi/{$notaSepatu}/insiden", [
            'id_detail' => $detailSepatu->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Sol sneakers putih terkelupas saat proses pengeringan.',
        ])->assertRedirect('/produksi')->assertSessionHas('success');

        $laporan1 = LaporanKerusakanKehilangan::where('nomor_nota', $notaSepatu)->firstOrFail();
        $this->assertNull($laporan1->id_petugas);
        $this->assertSame($pegawai->id_pegawai, $laporan1->id_pegawai_pelapor);
        $this->assertSame('0.00', (string) $laporan1->nilai_kompensasi);

        // PEGAWAI cannot confirm own incident (403)
        $this->post("/insiden/{$laporan1->id_laporan}/konfirmasi", [])->assertForbidden();

        // PEGAWAI views /insiden and /dashboard
        $this->get('/insiden')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Insiden/Index')
                ->where('pendingCount', 1)
                ->where('laporan.data.0.status_konfirmasi', 'MENUNGGU_KONFIRMASI')
            );

        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('summary.laporan_insiden_saya', 1)
            );

        $this->post('/logout')->assertRedirect('/login');

        // PETUGAS logs back in, verifies dashboard alert & SELESAI count, then confirms compensation
        $this->post('/login', [
            'email' => $petugasUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('summary.role', UserRole::PETUGAS->value)
                ->where('summary.insiden_menunggu_konfirmasi', 1)
                ->where('summary.transaksi_selesai_siap_ambil', 1)
            );

        // Verify Transaksi/Index shows pending incident warning badge prop before confirmation
        $this->get('/transaksi?status_transaksi=SELESAI')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Index')
                ->where('filters.status_transaksi', StatusTransaksi::SELESAI->value)
                ->where('transaksi.data.0.nomor_nota', $notaSepatu)
                ->where('transaksi.data.0.tahap_produksi_terakhir', TahapProduksi::SELESAI->value)
                ->where('transaksi.data.0.insiden_pending_count', 1)
            );

        // Verify Transaksi/Nota preserves KK-09 snapshot (10000.00) after KK-01 timbangUlang
        $this->get("/transaksi/{$notaBerat}/nota")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Nota')
                ->where('transaksi.nomor_nota', $notaBerat)
                ->where('transaksi.berat_atau_jumlah', '3.50')
                ->where('transaksi.harga_satuan_snapshot', '10000.00')
                ->where('transaksi.total_harga', '30000.00')
                ->where('transaksi.status_pembayaran', StatusPembayaran::BELUM_LUNAS->value)
            );

        // Deterministic RUSAK compensation: 2/2 * 60000 = 60000 * 5 = 300000.00
        // sisa_sebelum = 60000 - 20000 = 40000 -> kelebihan_ganti_rugi = 260000.00, total_harga = 0.00, LUNAS
        $this->post("/insiden/{$laporan1->id_laporan}/konfirmasi", [
            'keterangan_konfirmasi' => 'Kompensasi disetujui sesuai estimasi sistem.',
        ])->assertRedirect('/insiden')->assertSessionHas('success');

        $laporan1->refresh();
        $trxSepatu->refresh();
        $this->assertSame($petugas->id_petugas, $laporan1->id_petugas);
        $this->assertSame('300000.00', (string) $laporan1->nilai_kompensasi);
        $this->assertSame('260000.00', (string) $laporan1->kelebihan_ganti_rugi);
        $this->assertSame('0.00', (string) $trxSepatu->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxSepatu->status_pembayaran);

        // Reject ubah-layanan on SELESAI transaction (KK-02)
        $this->postJson("/transaksi/{$notaSepatu}/ubah-layanan", [
            'id_layanan_baru' => $layananBerat->id_layanan,
            'berat_atau_jumlah_baru' => '2.00',
            'alasan_perubahan' => 'Mencoba ubah layanan setelah selesai.',
        ])->assertStatus(422)->assertJsonValidationErrors('id_layanan_baru');

        // Render Transaksi/Show & Transaksi/Nota with real manifest and assert complete props
        $showResponse = $this->get("/transaksi/{$notaSepatu}");
        $showResponse->assertOk();
        $showResponse->assertSee($manifest['resources/js/app.tsx']['file'], false);
        $showResponse->assertInertia(fn (Assert $page) => $page
            ->component('Transaksi/Show')
            ->where('transaksi.nomor_nota', $notaSepatu)
            ->where('transaksi.status_transaksi', StatusTransaksi::SELESAI->value)
            ->where('transaksi.status_pembayaran', StatusPembayaran::LUNAS->value)
            ->where('transaksi.total_kompensasi', '300000.00')
            ->where('transaksi.total_kelebihan_ganti_rugi', '260000.00')
            ->where('transaksi.kelebihan_bayar_tunai', '0.00')
            ->where('transaksi.total_pengembalian_pelanggan', '260000.00')
            ->where('transaksi.insiden_pending_count', 0)
            ->has('transaksi.laporan_insiden', 1)
            ->where('transaksi.laporan_insiden.0.status_konfirmasi', 'TERKONFIRMASI')
            ->where('transaksi.riwayat_status_produksi.3.pegawai.nama_pegawai', 'Bambang Produksi')
            ->has('auditLogs')
        );

        $notaResponse = $this->get("/transaksi/{$notaSepatu}/nota");
        $notaResponse->assertOk();
        $notaResponse->assertSee($manifest['resources/js/app.tsx']['file'], false);
        $notaResponse->assertInertia(fn (Assert $page) => $page
            ->component('Transaksi/Nota')
            ->where('transaksi.nomor_nota', $notaSepatu)
            ->where('transaksi.total_kompensasi', '300000.00')
            ->where('transaksi.total_kelebihan_ganti_rugi', '260000.00')
            ->where('transaksi.total_pengembalian_pelanggan', '260000.00')
            ->where('transaksi.riwayat_status_produksi.1.pegawai.nama_pegawai', 'Bambang Produksi')
            ->where('transaksi.laporan_insiden.0.jenis_insiden', JenisInsiden::RUSAK->value)
            ->where('transaksi.laporan_insiden.0.kelebihan_ganti_rugi', '260000.00')
        );

        // =========================================================================
        // SKENARIO 2: KK-02 Ubah Layanan (BERAT -> JUMLAH at DICUCI), KK-08 Cancel at
        // DITERIMA (free + atomic voucher release + reuse), & KK-08 Post-Wash Cancel
        // =========================================================================

        $this->post('/logout')->assertRedirect('/login');
        $this->post('/login', [
            'email' => $pegawaiUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        // Advance $notaBerat from DITERIMA -> DICUCI
        $this->post("/produksi/{$notaBerat}/status", ['tahap_status' => 'DICUCI'])
            ->assertRedirect('/produksi')
            ->assertSessionHas('success');

        $this->post('/logout')->assertRedirect('/login');
        $this->post('/login', [
            'email' => $petugasUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        // Missing berat_atau_jumlah_baru when switching BERAT -> JUMLAH rejected 422
        $this->postJson("/transaksi/{$notaBerat}/ubah-layanan", [
            'id_layanan_baru' => $layananSepatu->id_layanan,
            'alasan_perubahan' => 'Pelanggan minta ubah ke layanan satuan.',
        ])->assertStatus(422)->assertJsonValidationErrors('berat_atau_jumlah_baru');

        // Valid KK-02 BERAT -> JUMLAH at DICUCI: 2 pcs * 30000.00 - 5000.00 HEMAT5K = 55000.00 (BELUM_LUNAS)
        $this->post("/transaksi/{$notaBerat}/ubah-layanan", [
            'id_layanan_baru' => $layananSepatu->id_layanan,
            'berat_atau_jumlah_baru' => '2',
            'alasan_perubahan' => 'Pelanggan pindah ke layanan satuan saat masih dicuci.',
        ])->assertRedirect("/transaksi/{$notaBerat}")->assertSessionHas('success');

        $trxBerat->refresh();
        $this->assertSame($layananSepatu->id_layanan, $trxBerat->id_layanan);
        $this->assertSame('30000.00', (string) $trxBerat->harga_satuan_snapshot);
        $this->assertSame('55000.00', (string) $trxBerat->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxBerat->status_pembayaran);

        // KK-08 Free Cancel at DITERIMA + Atomic Voucher Release + Reuse on New Nota
        $this->post('/voucher', [
            'nomor_voucher' => 'BATAL10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $validUntil,
        ])->assertRedirect('/voucher');

        $this->post('/transaksi', [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananBerat->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nomor_voucher' => 'BATAL10K',
            'nominal_dp' => '10000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Selimut', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ])->assertRedirect();

        $trxBatalGratis = Transaksi::where('nomor_voucher', 'BATAL10K')->firstOrFail();
        $notaBatalGratis = $trxBatalGratis->nomor_nota;

        $this->post("/transaksi/{$notaBatalGratis}/batalkan", [
            'alasan_pembatalan' => 'Pelanggan membatalkan sebelum proses pencucian dimulai.',
        ])->assertRedirect("/transaksi/{$notaBatalGratis}")->assertSessionHas('success');

        $trxBatalGratis->refresh();
        $voucherBatal = Voucher::findOrFail('BATAL10K');
        $this->assertSame(StatusTransaksi::DIBATALKAN, $trxBatalGratis->status_transaksi);
        $this->assertSame('0.00', (string) $trxBatalGratis->biaya_pembatalan);
        $this->assertSame('0.00', (string) $trxBatalGratis->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxBatalGratis->status_pembayaran);
        $this->assertNull($trxBatalGratis->nomor_voucher);
        $this->assertSame('0.00', (string) $trxBatalGratis->nilai_voucher_snapshot);
        $this->assertSame(VoucherStatus::TERSEDIA, $voucherBatal->status_penggunaan);
        $this->assertNull($voucherBatal->digunakan_pada);

        $this->get("/transaksi/{$notaBatalGratis}/nota")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Nota')
                ->where('transaksi.status_transaksi', StatusTransaksi::DIBATALKAN->value)
                ->where('transaksi.biaya_pembatalan', '0.00')
                ->where('transaksi.kelebihan_bayar_tunai', '10000.00')
                ->where('transaksi.total_pengembalian_pelanggan', '10000.00')
            );

        // Reuse released voucher BATAL10K on a new transaction (2.00 kg * 18000 = 36000 - 10000 = 26000, DP 10000)
        $this->post('/transaksi', [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananBerat->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nomor_voucher' => 'BATAL10K',
            'nominal_dp' => '10000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Bedcover', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ])->assertRedirect();

        $trxBatalPascaCuci = Transaksi::where('nomor_voucher', 'BATAL10K')->firstOrFail();
        $notaBatalPascaCuci = $trxBatalPascaCuci->nomor_nota;
        $this->assertNotSame($notaBatalGratis, $notaBatalPascaCuci);
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $voucherBatal->fresh()->status_penggunaan);

        // PEGAWAI advances $notaBatalPascaCuci to DIKERINGKAN (DITERIMA -> DICUCI -> DIKERINGKAN)
        $this->post('/logout')->assertRedirect('/login');
        $this->post('/login', [
            'email' => $pegawaiUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        $this->post("/produksi/{$notaBatalPascaCuci}/status", ['tahap_status' => 'DICUCI'])
            ->assertRedirect('/produksi');
        $this->post("/produksi/{$notaBatalPascaCuci}/status", ['tahap_status' => 'DIKERINGKAN'])
            ->assertRedirect('/produksi');

        $this->post('/logout')->assertRedirect('/login');
        $this->post('/login', [
            'email' => $petugasUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        // Reject free cancellation at DIKERINGKAN (KK-08)
        $this->postJson("/transaksi/{$notaBatalPascaCuci}/batalkan", [
            'biaya_pembatalan' => '0.00',
            'alasan_pembatalan' => 'Mencoba batalkan gratis setelah pengeringan.',
        ])->assertStatus(422)->assertJsonValidationErrors('biaya_pembatalan');

        // Default 50% fee on 36000.00 = 18000.00; voucher stays SUDAH_DIGUNAKAN
        $this->post("/transaksi/{$notaBatalPascaCuci}/batalkan", [
            'alasan_pembatalan' => 'Pelanggan minta batal setelah tahap pengeringan.',
        ])->assertRedirect("/transaksi/{$notaBatalPascaCuci}")->assertSessionHas('success');

        $trxBatalPascaCuci->refresh();
        $this->assertSame(StatusTransaksi::DIBATALKAN, $trxBatalPascaCuci->status_transaksi);
        $this->assertSame('18000.00', (string) $trxBatalPascaCuci->biaya_pembatalan);
        $this->assertSame('18000.00', (string) $trxBatalPascaCuci->total_harga);
        $this->assertSame(StatusPembayaran::DP, $trxBatalPascaCuci->status_pembayaran);
        $this->assertSame('BATAL10K', $trxBatalPascaCuci->nomor_voucher);
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $voucherBatal->fresh()->status_penggunaan);

        $this->get("/transaksi/{$notaBatalPascaCuci}/nota")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Nota')
                ->where('transaksi.status_transaksi', StatusTransaksi::DIBATALKAN->value)
                ->where('transaksi.biaya_pembatalan', '18000.00')
                ->where('transaksi.total_harga', '18000.00')
                ->where('transaksi.sisa_tagihan', '8000.00')
                ->where('transaksi.voucher.nomor_voucher', 'BATAL10K')
            );

        // =========================================================================
        // SKENARIO 3: Boundary & RBAC (PENGANTAR 403 everywhere in Phase 2,
        // GET /transaksi status_transaksi filter, and WIB date in DashboardController)
        // =========================================================================

        $this->post('/logout')->assertRedirect('/login');
        $this->post('/login', [
            'email' => $pengantarUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('summary.role', UserRole::PENGANTAR->value)
            );

        // PENGANTAR forbidden 403 on all /produksi* and /insiden* endpoints (plus /transaksi*)
        $this->get('/produksi')->assertForbidden();
        $this->post("/produksi/{$notaBerat}/timbang-ulang", ['berat_aktual' => '2.50'])->assertForbidden();
        $this->post("/produksi/{$notaBerat}/status", ['tahap_status' => 'DIKERINGKAN'])->assertForbidden();
        $this->get('/insiden')->assertForbidden();
        $this->post('/insiden', [
            'nomor_nota' => $notaBerat,
            'id_detail' => $trxBerat->detailPakaian()->firstOrFail()->id_detail,
            'jenis_insiden' => 'RUSAK',
            'keterangan' => 'Akses ilegal oleh kurir.',
        ])->assertForbidden();
        $this->post("/transaksi/{$notaBerat}/insiden", [
            'id_detail' => $trxBerat->detailPakaian()->firstOrFail()->id_detail,
            'jenis_insiden' => 'RUSAK',
            'keterangan' => 'Akses ilegal oleh kurir.',
        ])->assertForbidden();
        $this->post("/insiden/{$laporan1->id_laporan}/konfirmasi", [])->assertForbidden();
        $this->post("/transaksi/{$notaBerat}/ubah-layanan", [
            'id_layanan_baru' => $layananBerat->id_layanan,
            'alasan_perubahan' => 'Akses ilegal.',
        ])->assertForbidden();
        $this->post("/transaksi/{$notaBerat}/batalkan", [
            'alasan_pembatalan' => 'Akses ilegal.',
        ])->assertForbidden();

        // PETUGAS verifies GET /transaksi?status_transaksi=... filtering and Dashboard WIB boundary
        $this->post('/logout')->assertRedirect('/login');
        $this->post('/login', [
            'email' => $petugasUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        $this->get('/transaksi?status_transaksi=AKTIF')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Index')
                ->where('filters.status_transaksi', StatusTransaksi::AKTIF->value)
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $notaBerat)
                ->where('transaksi.data.0.tahap_produksi_terakhir', TahapProduksi::DICUCI->value)
            );

        $this->get('/transaksi?status_transaksi=SELESAI')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Index')
                ->where('filters.status_transaksi', StatusTransaksi::SELESAI->value)
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $notaSepatu)
                ->where('transaksi.data.0.total_kompensasi', '300000.00')
            );

        $this->get('/transaksi?status_transaksi=DIBATALKAN')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Index')
                ->where('filters.status_transaksi', StatusTransaksi::DIBATALKAN->value)
                ->has('transaksi.data', 2)
            );

        // Verify WIB (Asia/Jakarta) date boundary on DashboardController voucher count:
        // 2026-11-10 17:30:00 UTC === 2026-11-11 00:30:00 Asia/Jakarta (WIB)
        Voucher::create([
            'nomor_voucher' => 'WIBEXPIRED',
            'nilai' => '5000.00',
            'masa_berlaku' => '2026-11-10',
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);
        Voucher::create([
            'nomor_voucher' => 'WIBVALID',
            'nilai' => '5000.00',
            'masa_berlaku' => '2026-11-11',
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        Carbon::setTestNow(Carbon::create(2026, 11, 10, 17, 30, 0, 'UTC'));
        try {
            $this->get('/dashboard')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Dashboard/Index')
                    ->where('summary.total_voucher_tersedia', 1)
                );
        } finally {
            Carbon::setTestNow();
        }

        $this->assertGreaterThanOrEqual(6, AuditLog::count());
    }
}
