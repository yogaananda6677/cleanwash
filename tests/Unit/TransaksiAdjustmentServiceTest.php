<?php

namespace Tests\Unit;

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
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\User;
use App\Models\Voucher;
use App\Services\JenisLayananService;
use App\Services\PembayaranService;
use App\Services\ProduksiService;
use App\Services\TransaksiAdjustmentService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TransaksiAdjustmentServiceTest extends TestCase
{
    use RefreshDatabase;

    private TransaksiService $transaksiService;

    private ProduksiService $produksiService;

    private TransaksiAdjustmentService $adjustmentService;

    private PembayaranService $pembayaranService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->transaksiService = app(TransaksiService::class);
        $this->produksiService = app(ProduksiService::class);
        $this->adjustmentService = app(TransaksiAdjustmentService::class);
        $this->pembayaranService = app(PembayaranService::class);
    }

    private function createPetugas(string $nama = 'Kasir Adjustment'): Petugas
    {
        $user = User::factory()->petugas()->create(['name' => $nama]);

        return Petugas::create([
            'user_id' => $user->id,
            'nama_petugas' => $nama,
        ]);
    }

    private function createPegawai(string $nama = 'Pegawai Produksi'): Pegawai
    {
        $user = User::factory()->pegawai()->create(['name' => $nama]);

        return Pegawai::create([
            'user_id' => $user->id,
            'nama_pegawai' => $nama,
        ]);
    }

    private function createPelanggan(string $phone = '081290000001'): Pelanggan
    {
        return Pelanggan::create([
            'nama' => 'Pelanggan Penyesuaian',
            'no_telepon' => $phone,
            'alamat' => 'Jl. Kaliurang No. 99',
            'boleh_bayar_akhir' => false,
        ]);
    }

    /**
     * @param  list<string>|null  $customStages
     */
    private function createLayanan(
        string $nama,
        TingkatKecepatan $kecepatan = TingkatKecepatan::REGULER,
        MetodeHitung $metode = MetodeHitung::BERAT,
        SatuanLayanan $satuan = SatuanLayanan::KG,
        string $harga = '10000.00',
        bool $perluSetrika = true,
        bool $isActive = true,
        ?array $customStages = null
    ): JenisLayanan {
        return app(JenisLayananService::class)->create([
            'nama_layanan' => $nama,
            'tingkat_kecepatan' => $kecepatan->value,
            'metode_hitung' => $metode->value,
            'satuan' => $satuan->value,
            'harga_satuan' => $harga,
            'perlu_setrika' => $perluSetrika,
            'is_active' => $isActive,
            'tahap_layanan' => $customStages,
        ]);
    }

    public function test_ubah_layanan_at_diterima_and_dicuci_updates_snapshot_preserves_kk09_reconciles_payment_and_logs_audit(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $pelanggan = $this->createPelanggan();

        $layananReguler = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true);
        $layananExpress = $this->createLayanan('Cuci Setrika', TingkatKecepatan::EXPRESS, MetodeHitung::BERAT, SatuanLayanan::KG, '18000.00', true);
        $layananSepatu = $this->createLayanan('Cuci Sepatu', TingkatKecepatan::REGULER, MetodeHitung::JUMLAH, SatuanLayanan::PCS, '15000.00', false);
        $layananKering = $this->createLayanan('Cuci Kering Lipat', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '8000.00', false);

        Voucher::create([
            'nomor_voucher' => 'POT5K',
            'nilai' => '5000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(7)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // 1. DITERIMA: BERAT -> BERAT (same metode_hitung keeps existing quantity), LUNAS -> BELUM_LUNAS
        // 2.00 * 10000 - 5000 = 15000.00 paid 15000.00 (LUNAS)
        $trxA = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananReguler->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nomor_voucher' => 'POT5K',
            'nominal_dp' => '15000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 4, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        // Switch to Cuci Setrika EXPRESS (18000.00/kg) without overriding quantity -> keeps 2.00 kg
        // New total: 2.00 * 18000 - 5000 = 31000.00 (> 15000 paid -> BELUM_LUNAS)
        $updatedA = $this->adjustmentService->ubahLayanan($trxA->nomor_nota, $petugas, [
            'id_layanan_baru' => $layananExpress->id_layanan,
            'alasan_perubahan' => 'Pelanggan minta dipercepat ke layanan Express.',
        ], $petugas->user);

        $this->assertSame($layananExpress->id_layanan, $updatedA->id_layanan);
        $this->assertSame('2.00', $updatedA->berat_atau_jumlah);
        $this->assertSame('18000.00', $updatedA->harga_satuan_snapshot);
        $this->assertSame('5000.00', $updatedA->nilai_voucher_snapshot);
        $this->assertSame('31000.00', $updatedA->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $updatedA->status_pembayaran);

        $auditA = AuditLog::where('subject_id', $trxA->nomor_nota)
            ->where('action', 'LAYANAN_CHANGED')
            ->latest('id')
            ->firstOrFail();

        $this->assertSame(UserRole::PETUGAS->value, $auditA->actor_role);
        $this->assertSame($layananReguler->id_layanan, $auditA->payload_before['id_layanan'] ?? null);
        $this->assertSame('10000.00', $auditA->payload_before['harga_satuan_snapshot'] ?? null);
        $this->assertSame('15000.00', $auditA->payload_before['total_harga'] ?? null);
        $this->assertSame($layananExpress->id_layanan, $auditA->payload_after['id_layanan'] ?? null);
        $this->assertSame('18000.00', $auditA->payload_after['harga_satuan_snapshot'] ?? null);
        $this->assertSame('31000.00', $auditA->payload_after['total_harga'] ?? null);
        $this->assertSame('16000.00', $auditA->payload_after['selisih_tagihan'] ?? null);
        $this->assertSame('Pelanggan minta dipercepat ke layanan Express.', $auditA->payload_after['alasan_perubahan'] ?? null);

        // KK-09: updating master rate of layananExpress afterwards MUST NOT alter trxA snapshot/total
        $layananExpress->update(['harga_satuan' => '25000.00']);
        $trxA->refresh();
        $this->assertSame('18000.00', $trxA->harga_satuan_snapshot);
        $this->assertSame('31000.00', $trxA->total_harga);

        // 2. DICUCI: BERAT -> JUMLAH (mandatory integer qty), DP -> LUNAS + kelebihan_bayar_tunai, preserving total_kompensasi
        // 3.00 * 10000 = 30000.00, DP 20000.00
        $trxB = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananReguler->id_layanan,
            'berat_atau_jumlah' => '3.00',
            'nominal_dp' => '20000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Sepatu Kanvas', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Kotor'],
            ],
        ]);
        $trxB->update(['total_kompensasi' => '2000.00', 'total_harga' => '28000.00']);
        $this->produksiService->ubahStatusProduksi($trxB->nomor_nota, $pegawai, [
            'tahap_status' => TahapProduksi::DICUCI->value,
        ]);

        // Switch to Cuci Sepatu (JUMLAH/pcs, 15000.00) with 1 pcs -> subtotal 15000 - 2000 kompensasi = 13000.00 (<= 20000 paid -> LUNAS)
        $updatedB = $this->adjustmentService->ubahLayanan($trxB->nomor_nota, $petugas, [
            'id_layanan_baru' => $layananSepatu->id_layanan,
            'berat_atau_jumlah_baru' => '1',
            'alasan_perubahan' => 'Salah input kategori item seharusnya layanan satuan sepatu.',
        ], $petugas->user);

        $this->assertSame($layananSepatu->id_layanan, $updatedB->id_layanan);
        $this->assertSame('1.00', $updatedB->berat_atau_jumlah);
        $this->assertSame('15000.00', $updatedB->harga_satuan_snapshot);
        $this->assertSame('13000.00', $updatedB->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $updatedB->status_pembayaran);

        $detailB = $this->transaksiService->formatTransaksiDetail($updatedB);
        $this->assertSame('5000.00', $detailB['kelebihan_bayar_tunai']);
        $this->assertSame('0.00', $detailB['sisa_tagihan']);
        $this->assertSame('DIKERINGKAN', $detailB['tahap_produksi_berikutnya']);

        // 3. DICUCI: JUMLAH -> BERAT with fractional kg
        // 2.25 * 8000 - 2000 kompensasi = 16000.00 (<= 20000 paid -> LUNAS)
        $updatedBackToKg = $this->adjustmentService->ubahLayanan($trxB->nomor_nota, $petugas, [
            'id_layanan_baru' => $layananKering->id_layanan,
            'berat_atau_jumlah_baru' => '2.25',
            'alasan_perubahan' => 'Kembali ke layanan kiloan sesuai kesepakatan pelanggan.',
        ], $petugas->user);

        $this->assertSame('2.25', $updatedBackToKg->berat_atau_jumlah);
        $this->assertSame('8000.00', $updatedBackToKg->harga_satuan_snapshot);
        $this->assertSame('16000.00', $updatedBackToKg->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $updatedBackToKg->status_pembayaran);
    }

    public function test_ubah_layanan_rejects_invalid_stages_statuses_services_and_quantities(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $pelanggan = $this->createPelanggan('081290000002');

        $layananKg = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true);
        $layananKg2 = $this->createLayanan('Cuci Kering', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '8000.00', false);
        $layananPcs = $this->createLayanan('Cuci Sepatu', TingkatKecepatan::REGULER, MetodeHitung::JUMLAH, SatuanLayanan::PCS, '25000.00', false);
        $layananInactive = $this->createLayanan('Layanan Nonaktif', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '12000.00', true, false);
        $layananCustomNoCuci = $this->createLayanan(
            'Setrika Saja',
            TingkatKecepatan::REGULER,
            MetodeHitung::BERAT,
            SatuanLayanan::KG,
            '6000.00',
            true,
            true,
            ['DITERIMA', 'DISETRIKA', 'SELESAI']
        );

        $trx = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananKg->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        // Reject identical service
        $this->assertThrowsValidation(function () use ($trx, $petugas, $layananKg): void {
            $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
                'id_layanan_baru' => $layananKg->id_layanan,
                'alasan_perubahan' => 'Layanan identik harus ditolak.',
            ]);
        }, 'id_layanan_baru');

        // Reject inactive service
        $this->assertThrowsValidation(function () use ($trx, $petugas, $layananInactive): void {
            $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
                'id_layanan_baru' => $layananInactive->id_layanan,
                'alasan_perubahan' => 'Layanan nonaktif harus ditolak.',
            ]);
        }, 'id_layanan_baru');

        // Reject BERAT -> JUMLAH without berat_atau_jumlah_baru
        $this->assertThrowsValidation(function () use ($trx, $petugas, $layananPcs): void {
            $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
                'id_layanan_baru' => $layananPcs->id_layanan,
                'alasan_perubahan' => 'Pindah ke JUMLAH tanpa kuantitas baru.',
            ]);
        }, 'berat_atau_jumlah_baru');

        // Reject BERAT -> JUMLAH with fractional quantity
        $this->assertThrowsValidation(function () use ($trx, $petugas, $layananPcs): void {
            $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
                'id_layanan_baru' => $layananPcs->id_layanan,
                'berat_atau_jumlah_baru' => '1.50',
                'alasan_perubahan' => 'Pindah ke JUMLAH dengan desimal.',
            ]);
        }, 'berat_atau_jumlah_baru');

        // Reject invalid reason (< 3 chars)
        $this->assertThrowsValidation(function () use ($trx, $petugas, $layananKg2): void {
            $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
                'id_layanan_baru' => $layananKg2->id_layanan,
                'alasan_perubahan' => 'ab',
            ]);
        }, 'alasan_perubahan');

        // Advance to DICUCI -> custom service lacking DICUCI must be rejected
        $this->produksiService->ubahStatusProduksi($trx->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);

        $this->assertThrowsValidation(function () use ($trx, $petugas, $layananCustomNoCuci): void {
            $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
                'id_layanan_baru' => $layananCustomNoCuci->id_layanan,
                'alasan_perubahan' => 'Tahap DICUCI tidak ada di layanan kustom tujuan.',
            ]);
        }, 'id_layanan_baru');

        // Advance to DIKERINGKAN, DISETRIKA, SELESAI -> all must reject 422
        foreach (['DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
            $this->produksiService->ubahStatusProduksi($trx->nomor_nota, $pegawai, ['tahap_status' => $stage]);

            $this->assertThrowsValidation(function () use ($trx, $petugas, $layananKg2): void {
                $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
                    'id_layanan_baru' => $layananKg2->id_layanan,
                    'alasan_perubahan' => 'Sudah lewat tahap batas.',
                ]);
            }, 'id_layanan_baru');
        }

        // Reject DIAMBIL and DIBATALKAN even when stage is DITERIMA
        foreach ([StatusTransaksi::DIAMBIL, StatusTransaksi::DIBATALKAN] as $terminalStatus) {
            $other = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layananKg->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ],
            ]);
            $other->update(['status_transaksi' => $terminalStatus]);

            $this->assertThrowsValidation(function () use ($other, $petugas, $layananKg2): void {
                $this->adjustmentService->ubahLayanan($other->nomor_nota, $petugas, [
                    'id_layanan_baru' => $layananKg2->id_layanan,
                    'alasan_perubahan' => 'Transaksi non-aktif tidak boleh diubah.',
                ]);
            }, 'id_layanan_baru');
        }
    }

    public function test_batalkan_transaksi_at_diterima_cancels_free_releases_active_or_expired_voucher_and_allows_reuse(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 0, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pelanggan = $this->createPelanggan('081290000003');
            $layanan = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true);

            $activeVoucher = Voucher::create([
                'nomor_voucher' => 'REL10K',
                'nilai' => '10000.00',
                'masa_berlaku' => '2026-11-15',
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ]);

            $expiringTodayVoucher = Voucher::create([
                'nomor_voucher' => 'EXPSAME',
                'nilai' => '5000.00',
                'masa_berlaku' => '2026-11-10',
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ]);

            // 3.00 * 10000 - 10000 = 20000.00, DP 12000.00
            $trxActiveVoucher = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'nomor_voucher' => $activeVoucher->nomor_voucher,
                'nominal_dp' => '12000.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Normal'],
                ],
            ]);

            // Reject biaya_pembatalan > 0 on DITERIMA
            $this->assertThrowsValidation(function () use ($trxActiveVoucher, $petugas): void {
                $this->adjustmentService->batalkanTransaksi($trxActiveVoucher->nomor_nota, $petugas, [
                    'alasan_pembatalan' => 'Batal di DITERIMA tidak boleh ada biaya.',
                    'biaya_pembatalan' => '5000.00',
                ]);
            }, 'biaya_pembatalan');

            // Cancel cleanly at DITERIMA
            $cancelled = $this->adjustmentService->batalkanTransaksi($trxActiveVoucher->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Pelanggan membatalkan pesanan sebelum dicuci.',
            ], $petugas->user);

            $this->assertSame(StatusTransaksi::DIBATALKAN, $cancelled->status_transaksi);
            $this->assertSame('0.00', $cancelled->biaya_pembatalan);
            $this->assertSame('0.00', $cancelled->total_harga);
            $this->assertSame(StatusPembayaran::LUNAS, $cancelled->status_pembayaran);
            $this->assertNull($cancelled->nomor_voucher);
            $this->assertSame('0.00', $cancelled->nilai_voucher_snapshot);

            $detail = $this->transaksiService->formatTransaksiDetail($cancelled);
            $this->assertSame('12000.00', $detail['kelebihan_bayar_tunai']);
            $this->assertSame('0.00', $detail['sisa_tagihan']);
            $this->assertFalse($detail['bisa_batalkan']);
            $this->assertFalse($detail['bisa_ubah_layanan']);

            $activeVoucher->refresh();
            $this->assertSame(VoucherStatus::TERSEDIA, $activeVoucher->status_penggunaan);
            $this->assertNull($activeVoucher->digunakan_pada);

            $audit = AuditLog::where('subject_id', $cancelled->nomor_nota)
                ->where('action', 'TRANSAKSI_CANCELLED')
                ->latest('id')
                ->firstOrFail();
            $this->assertSame('REL10K', $audit->payload_before['nomor_voucher'] ?? null);
            $this->assertSame('REL10K', $audit->payload_after['voucher_asal'] ?? null);
            $this->assertTrue($audit->payload_after['voucher_dilepas'] ?? false);
            $this->assertSame(VoucherStatus::TERSEDIA->value, $audit->payload_after['voucher_status_sesudah'] ?? null);

            // CRITICAL: Reuse released voucher in a brand-new transaction without UNIQUE(nomor_voucher) violation
            $reusedTrx = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'nomor_voucher' => 'REL10K',
                'nominal_dp' => '0.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
                ],
            ]);

            $this->assertSame('REL10K', $reusedTrx->nomor_voucher);
            $this->assertSame('10000.00', $reusedTrx->total_harga);
            $activeVoucher->refresh();
            $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $activeVoucher->status_penggunaan);

            // Voucher whose masa_berlaku passed before cancellation becomes KEDALUWARSA when released
            $trxExpiring = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'nomor_voucher' => $expiringTodayVoucher->nomor_voucher,
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ],
            ]);

            Carbon::setTestNow(Carbon::create(2026, 11, 11, 9, 0, 0, 'Asia/Jakarta'));

            $cancelledExpired = $this->adjustmentService->batalkanTransaksi($trxExpiring->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Dibatalkan keesokan harinya saat masih DITERIMA.',
            ], $petugas->user);

            $this->assertNull($cancelledExpired->nomor_voucher);
            $expiringTodayVoucher->refresh();
            $this->assertSame(VoucherStatus::KEDALUWARSA, $expiringTodayVoucher->status_penggunaan);
            $this->assertNull($expiringTodayVoucher->digunakan_pada);

            $this->assertThrowsValidation(function () use ($petugas, $pelanggan, $layanan): void {
                $this->transaksiService->buatTransaksi($petugas, [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'id_layanan' => $layanan->id_layanan,
                    'berat_atau_jumlah' => '2.00',
                    'nomor_voucher' => 'EXPSAME',
                    'detail_pakaian' => [
                        ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                    ],
                ]);
            }, 'nomor_voucher');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_batalkan_transaksi_after_washing_enforces_fee_keeps_voucher_reconciles_payment_and_rejects_terminal_states(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $pelanggan = $this->createPelanggan('081290000004');
        $layanan = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true);
        $layananOdd = $this->createLayanan('Cuci Ganjil', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10001.01', true);

        Voucher::create([
            'nomor_voucher' => 'LOCKED10K',
            'nilai' => '10000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // 1. Stage DICUCI with voucher + LUNAS overpayment case
        // 4.00 * 10000 = 40000 subtotal; - 10000 voucher = 30000 paid full (LUNAS)
        $trxDicuci = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '4.00',
            'nomor_voucher' => 'LOCKED10K',
            'nominal_dp' => '30000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Sprei', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        $this->produksiService->ubahStatusProduksi($trxDicuci->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);

        // Reject free cancellation (0.00) and > subtotal (40000.01)
        $this->assertThrowsValidation(function () use ($trxDicuci, $petugas): void {
            $this->adjustmentService->batalkanTransaksi($trxDicuci->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Mencoba batal gratis setelah dicuci.',
                'biaya_pembatalan' => '0.00',
            ]);
        }, 'biaya_pembatalan');

        $this->assertThrowsValidation(function () use ($trxDicuci, $petugas): void {
            $this->adjustmentService->batalkanTransaksi($trxDicuci->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Biaya melebihi subtotal layanan.',
                'biaya_pembatalan' => '40000.01',
            ]);
        }, 'biaya_pembatalan');

        // Default cancellation fee = 50% of 40000.00 = 20000.00; voucher stays SUDAH_DIGUNAKAN & does NOT reduce penalty
        $cancelledDicuci = $this->adjustmentService->batalkanTransaksi($trxDicuci->nomor_nota, $petugas, [
            'alasan_pembatalan' => 'Pelanggan minta hentikan proses saat dicuci.',
        ], $petugas->user);

        $this->assertSame(StatusTransaksi::DIBATALKAN, $cancelledDicuci->status_transaksi);
        $this->assertSame('LOCKED10K', $cancelledDicuci->nomor_voucher);
        $this->assertSame('10000.00', $cancelledDicuci->nilai_voucher_snapshot);
        $this->assertSame('20000.00', $cancelledDicuci->biaya_pembatalan);
        $this->assertSame('20000.00', $cancelledDicuci->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $cancelledDicuci->status_pembayaran);

        $detailDicuci = $this->transaksiService->formatTransaksiDetail($cancelledDicuci);
        $this->assertSame('10000.00', $detailDicuci['kelebihan_bayar_tunai']);
        $this->assertSame('0.00', $detailDicuci['sisa_tagihan']);
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, Voucher::findOrFail('LOCKED10K')->status_penggunaan);

        // 2. Stage DIKERINGKAN with custom biaya_pembatalan, total_kompensasi deduction, and DP staying DP
        // 3.00 * 10000 = 30000 subtotal; DP = 5000.00; existing total_kompensasi = 4000.00
        $trxDikeringkan = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '3.00',
            'nominal_dp' => '5000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Selimut', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Normal'],
            ],
        ]);
        $trxDikeringkan->update(['total_kompensasi' => '4000.00', 'total_harga' => '26000.00']);
        $this->produksiService->ubahStatusProduksi($trxDikeringkan->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);
        $this->produksiService->ubahStatusProduksi($trxDikeringkan->nomor_nota, $pegawai, ['tahap_status' => 'DIKERINGKAN']);

        // Override biaya_pembatalan = 12000.00 -> total_harga = max(0, 12000 - 4000) = 8000.00 (> 5000 DP -> DP)
        $cancelledDikeringkan = $this->adjustmentService->batalkanTransaksi($trxDikeringkan->nomor_nota, $petugas, [
            'alasan_pembatalan' => 'Batal di tahap pengeringan dengan biaya disepakati.',
            'biaya_pembatalan' => '12000.00',
        ], $petugas->user);

        $this->assertSame('12000.00', $cancelledDikeringkan->biaya_pembatalan);
        $this->assertSame('8000.00', $cancelledDikeringkan->total_harga);
        $this->assertSame(StatusPembayaran::DP, $cancelledDikeringkan->status_pembayaran);

        // 3. Stage DISETRIKA with half-up 50% rounding and DP -> LUNAS
        // 1.00 * 10001.01 = 10001.01 -> 50% half-up = 5000.51; paid 6000.00 -> LUNAS
        $trxDisetrika = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananOdd->id_layanan,
            'berat_atau_jumlah' => '1.00',
            'nominal_dp' => '6000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Jas', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA'] as $stage) {
            $this->produksiService->ubahStatusProduksi($trxDisetrika->nomor_nota, $pegawai, ['tahap_status' => $stage]);
        }

        $cancelledDisetrika = $this->adjustmentService->batalkanTransaksi($trxDisetrika->nomor_nota, $petugas, [
            'alasan_pembatalan' => 'Batal di tahap penyetrikaan.',
        ], $petugas->user);

        $this->assertSame('5000.51', $cancelledDisetrika->biaya_pembatalan);
        $this->assertSame('5000.51', $cancelledDisetrika->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $cancelledDisetrika->status_pembayaran);
        $this->assertSame('999.49', $this->transaksiService->formatTransaksiDetail($cancelledDisetrika)['kelebihan_bayar_tunai']);

        // 4. Reject cancelling SELESAI, DIAMBIL, and already DIBATALKAN
        $this->assertThrowsValidation(function () use ($cancelledDisetrika, $petugas): void {
            $this->adjustmentService->batalkanTransaksi($cancelledDisetrika->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Tidak boleh batal dua kali.',
            ]);
        }, 'alasan_pembatalan');

        $trxSelesai = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '1.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
            $this->produksiService->ubahStatusProduksi($trxSelesai->nomor_nota, $pegawai, ['tahap_status' => $stage]);
        }

        $this->assertThrowsValidation(function () use ($trxSelesai, $petugas): void {
            $this->adjustmentService->batalkanTransaksi($trxSelesai->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Sudah SELESAI.',
            ]);
        }, 'alasan_pembatalan');

        $trxSelesai->update([
            'status_transaksi' => StatusTransaksi::DIAMBIL,
            'diambil_pada' => now('Asia/Jakarta'),
        ]);
        $this->assertThrowsValidation(function () use ($trxSelesai, $petugas): void {
            $this->adjustmentService->batalkanTransaksi($trxSelesai->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Sudah DIAMBIL.',
            ]);
        }, 'alasan_pembatalan');

        // 5. Boundary: override biaya_pembatalan == subtotal_layanan, total_kompensasi > biaya_pembatalan clamps total_harga = 0.00, and null $actor fallback
        $trxBoundary = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Selimut', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        $trxBoundary->update(['total_kompensasi' => '25000.00', 'total_harga' => '0.00']);
        $this->produksiService->ubahStatusProduksi($trxBoundary->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);

        $cancelledBoundary = $this->adjustmentService->batalkanTransaksi($trxBoundary->nomor_nota, $petugas, [
            'alasan_pembatalan' => 'Batal dengan biaya maksimal sama dengan subtotal.',
            'biaya_pembatalan' => '20000.00',
        ]);

        $this->assertSame('20000.00', $cancelledBoundary->biaya_pembatalan);
        $this->assertSame('0.00', $cancelledBoundary->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $cancelledBoundary->status_pembayaran);

        $fallbackAudit = AuditLog::where('subject_id', $trxBoundary->nomor_nota)
            ->where('action', 'TRANSAKSI_CANCELLED')
            ->firstOrFail();
        $this->assertSame($petugas->user_id, $fallbackAudit->user_id);
        $this->assertSame(UserRole::PETUGAS->value, $fallbackAudit->actor_role);
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
