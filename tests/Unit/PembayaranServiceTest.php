<?php

namespace Tests\Unit;

use App\Enums\JenisBayar;
use App\Enums\JenisInsiden;
use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Models\User;
use App\Services\JenisLayananService;
use App\Services\KompensasiService;
use App\Services\PembayaranService;
use App\Services\ProduksiService;
use App\Services\SerahTerimaService;
use App\Services\TransaksiAdjustmentService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PembayaranServiceTest extends TestCase
{
    use RefreshDatabase;

    private PembayaranService $pembayaranService;

    private TransaksiService $transaksiService;

    private ProduksiService $produksiService;

    private TransaksiAdjustmentService $adjustmentService;

    private KompensasiService $kompensasiService;

    private SerahTerimaService $serahTerimaService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pembayaranService = app(PembayaranService::class);
        $this->transaksiService = app(TransaksiService::class);
        $this->produksiService = app(ProduksiService::class);
        $this->adjustmentService = app(TransaksiAdjustmentService::class);
        $this->kompensasiService = app(KompensasiService::class);
        $this->serahTerimaService = app(SerahTerimaService::class);
    }

    private function createPetugas(string $nama = 'Kasir Rina'): Petugas
    {
        $user = User::factory()->petugas()->create(['name' => $nama]);

        return Petugas::create([
            'user_id' => $user->id,
            'nama_petugas' => $nama,
        ]);
    }

    private function createPegawai(string $nama = 'Pegawai Budi'): Pegawai
    {
        $user = User::factory()->pegawai()->create(['name' => $nama]);

        return Pegawai::create([
            'user_id' => $user->id,
            'nama_pegawai' => $nama,
        ]);
    }

    private function createPelanggan(string $nama = 'Ibu Ani', string $phone = '0811111111', bool $bolehBayarAkhir = false): Pelanggan
    {
        return Pelanggan::create([
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Kaliurang KM 5',
            'boleh_bayar_akhir' => $bolehBayarAkhir,
        ]);
    }

    private function createLayanan(
        string $nama = 'Cuci Setrika',
        string $harga = '10000.00',
        MetodeHitung $metode = MetodeHitung::BERAT,
        SatuanLayanan $satuan = SatuanLayanan::KG,
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

    private function advanceToSelesai(Transaksi $trx, Pegawai $pegawai): Transaksi
    {
        foreach ([
            TahapProduksi::DICUCI->value,
            TahapProduksi::DIKERINGKAN->value,
            TahapProduksi::DISETRIKA->value,
            TahapProduksi::SELESAI->value,
        ] as $tahap) {
            $trx = $this->produksiService->ubahStatusProduksi($trx->nomor_nota, $pegawai, [
                'tahap_status' => $tahap,
            ]);
        }

        return $trx;
    }

    public function test_catat_pelunasan_full_and_partial_on_aktif_and_selesai_records_ledger_and_audit(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 14, 30, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pegawai = $this->createPegawai();
            $pelanggan = $this->createPelanggan();
            $layanan = $this->createLayanan('Cuci Setrika', '10000.00');

            // 2.50 kg * 10000 = 25000.00; DP 5000.00 -> sisa 20000.00
            $trx = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.50',
                'nominal_dp' => '5000.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 4, 'kondisi_pakaian' => 'Baik'],
                ],
            ]);

            // Partial payment while AKTIF -> status remains DP
            $partial = $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, [
                'nominal_bayar' => '7500.33',
            ], $petugas->user);

            $this->assertSame(JenisBayar::PELUNASAN, $partial->jenis_bayar);
            $this->assertSame('7500.33', (string) $partial->nominal_bayar);
            $this->assertSame('2026-11-10 14:30:00', $partial->tanggal_bayar->timezone('Asia/Jakarta')->format('Y-m-d H:i:s'));

            $trx->refresh();
            $this->assertSame(StatusPembayaran::DP, $trx->status_pembayaran);

            // Advance to SELESAI and pay remaining 12499.67 -> LUNAS
            $trx = $this->advanceToSelesai($trx, $pegawai);
            $final = $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, [
                'nominal_bayar' => '12499.67',
            ], $petugas->user);

            $this->assertSame(JenisBayar::PELUNASAN, $final->jenis_bayar);
            $trx->refresh();
            $this->assertSame(StatusPembayaran::LUNAS, $trx->status_pembayaran);
            $this->assertSame('25000.00', $this->pembayaranService->hitungTotalDibayar($trx));

            $audit = AuditLog::query()
                ->where('subject_type', Transaksi::class)
                ->where('subject_id', $trx->nomor_nota)
                ->where('action', 'PELUNASAN_RECORDED')
                ->latest('id')
                ->first();

            $this->assertNotNull($audit);
            $this->assertSame(UserRole::PETUGAS->value, $audit->actor_role);
            $this->assertSame('12499.67', $audit->payload_after['nominal_bayar']);
            $this->assertSame('25000.00', $audit->payload_after['total_dibayar']);
            $this->assertSame('0.00', $audit->payload_after['sisa_tagihan']);
            $this->assertSame(StatusPembayaran::LUNAS->value, $audit->payload_after['status_pembayaran']);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_catat_pelunasan_supports_diambil_piutang_and_dibatalkan_with_cancellation_fee(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $paylater = $this->createPelanggan('Hotel Mawar', '0812222222', true);
        $reguler = $this->createPelanggan('Pak Budi', '0813333333', false);
        $layanan = $this->createLayanan('Cuci Lipat', '10000.00');

        // 1. Piutang DIAMBIL (BELUM_LUNAS) -> partial keeps BELUM_LUNAS, full sets LUNAS
        $trxPiutang = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $paylater->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '3.00', // 30000
            'nominal_dp' => '10000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Sprei', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        $trxPiutang = $this->advanceToSelesai($trxPiutang, $pegawai);
        $trxPiutang = $this->serahTerimaService->serahkanPakaian($trxPiutang->nomor_nota, $petugas, 'Ambil dulu', $petugas->user);
        $this->assertSame(StatusTransaksi::DIAMBIL, $trxPiutang->status_transaksi);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxPiutang->status_pembayaran);

        // Partial settlement on DIAMBIL piutang keeps BELUM_LUNAS (not DP)
        $this->pembayaranService->catatPelunasan($trxPiutang->nomor_nota, $petugas, [
            'nominal_bayar' => '5000.00',
        ]);
        $trxPiutang->refresh();
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxPiutang->status_pembayaran);

        // Full settlement on DIAMBIL piutang moves to LUNAS
        $this->pembayaranService->catatPelunasan($trxPiutang->nomor_nota, $petugas, [
            'nominal_bayar' => '15000.00',
        ]);
        $trxPiutang->refresh();
        $this->assertSame(StatusPembayaran::LUNAS, $trxPiutang->status_pembayaran);

        // 2. DIBATALKAN pasca DICUCI (KK-08): 3.00 * 10000 = 30000 -> 50% biaya_pembatalan = 15000, DP 5000 -> sisa 10000
        $trxBatal = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $reguler->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '3.00',
            'nominal_dp' => '5000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        $this->produksiService->ubahStatusProduksi($trxBatal->nomor_nota, $pegawai, [
            'tahap_status' => TahapProduksi::DICUCI->value,
        ]);
        $trxBatal = $this->adjustmentService->batalkanTransaksi($trxBatal->nomor_nota, $petugas, [
            'alasan_pembatalan' => 'Pelanggan minta batal saat cuci',
            'biaya_pembatalan' => '15000.00',
        ], $petugas->user);
        $this->assertSame(StatusTransaksi::DIBATALKAN, $trxBatal->status_transaksi);
        $this->assertSame(StatusPembayaran::DP, $trxBatal->status_pembayaran);

        $this->pembayaranService->catatPelunasan($trxBatal->nomor_nota, $petugas, [
            'nominal_bayar' => '10000.00',
        ]);
        $trxBatal->refresh();
        $this->assertSame(StatusPembayaran::LUNAS, $trxBatal->status_pembayaran);
    }

    public function test_catat_pelunasan_rejects_zero_negative_overpayment_and_already_paid_including_free_cancelled(): void
    {
        $petugas = $this->createPetugas();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan('Cuci Setrika', '10000.00');

        // Unpaid nota 20000
        $trx = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nominal_dp' => '5000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        // Zero
        try {
            $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '0.00']);
            $this->fail('Expected ValidationException for zero amount.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nominal_bayar', $e->errors());
        }

        // Negative
        try {
            $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '-1000.00']);
            $this->fail('Expected ValidationException for negative amount.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nominal_bayar', $e->errors());
        }

        // Overpayment (sisa = 15000)
        try {
            $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '15000.01']);
            $this->fail('Expected ValidationException for overpayment.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nominal_bayar', $e->errors());
            $this->assertStringContainsString('Rp 15.000', $e->errors()['nominal_bayar'][0]);
        }

        // Pay full -> subsequent attempt rejected
        $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '15000.00']);
        try {
            $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '100.00']);
            $this->fail('Expected ValidationException for already paid nota.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nominal_bayar', $e->errors());
        }

        // Free DIBATALKAN at DITERIMA (total_harga = 0.00) -> rejected 422
        $trxGratis = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '1.00',
            'nominal_dp' => '0.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Baju', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        $this->adjustmentService->batalkanTransaksi($trxGratis->nomor_nota, $petugas, [
            'alasan_pembatalan' => 'Batal sebelum cuci',
        ]);

        try {
            $this->pembayaranService->catatPelunasan($trxGratis->nomor_nota, $petugas, ['nominal_bayar' => '1000.00']);
            $this->fail('Expected ValidationException for zero-balance cancelled nota.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nominal_bayar', $e->errors());
        }
    }

    public function test_update_status_lunas_and_post_adjustment_balances_kk01_kk02_kk04_kk09(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $pelanggan = $this->createPelanggan();
        $layananKg = $this->createLayanan('Cuci Setrika', '10000.00');
        $layananPcs = $this->createLayanan('Jas Satuan', '25000.00', MetodeHitung::JUMLAH, SatuanLayanan::PCS);

        // 1. KK-01 (timbangUlang) + KK-09 (master tariff change): 2.00 kg * 10000 = 20000 paid LUNAS
        $trx = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananKg->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nominal_dp' => '20000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        // Change master price -> must NOT affect snapshot (KK-09)
        app(JenisLayananService::class)->update($layananKg, [
            'nama_layanan' => $layananKg->nama_layanan,
            'tingkat_kecepatan' => $layananKg->tingkat_kecepatan->value,
            'metode_hitung' => $layananKg->metode_hitung->value,
            'satuan' => $layananKg->satuan->value,
            'harga_satuan' => '50000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);

        // Reweigh to 3.00 kg -> total becomes 30000.00 (using snapshot 10000), status drops LUNAS -> BELUM_LUNAS
        $trx = $this->produksiService->timbangUlang($trx->nomor_nota, $pegawai, ['berat_aktual' => '3.00']);
        $this->assertSame('30000.00', (string) $trx->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trx->status_pembayaran);

        // Partial pay 4000.00 -> BELUM_LUNAS preserved via updateStatusLunas()
        $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '4000.00']);
        $trx->refresh();
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trx->status_pembayaran);

        // KK-02 ubahLayanan to Jas Satuan (2 pcs * 25000 = 50000.00)
        $trx = $this->adjustmentService->ubahLayanan($trx->nomor_nota, $petugas, [
            'id_layanan_baru' => $layananPcs->id_layanan,
            'berat_atau_jumlah_baru' => '2',
            'alasan_perubahan' => 'Pelanggan minta cuci jas satuan',
        ]);
        $this->assertSame('50000.00', (string) $trx->total_harga);

        // KK-04 incident RUSAK on 1 DetailPakaian -> confirm compensation 10000.00
        $detail = DetailPakaian::where('nomor_nota', $trx->nomor_nota)->firstOrFail();
        $laporan = $this->kompensasiService->laporInsiden($pegawai->user, [
            'nomor_nota' => $trx->nomor_nota,
            'id_detail' => $detail->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Kancing lepas',
        ]);
        $this->kompensasiService->konfirmasiKompensasi($petugas, $laporan, [
            'nilai_kompensasi' => '10000.00',
        ]);

        $trx->refresh();
        // total_harga = 50000 - 10000 = 40000; already paid = 24000 -> remaining = 16000
        $this->assertSame('40000.00', (string) $trx->total_harga);

        // Overpaying 16000.01 fails; paying exact 16000.00 succeeds -> LUNAS
        try {
            $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '16000.01']);
            $this->fail('Expected ValidationException on post-adjustment overpayment.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('nominal_bayar', $e->errors());
        }

        $this->pembayaranService->catatPelunasan($trx->nomor_nota, $petugas, ['nominal_bayar' => '16000.00']);
        $trx->refresh();
        $this->assertSame(StatusPembayaran::LUNAS, $trx->status_pembayaran);

        // Direct unit assertions on updateStatusLunas()
        $memTrx = new Transaksi(['total_harga' => '50000.00', 'status_transaksi' => StatusTransaksi::AKTIF, 'status_pembayaran' => StatusPembayaran::BELUM_BAYAR]);
        $this->assertSame(StatusPembayaran::DP, $this->pembayaranService->updateStatusLunas($memTrx, '10000.00'));

        $memTrx->status_pembayaran = StatusPembayaran::LUNAS;
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $this->pembayaranService->updateStatusLunas($memTrx, '49999.99'));

        $memTrx->status_transaksi = StatusTransaksi::DIAMBIL;
        $memTrx->status_pembayaran = StatusPembayaran::DP;
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $this->pembayaranService->updateStatusLunas($memTrx, '10000.00'));
        $this->assertSame(StatusPembayaran::LUNAS, $this->pembayaranService->updateStatusLunas($memTrx, '50000.00'));
    }
}
