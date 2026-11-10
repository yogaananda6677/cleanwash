<?php

namespace Tests\Unit;

use App\Enums\JenisInsiden;
use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Enums\VoucherStatus;
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use App\Services\JenisLayananService;
use App\Services\KompensasiService;
use App\Services\ProduksiService;
use App\Services\TransaksiService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class KompensasiServiceTest extends TestCase
{
    use RefreshDatabase;

    private TransaksiService $transaksiService;

    private ProduksiService $produksiService;

    private KompensasiService $kompensasiService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->transaksiService = app(TransaksiService::class);
        $this->produksiService = app(ProduksiService::class);
        $this->kompensasiService = app(KompensasiService::class);
    }

    private function createPetugas(string $nama = 'Kasir Insiden', bool $active = true, bool $withProfile = true): User
    {
        $factory = User::factory()->petugas();
        if (! $active) {
            $factory = $factory->inactive();
        }
        $user = $factory->create(['name' => $nama]);

        if ($withProfile) {
            Petugas::create([
                'user_id' => $user->id,
                'nama_petugas' => $nama,
            ]);
        }

        return $user;
    }

    private function createPegawai(string $nama = 'Pegawai Insiden', bool $active = true, bool $withProfile = true): User
    {
        $factory = User::factory()->pegawai();
        if (! $active) {
            $factory = $factory->inactive();
        }
        $user = $factory->create(['name' => $nama]);

        if ($withProfile) {
            Pegawai::create([
                'user_id' => $user->id,
                'nama_pegawai' => $nama,
            ]);
        }

        return $user;
    }

    private function createPengantar(): User
    {
        $user = User::factory()->pengantar()->create(['name' => 'Kurir Insiden']);
        PetugasPengantaran::create([
            'user_id' => $user->id,
            'nama_petugas_antar' => $user->name,
        ]);

        return $user;
    }

    private function createPelanggan(string $phone = '081280000001'): Pelanggan
    {
        return Pelanggan::create([
            'nama' => 'Pelanggan Kompensasi',
            'no_telepon' => $phone,
            'alamat' => 'Jl. Gejayan No. 15',
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
    private function createTransaksi(
        Petugas $petugas,
        Pelanggan $pelanggan,
        JenisLayanan $layanan,
        string $qty = '3.00',
        ?string $voucherCode = null,
        string $dp = '0.00',
        array $items = [
            ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 4, 'kondisi_pakaian' => 'Baik'],
        ]
    ): Transaksi {
        return $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $qty,
            'nomor_voucher' => $voucherCode,
            'nominal_dp' => $dp,
            'detail_pakaian' => $items,
        ]);
    }

    public function test_hitung_kompensasi_prorates_per_detail_pakaian_with_minimum_clamp_and_preserves_kk09(): void
    {
        $petugas = $this->createPetugas()->petugas()->firstOrFail();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan('Cuci Setrika', '10000.00');

        // Subtotal = 3.00 * 10000.00 = 30000.00; total_potong = 2 + 4 = 6
        $trx = $this->createTransaksi($petugas, $pelanggan, $layanan, '3.00');

        // KK-09: raising master rate must NOT alter compensation calculation based on harga_satuan_snapshot
        $layanan->update(['harga_satuan' => '25000.00']);
        $trx->refresh();

        $kemeja = $trx->detailPakaian->firstWhere('jenis_pakaian', 'Kemeja');
        $celana = $trx->detailPakaian->firstWhere('jenis_pakaian', 'Celana');
        $this->assertInstanceOf(DetailPakaian::class, $kemeja);
        $this->assertInstanceOf(DetailPakaian::class, $celana);

        // Kemeja: 30000 * 2 / 6 = 10000.00 -> RUSAK 50000.00, HILANG 100000.00
        $this->assertSame('50000.00', $this->kompensasiService->hitungKompensasi($trx, $kemeja, JenisInsiden::RUSAK));
        $this->assertSame('100000.00', $this->kompensasiService->hitungKompensasi($trx, $kemeja, JenisInsiden::HILANG));

        // Celana: 30000 * 4 / 6 = 20000.00 -> RUSAK 100000.00, HILANG 200000.00
        $this->assertSame('100000.00', $this->kompensasiService->hitungKompensasi($trx, $celana, JenisInsiden::RUSAK));
        $this->assertSame('200000.00', $this->kompensasiService->hitungKompensasi($trx, $celana, JenisInsiden::HILANG));

        // Non-divisible half-up rounding: 1.00 * 10000.00 = 10000.00, total_potong = 3, item = 1
        // 10000.00 * 1 / 3 = 3333.33 -> RUSAK = 16666.65, HILANG = 33333.30
        $trxRound = $this->createTransaksi($petugas, $pelanggan, $this->createLayanan('Cuci Kilat', '10000.00'), '1.00', null, '0.00', [
            ['jenis_pakaian' => 'Baju', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
        ]);
        $baju = $trxRound->detailPakaian->firstWhere('jenis_pakaian', 'Baju');
        $this->assertInstanceOf(DetailPakaian::class, $baju);
        $this->assertSame('16666.65', $this->kompensasiService->hitungKompensasi($trxRound, $baju, JenisInsiden::RUSAK));
        $this->assertSame('33333.30', $this->kompensasiService->hitungKompensasi($trxRound, $baju, JenisInsiden::HILANG));

        // Minimum basis clamp = 100 cents (Rp 1.00) when prorated item share < Rp 1.00
        $trxTiny = $this->createTransaksi($petugas, $pelanggan, $this->createLayanan('Cuci Mini', '2.00'), '1.00', null, '0.00', [
            ['jenis_pakaian' => 'Sapu Tangan', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ['jenis_pakaian' => 'Kaos Kaki', 'jumlah_potong' => 9, 'kondisi_pakaian' => 'Baik'],
        ]);
        $sapuTangan = $trxTiny->detailPakaian->firstWhere('jenis_pakaian', 'Sapu Tangan');
        $this->assertInstanceOf(DetailPakaian::class, $sapuTangan);
        // 2.00 * 1 / 10 = 0.20 -> clamped to 1.00 -> RUSAK 5.00, HILANG 10.00
        $this->assertSame('5.00', $this->kompensasiService->hitungKompensasi($trxTiny, $sapuTangan, JenisInsiden::RUSAK));
        $this->assertSame('10.00', $this->kompensasiService->hitungKompensasi($trxTiny, $sapuTangan, JenisInsiden::HILANG));
    }

    public function test_lapor_insiden_supports_pegawai_pending_mode_and_petugas_immediate_confirmation_mode(): void
    {
        $petugasUser = $this->createPetugas();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawai();
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();
        $pelanggan = $this->createPelanggan('081280000002');
        $layanan = $this->createLayanan('Cuci Setrika', '10000.00');

        // 5.00 * 10000 = 50000.00; total_potong = 5 (2 + 3), DP = 10000.00
        $trx = $this->createTransaksi($petugas, $pelanggan, $layanan, '5.00', null, '10000.00', [
            ['jenis_pakaian' => 'Kemeja Batik', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ['jenis_pakaian' => 'Celana Bahan', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
        ]);

        $kemeja = $trx->detailPakaian->firstWhere('jenis_pakaian', 'Kemeja Batik');
        $celana = $trx->detailPakaian->firstWhere('jenis_pakaian', 'Celana Bahan');
        $this->assertInstanceOf(DetailPakaian::class, $kemeja);
        $this->assertInstanceOf(DetailPakaian::class, $celana);

        // Mode 1: PEGAWAI reports incident -> MENUNGGU_KONFIRMASI, no compensation deducted even if nilai_kompensasi passed
        $laporanPegawai = $this->kompensasiService->laporInsiden($pegawaiUser, [
            'nomor_nota' => $trx->nomor_nota,
            'id_detail' => $kemeja->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Kancing kemeja batik patah saat pengeringan.',
            'nilai_kompensasi' => '99999.00',
        ]);

        $this->assertNull($laporanPegawai->id_petugas);
        $this->assertSame($pegawai->id_pegawai, $laporanPegawai->id_pegawai_pelapor);
        $this->assertSame('0.00', (string) $laporanPegawai->nilai_kompensasi);
        $this->assertSame('0.00', (string) $laporanPegawai->kelebihan_ganti_rugi);

        $trx->refresh();
        $this->assertSame('0.00', (string) $trx->total_kompensasi);
        $this->assertSame('50000.00', (string) $trx->total_harga);
        $this->assertSame(StatusPembayaran::DP, $trx->status_pembayaran);

        $auditPegawai = AuditLog::where('subject_id', $trx->nomor_nota)
            ->where('action', 'INSIDEN_REPORTED')
            ->latest('id')
            ->firstOrFail();
        $this->assertSame(UserRole::PEGAWAI->value, $auditPegawai->actor_role);
        $this->assertSame($pegawaiUser->id, $auditPegawai->user_id);

        // Advance transaction to SELESAI -> SELESAI must still be eligible for incident reporting!
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
            $this->produksiService->ubahStatusProduksi($trx->nomor_nota, $pegawai, ['tahap_status' => $stage]);
        }

        // Mode 2: PETUGAS reports directly on SELESAI transaction without custom nilai -> uses hitungKompensasi()
        // Celana share = 50000 * 3 / 5 = 30000.00; RUSAK = 5 * 30000 = 150000.00
        // sisa_tagihan_sebelum = 50000 - 10000 = 40000.00 -> kelebihan_ganti_rugi = 150000 - 40000 = 110000.00
        $laporanPetugas = $this->kompensasiService->laporInsiden($petugasUser, [
            'nomor_nota' => $trx->nomor_nota,
            'id_detail' => $celana->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Celana bahan robek di bagian lutut saat pengecekan akhir.',
            'id_pegawai_pelapor' => $pegawai->id_pegawai,
        ]);

        $this->assertSame($petugas->id_petugas, $laporanPetugas->id_petugas);
        $this->assertSame($pegawai->id_pegawai, $laporanPetugas->id_pegawai_pelapor);
        $this->assertSame('150000.00', (string) $laporanPetugas->nilai_kompensasi);
        $this->assertSame('110000.00', (string) $laporanPetugas->kelebihan_ganti_rugi);

        $trx->refresh();
        $this->assertSame('150000.00', (string) $trx->total_kompensasi);
        $this->assertSame('0.00', (string) $trx->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trx->status_pembayaran);

        $auditReported = AuditLog::where('subject_id', $trx->nomor_nota)
            ->where('action', 'INSIDEN_REPORTED')
            ->where('actor_role', UserRole::PETUGAS->value)
            ->firstOrFail();
        $auditConfirmed = AuditLog::where('subject_id', $trx->nomor_nota)
            ->where('action', 'KOMPENSASI_CONFIRMED')
            ->where('actor_role', UserRole::PETUGAS->value)
            ->firstOrFail();
        $this->assertSame($petugasUser->id, $auditReported->user_id);
        $this->assertSame('150000.00', $auditConfirmed->payload_after['nilai_kompensasi'] ?? null);
        $this->assertSame('110000.00', $auditConfirmed->payload_after['kelebihan_ganti_rugi'] ?? null);

        // Shared formula check: TransaksiService formats same estimasi_kompensasi as KompensasiService::hitungKompensasi
        $detail = $this->transaksiService->formatTransaksiDetail($trx);
        $this->assertSame(1, $detail['insiden_pending_count']);
        $this->assertSame('100000.00', $detail['laporan_insiden'][0]['estimasi_kompensasi']);
        $this->assertSame('150000.00', $detail['laporan_insiden'][1]['estimasi_kompensasi']);
    }

    public function test_lapor_insiden_rejects_cross_nota_detail_invalid_transaction_statuses_and_unauthorized_actors(): void
    {
        $petugasUser = $this->createPetugas();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawai();
        $pengantarUser = $this->createPengantar();
        $inactivePegawai = $this->createPegawai('Pegawai Nonaktif', active: false);
        $pegawaiNoProfile = $this->createPegawai('Pegawai Tanpa Profil', active: true, withProfile: false);

        $pelanggan = $this->createPelanggan('081280000003');
        $layanan = $this->createLayanan();

        $trxA = $this->createTransaksi($petugas, $pelanggan, $layanan, '2.00');
        $trxB = $this->createTransaksi($petugas, $pelanggan, $layanan, '2.00');
        $detailB = $trxB->detailPakaian->firstOrFail();

        // Cross-nota id_detail -> ValidationException on id_detail
        $this->assertThrowsValidation(function () use ($pegawaiUser, $trxA, $detailB): void {
            $this->kompensasiService->laporInsiden($pegawaiUser, [
                'nomor_nota' => $trxA->nomor_nota,
                'id_detail' => $detailB->id_detail,
                'jenis_insiden' => JenisInsiden::RUSAK->value,
                'keterangan' => 'Mencoba menautkan detail dari nota lain.',
            ]);
        }, 'id_detail');

        // Reject DIAMBIL and DIBATALKAN
        foreach ([StatusTransaksi::DIAMBIL, StatusTransaksi::DIBATALKAN] as $terminalStatus) {
            $trxTerminal = $this->createTransaksi($petugas, $pelanggan, $layanan, '2.00');
            $detailTerminal = $trxTerminal->detailPakaian->firstOrFail();
            $trxTerminal->update(['status_transaksi' => $terminalStatus]);

            $this->assertThrowsValidation(function () use ($petugasUser, $trxTerminal, $detailTerminal): void {
                $this->kompensasiService->laporInsiden($petugasUser, [
                    'nomor_nota' => $trxTerminal->nomor_nota,
                    'id_detail' => $detailTerminal->id_detail,
                    'jenis_insiden' => JenisInsiden::HILANG->value,
                    'keterangan' => 'Transaksi terminal harus ditolak.',
                ]);
            }, 'nomor_nota');
        }

        // Reject PENGANTAR, inactive user, and missing profile with AuthorizationException
        $detailA = $trxA->detailPakaian->firstOrFail();
        foreach ([$pengantarUser, $inactivePegawai, $pegawaiNoProfile] as $badActor) {
            try {
                $this->kompensasiService->laporInsiden($badActor, [
                    'nomor_nota' => $trxA->nomor_nota,
                    'id_detail' => $detailA->id_detail,
                    'jenis_insiden' => JenisInsiden::RUSAK->value,
                    'keterangan' => 'Aktor tidak berwenang.',
                ]);
                $this->fail('Expected AuthorizationException for unauthorized actor.');
            } catch (AuthorizationException) {
                $this->assertTrue(true);
            }
        }
    }

    public function test_konfirmasi_and_potong_kompensasi_prevent_double_counting_across_multiple_incidents_and_payment_schemes(): void
    {
        $petugasUser = $this->createPetugas();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawai();
        $pelanggan = $this->createPelanggan('081280000004');
        $layanan = $this->createLayanan('Cuci Setrika', '10000.00');

        // Case A: Partial DP (20000.00 on 50000.00) + multi-incident -> NO double-counting!
        $trxDp = $this->createTransaksi($petugas, $pelanggan, $layanan, '5.00', null, '20000.00');
        $kemejaDp = $trxDp->detailPakaian->firstWhere('jenis_pakaian', 'Kemeja');
        $celanaDp = $trxDp->detailPakaian->firstWhere('jenis_pakaian', 'Celana');
        $this->assertInstanceOf(DetailPakaian::class, $kemejaDp);
        $this->assertInstanceOf(DetailPakaian::class, $celanaDp);

        $lap1 = $this->kompensasiService->laporInsiden($pegawaiUser, [
            'nomor_nota' => $trxDp->nomor_nota,
            'id_detail' => $kemejaDp->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Kemeja terkena lunturan warna.',
        ]);

        // Incident 1 = 40000.00 (sisa_sebelum = 50000 - 20000 = 30000 -> kelebihan = 10000.00)
        $confirmed1 = $this->kompensasiService->konfirmasiKompensasi($petugas, $lap1, [
            'nilai_kompensasi' => '40000.00',
            'keterangan_konfirmasi' => 'Disetujui sesuai kesepakatan ganti rugi sebagian.',
        ], $petugasUser);

        $this->assertSame('40000.00', (string) $confirmed1->nilai_kompensasi);
        $this->assertSame('10000.00', (string) $confirmed1->kelebihan_ganti_rugi);

        $trxDp->refresh();
        $this->assertSame('40000.00', (string) $trxDp->total_kompensasi);
        $this->assertSame('10000.00', (string) $trxDp->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxDp->status_pembayaran);

        // Incident 2 = 25000.00 (sisa_sebelum = max(0, 10000 - 20000) = 0.00 -> kelebihan = 25000.00)
        $lap2 = $this->kompensasiService->laporInsiden($pegawaiUser, [
            'nomor_nota' => $trxDp->nomor_nota,
            'id_detail' => $celanaDp->id_detail,
            'jenis_insiden' => JenisInsiden::HILANG->value,
            'keterangan' => 'Celana tidak ditemukan saat packing.',
        ]);

        $confirmed2 = $this->kompensasiService->konfirmasiKompensasi($petugas, $lap2, [
            'nilai_kompensasi' => '25000.00',
        ], $petugasUser);

        $this->assertSame('25000.00', (string) $confirmed2->kelebihan_ganti_rugi);

        $detailDp = $this->transaksiService->formatTransaksiDetail($trxDp->refresh());
        $this->assertSame('65000.00', $detailDp['total_kompensasi']);
        $this->assertSame('0.00', $detailDp['total_harga']);
        $this->assertSame('0.00', $detailDp['sisa_tagihan']);
        $this->assertSame('0.00', $detailDp['kelebihan_bayar_tunai']);
        // Net math: 20000 paid + 65000 comp - 50000 service = 35000.00 refund (NO double counting!)
        $this->assertSame('35000.00', $detailDp['total_kelebihan_ganti_rugi']);
        $this->assertSame('35000.00', $detailDp['total_pengembalian_pelanggan']);
        $this->assertSame(0, $detailDp['insiden_pending_count']);

        // Double confirm must fail with exact message
        $this->assertThrowsValidation(function () use ($petugas, $confirmed1, $petugasUser): void {
            $this->kompensasiService->konfirmasiKompensasi($petugas, $confirmed1, [], $petugasUser);
        }, 'laporan');

        // Case B: 0 DP (BELUM_BAYAR) + multi-incident transitioning to LUNAS at sisa == 0.00
        $trxZeroDp = $this->createTransaksi($petugas, $pelanggan, $layanan, '5.00', null, '0.00');
        $kemejaZero = $trxZeroDp->detailPakaian->firstWhere('jenis_pakaian', 'Kemeja');
        $celanaZero = $trxZeroDp->detailPakaian->firstWhere('jenis_pakaian', 'Celana');
        $this->assertInstanceOf(DetailPakaian::class, $kemejaZero);
        $this->assertInstanceOf(DetailPakaian::class, $celanaZero);

        $this->kompensasiService->laporInsiden($petugasUser, [
            'nomor_nota' => $trxZeroDp->nomor_nota,
            'id_detail' => $kemejaZero->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Insiden pertama belum lunas.',
            'nilai_kompensasi' => '30000.00',
        ]);
        $trxZeroDp->refresh();
        $this->assertSame('20000.00', (string) $trxZeroDp->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_BAYAR, $trxZeroDp->status_pembayaran);

        $this->kompensasiService->laporInsiden($petugasUser, [
            'nomor_nota' => $trxZeroDp->nomor_nota,
            'id_detail' => $celanaZero->id_detail,
            'jenis_insiden' => JenisInsiden::HILANG->value,
            'keterangan' => 'Insiden kedua membuat sisa tagihan nol.',
            'nilai_kompensasi' => '35000.00',
        ]);
        $detailZero = $this->transaksiService->formatTransaksiDetail($trxZeroDp->refresh());
        $this->assertSame('65000.00', $detailZero['total_kompensasi']);
        $this->assertSame('0.00', $detailZero['total_harga']);
        $this->assertSame(StatusPembayaran::LUNAS->value, $detailZero['status_pembayaran']);
        $this->assertSame('15000.00', $detailZero['total_kelebihan_ganti_rugi']);
        $this->assertSame('15000.00', $detailZero['total_pengembalian_pelanggan']);

        // Case C: Full paid (LUNAS) with Voucher + multi-incident
        Voucher::create([
            'nomor_voucher' => 'COMP10K',
            'nilai' => '10000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(7)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);
        // 4.00 * 10000 - 10000 = 30000.00 paid 30000.00 (LUNAS)
        $trxLunas = $this->createTransaksi($petugas, $pelanggan, $layanan, '4.00', 'COMP10K', '30000.00');
        $itemLunas = $trxLunas->detailPakaian->firstOrFail();

        $this->kompensasiService->potongKompensasi($trxLunas, '12000.00');
        $this->assertSame('18000.00', (string) $trxLunas->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxLunas->status_pembayaran);

        $settlement2 = $this->kompensasiService->potongKompensasi($trxLunas, '25000.00');
        $this->assertSame('25000.00', $settlement2['kelebihan_ganti_rugi']);
        $this->assertSame('37000.00', (string) $trxLunas->total_kompensasi);
        $this->assertSame('0.00', (string) $trxLunas->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxLunas->status_pembayaran);

        // Confirming a pending report whose transaction became DIAMBIL must fail 422
        $trxPendingThenTaken = $this->createTransaksi($petugas, $pelanggan, $layanan, '2.00');
        $itemTaken = $trxPendingThenTaken->detailPakaian->firstOrFail();
        $pendingReport = $this->kompensasiService->laporInsiden($pegawaiUser, [
            'nomor_nota' => $trxPendingThenTaken->nomor_nota,
            'id_detail' => $itemTaken->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Laporan sebelum nota diambil.',
        ]);
        $trxPendingThenTaken->update(['status_transaksi' => StatusTransaksi::DIAMBIL]);

        $this->assertThrowsValidation(function () use ($petugas, $pendingReport, $petugasUser): void {
            $this->kompensasiService->konfirmasiKompensasi($petugas, $pendingReport, [], $petugasUser);
        }, 'laporan');

        // Reject zero/negative compensation in PETUGAS laporInsiden and potongKompensasi
        $trxForValidation = $this->createTransaksi($petugas, $pelanggan, $layanan, '2.00');
        $detailValidation = $trxForValidation->detailPakaian->firstOrFail();

        $this->assertThrowsValidation(function () use ($petugasUser, $trxForValidation, $detailValidation): void {
            $this->kompensasiService->laporInsiden($petugasUser, [
                'nomor_nota' => $trxForValidation->nomor_nota,
                'id_detail' => $detailValidation->id_detail,
                'jenis_insiden' => JenisInsiden::RUSAK->value,
                'keterangan' => 'Kompensasi nol harus ditolak.',
                'nilai_kompensasi' => '0.00',
            ]);
        }, 'nilai_kompensasi');

        $this->assertThrowsValidation(function () use ($trxForValidation): void {
            $this->kompensasiService->potongKompensasi($trxForValidation, '-500.00');
        }, 'nilai_kompensasi');

        // Confirming with $actor = null (CLI/worker fallback) still logs Petugas user_id and PETUGAS role
        $pendingWorkerReport = $this->kompensasiService->laporInsiden($pegawaiUser, [
            'nomor_nota' => $trxForValidation->nomor_nota,
            'id_detail' => $detailValidation->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Uji konfirmasi dari worker tanpa objek User.',
        ]);
        $confirmedWorker = $this->kompensasiService->konfirmasiKompensasi($petugas, $pendingWorkerReport);
        $this->assertSame($petugas->id_petugas, $confirmedWorker->id_petugas);
        $workerAudit = AuditLog::where('subject_id', $trxForValidation->nomor_nota)
            ->where('action', 'KOMPENSASI_CONFIRMED')
            ->latest('id')
            ->firstOrFail();
        $this->assertSame($petugas->user_id, $workerAudit->user_id);
        $this->assertSame(UserRole::PETUGAS->value, $workerAudit->actor_role);
    }

    private function assertThrowsValidation(callable $callback, string $expectedField): void
    {
        try {
            $callback();
            $this->fail("Expected ValidationException containing error on [{$expectedField}].");
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey($expectedField, $exception->errors());
        }
    }
}
