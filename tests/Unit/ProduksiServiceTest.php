<?php

namespace Tests\Unit;

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
use App\Models\User;
use App\Models\Voucher;
use App\Services\JenisLayananService;
use App\Services\PembayaranService;
use App\Services\ProduksiService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProduksiServiceTest extends TestCase
{
    use RefreshDatabase;

    private TransaksiService $transaksiService;

    private ProduksiService $produksiService;

    private PembayaranService $pembayaranService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->transaksiService = app(TransaksiService::class);
        $this->produksiService = app(ProduksiService::class);
        $this->pembayaranService = app(PembayaranService::class);
    }

    private function createPetugas(): Petugas
    {
        $user = User::factory()->petugas()->create();

        return Petugas::create([
            'user_id' => $user->id,
            'nama_petugas' => $user->name,
        ]);
    }

    private function createPegawai(string $nama = 'Bambang Produksi'): Pegawai
    {
        $user = User::factory()->pegawai()->create(['name' => $nama]);

        return Pegawai::create([
            'user_id' => $user->id,
            'nama_pegawai' => $nama,
        ]);
    }

    private function createPelanggan(string $phone = '081200000001'): Pelanggan
    {
        return Pelanggan::create([
            'nama' => 'Pelanggan Uji',
            'no_telepon' => $phone,
            'alamat' => 'Jl. Kaliurang No. 1',
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

    public function test_pembayaran_service_resolves_adjusted_payment_statuses_accurately(): void
    {
        // KK-01 / KK-02: LUNAS -> BELUM_LUNAS when tagihan rises above total_dibayar (> 0)
        $this->assertSame(
            StatusPembayaran::BELUM_LUNAS,
            $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                StatusPembayaran::LUNAS,
                '25000.00',
                '20000.00'
            )
        );

        // Remains BELUM_LUNAS if still underpaid
        $this->assertSame(
            StatusPembayaran::BELUM_LUNAS,
            $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                StatusPembayaran::BELUM_LUNAS,
                '22000.00',
                '20000.00'
            )
        );

        // DP remains DP if still > total_dibayar
        $this->assertSame(
            StatusPembayaran::DP,
            $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                StatusPembayaran::DP,
                '22000.00',
                '10000.00'
            )
        );

        // DP -> LUNAS when total_harga drops <= total_dibayar
        $this->assertSame(
            StatusPembayaran::LUNAS,
            $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                StatusPembayaran::DP,
                '10000.00',
                '10000.00'
            )
        );
        $this->assertSame(
            StatusPembayaran::LUNAS,
            $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                StatusPembayaran::DP,
                '8000.00',
                '10000.00'
            )
        );

        // Zero paid & positive tagihan -> BELUM_BAYAR
        $this->assertSame(
            StatusPembayaran::BELUM_BAYAR,
            $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                StatusPembayaran::LUNAS,
                '10000.00',
                '0.00'
            )
        );

        // Zero tagihan -> LUNAS even with zero paid
        $this->assertSame(
            StatusPembayaran::LUNAS,
            $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                StatusPembayaran::BELUM_BAYAR,
                '0.00',
                '0.00'
            )
        );
    }

    public function test_timbang_ulang_updates_weight_preserves_kk09_snapshot_adjusts_payment_status_and_logs_audit(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan(harga: '10000.00');

        Voucher::create([
            'nomor_voucher' => 'POT5K',
            'nilai' => '5000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(7)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // 2.00 kg * 10000 - 5000 voucher = 15000.00, paid 15000.00 -> LUNAS
        $transaksiLunas = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nomor_voucher' => 'POT5K',
            'nominal_dp' => '15000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 4, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        // Change master service price AFTER receipt (KK-09 must stay immune)
        $layanan->update(['harga_satuan' => '18000.00']);

        // Re-weigh heavier: 3.50 kg * 10000 snapshot - 5000 = 30000.00 (> 15000 paid -> BELUM_LUNAS)
        $updated = $this->produksiService->timbangUlang($transaksiLunas->nomor_nota, $pegawai, [
            'berat_aktual' => '3.50',
            'catatan' => 'Pakaian basah lebih berat.',
        ], $pegawai->user);

        $this->assertSame('3.50', $updated->berat_atau_jumlah);
        $this->assertSame('10000.00', $updated->harga_satuan_snapshot);
        $this->assertSame('30000.00', $updated->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $updated->status_pembayaran);
        $this->assertSame('15000.00', $this->pembayaranService->hitungTotalDibayar($updated));

        $audit = AuditLog::where('subject_id', $transaksiLunas->nomor_nota)
            ->where('action', 'TIMBANG_ULANG')
            ->latest('id')
            ->firstOrFail();

        $this->assertSame(UserRole::PEGAWAI->value, $audit->actor_role);
        $this->assertSame('2.00', $audit->payload_before['berat_atau_jumlah'] ?? null);
        $this->assertSame('3.50', $audit->payload_after['berat_atau_jumlah'] ?? null);
        $this->assertTrue($audit->payload_after['weight_changed'] ?? false);

        // Re-weigh same weight -> weight_changed = false
        $sameWeight = $this->produksiService->timbangUlang($transaksiLunas->nomor_nota, $pegawai, [
            'berat_aktual' => '3.50',
        ], $pegawai->user);
        $this->assertSame('30000.00', $sameWeight->total_harga);

        $sameWeightAudit = AuditLog::where('subject_id', $transaksiLunas->nomor_nota)
            ->where('action', 'TIMBANG_ULANG')
            ->latest('id')
            ->firstOrFail();
        $this->assertFalse($sameWeightAudit->payload_after['weight_changed'] ?? true);

        // DP -> LUNAS when weight decreases
        $transaksiDp = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '3.00',
            'nominal_dp' => '20000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Normal'],
            ],
        ]);
        // snapshot is 18000.00, 3.00 * 18000 = 54000.00 -> DP 20000.00
        // Re-weigh to 1.00 kg -> 18000.00 <= 20000.00 paid -> LUNAS
        $upgradedToLunas = $this->produksiService->timbangUlang($transaksiDp->nomor_nota, $pegawai, [
            'berat_aktual' => '1.00',
        ]);

        $this->assertSame('18000.00', $upgradedToLunas->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $upgradedToLunas->status_pembayaran);

        $detail = $this->transaksiService->formatTransaksiDetail($upgradedToLunas);
        $this->assertSame('2000.00', $detail['kelebihan_bayar_tunai']);
        $this->assertSame('0.00', $detail['sisa_tagihan']);

        // Existing total_kompensasi is also deducted upon timbangUlang
        $transaksiKompensasi = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Selimut', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Normal'],
            ],
        ]);
        $transaksiKompensasi->update(['total_kompensasi' => '10000.00', 'total_harga' => '26000.00']);

        $reweighedWithComp = $this->produksiService->timbangUlang($transaksiKompensasi->nomor_nota, $pegawai, [
            'berat_aktual' => '2.50',
        ]);
        // 2.50 * 18000 = 45000 - 10000 kompensasi = 35000.00
        $this->assertSame('35000.00', $reweighedWithComp->total_harga);
    }

    public function test_timbang_ulang_rejects_jumlah_services_and_non_diterima_or_non_active_transactions(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $pelanggan = $this->createPelanggan('081200000002');
        $layananPcs = $this->createLayanan(
            nama: 'Cuci Sepatu',
            metode: MetodeHitung::JUMLAH,
            satuan: SatuanLayanan::PCS,
            harga: '25000.00',
            perluSetrika: false
        );
        $layananKg = $this->createLayanan(
            nama: 'Cuci Kering Lipat',
            metode: MetodeHitung::BERAT,
            satuan: SatuanLayanan::KG,
            harga: '7000.00',
            perluSetrika: false
        );

        $transaksiPcs = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananPcs->id_layanan,
            'berat_atau_jumlah' => '2',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Sneakers', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Kotor'],
            ],
        ]);

        try {
            $this->produksiService->timbangUlang($transaksiPcs->nomor_nota, $pegawai, ['berat_aktual' => '3.00']);
            $this->fail('Expected ValidationException for JUMLAH service.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('berat_aktual', $exception->errors());
        }

        $transaksiKg = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananKg->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 5, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        // Advance to DICUCI -> timbangUlang must reject
        $this->produksiService->ubahStatusProduksi($transaksiKg->nomor_nota, $pegawai, [
            'tahap_status' => TahapProduksi::DICUCI->value,
        ]);

        try {
            $this->produksiService->timbangUlang($transaksiKg->nomor_nota, $pegawai, ['berat_aktual' => '2.50']);
            $this->fail('Expected ValidationException when transaction already in DICUCI.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('berat_aktual', $exception->errors());
        }

        // Cancelled transaction -> timbangUlang must reject even at DITERIMA
        $transaksiBatal = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layananKg->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        $transaksiBatal->update(['status_transaksi' => StatusTransaksi::DIBATALKAN]);

        $this->expectException(ValidationException::class);
        $this->produksiService->timbangUlang($transaksiBatal->nomor_nota, $pegawai, ['berat_aktual' => '2.50']);
    }

    public function test_ubah_status_produksi_enforces_state_machine_for_perlu_setrika_true_and_false(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 14, 30, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pegawai = $this->createPegawai();
            $pelanggan = $this->createPelanggan('081200000003');

            $layananSetrika = $this->createLayanan(nama: 'Cuci Setrika', perluSetrika: true);
            $layananSepatu = $this->createLayanan(
                nama: 'Cuci Sepatu',
                metode: MetodeHitung::JUMLAH,
                satuan: SatuanLayanan::PCS,
                harga: '30000.00',
                perluSetrika: false
            );

            $notaSetrika = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layananSetrika->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
                ],
            ]);

            // Skipping DITERIMA -> DIKERINGKAN rejected
            try {
                $this->produksiService->ubahStatusProduksi($notaSetrika->nomor_nota, $pegawai, [
                    'tahap_status' => TahapProduksi::DIKERINGKAN->value,
                ]);
                $this->fail('Expected ValidationException when skipping DICUCI.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('tahap_status', $exception->errors());
            }

            foreach ([
                TahapProduksi::DICUCI,
                TahapProduksi::DIKERINGKAN,
                TahapProduksi::DISETRIKA,
                TahapProduksi::SELESAI,
            ] as $stage) {
                $notaSetrika = $this->produksiService->ubahStatusProduksi($notaSetrika->nomor_nota, $pegawai, [
                    'tahap_status' => $stage->value,
                    'catatan' => "Masuk {$stage->value}",
                ]);
            }

            $this->assertSame(StatusTransaksi::SELESAI, $notaSetrika->status_transaksi);
            $this->assertCount(5, $notaSetrika->riwayatStatusProduksi);
            $lastHistory = $notaSetrika->riwayatStatusProduksi->last();
            $this->assertNotNull($lastHistory);
            $this->assertSame($pegawai->id_pegawai, $lastHistory->id_pegawai);
            $this->assertSame('Asia/Jakarta', $lastHistory->waktu_update->timezoneName);

            // Cannot update once SELESAI
            try {
                $this->produksiService->ubahStatusProduksi($notaSetrika->nomor_nota, $pegawai, [
                    'tahap_status' => TahapProduksi::DISETRIKA->value,
                ]);
                $this->fail('Expected ValidationException for SELESAI transaction.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('tahap_status', $exception->errors());
            }

            // Non-setrika service skips DISETRIKA and rejects DISETRIKA
            $notaSepatu = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layananSepatu->id_layanan,
                'berat_atau_jumlah' => '1',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Boots', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Normal'],
                ],
            ]);

            $this->produksiService->ubahStatusProduksi($notaSepatu->nomor_nota, $pegawai, [
                'tahap_status' => TahapProduksi::DICUCI->value,
            ]);
            $this->produksiService->ubahStatusProduksi($notaSepatu->nomor_nota, $pegawai, [
                'tahap_status' => TahapProduksi::DIKERINGKAN->value,
            ]);

            // Repeating DIKERINGKAN or moving backward to DICUCI rejected
            foreach ([TahapProduksi::DIKERINGKAN, TahapProduksi::DICUCI, TahapProduksi::DISETRIKA] as $illegalStage) {
                try {
                    $this->produksiService->ubahStatusProduksi($notaSepatu->nomor_nota, $pegawai, [
                        'tahap_status' => $illegalStage->value,
                    ]);
                    $this->fail("Expected ValidationException for illegal stage [{$illegalStage->value}].");
                } catch (ValidationException $exception) {
                    $this->assertArrayHasKey('tahap_status', $exception->errors());
                }
            }

            $notaSepatuDone = $this->produksiService->ubahStatusProduksi($notaSepatu->nomor_nota, $pegawai, [
                'tahap_status' => TahapProduksi::SELESAI->value,
            ]);

            $this->assertSame(StatusTransaksi::SELESAI, $notaSepatuDone->status_transaksi);
            $this->assertSame(
                ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'],
                $notaSepatuDone->riwayatStatusProduksi->map(fn ($r) => $r->tahap_status->value)->all()
            );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_transaksi_service_formats_phase2_derived_fields_and_incident_relations(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai('Sari Produksi');
        $pelanggan = $this->createPelanggan('081200000004');
        $layanan = $this->createLayanan(harga: '10000.00', perluSetrika: false);

        // 2.50 kg * 10000 = 25000.00, 2 detail items (total 5 potong), paid 10000.00 (DP)
        $transaksi = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.50',
            'nominal_dp' => '10000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        $detailAtDiterima = $this->transaksiService->formatTransaksiDetail($transaksi);
        $this->assertSame('0.00', $detailAtDiterima['kelebihan_bayar_tunai']);
        $this->assertSame('0.00', $detailAtDiterima['total_kelebihan_ganti_rugi']);
        $this->assertSame('0.00', $detailAtDiterima['total_pengembalian_pelanggan']);
        $this->assertSame('DITERIMA', $detailAtDiterima['tahap_produksi_terakhir']);
        $this->assertSame('DICUCI', $detailAtDiterima['tahap_produksi_berikutnya']);
        $this->assertTrue($detailAtDiterima['bisa_timbang_ulang']);
        $this->assertTrue($detailAtDiterima['bisa_ubah_layanan']);
        $this->assertTrue($detailAtDiterima['bisa_batalkan']);
        $this->assertFalse($detailAtDiterima['perlu_biaya_pembatalan']);
        $this->assertSame('0.00', $detailAtDiterima['estimasi_biaya_pembatalan']);
        $this->assertSame(0, $detailAtDiterima['insiden_pending_count']);
        $this->assertSame([], $detailAtDiterima['laporan_insiden']);
        $this->assertNull($detailAtDiterima['riwayat_status_produksi'][0]['pegawai']);

        // Advance to DICUCI and DIKERINGKAN, plus attach 1 pending & 1 confirmed incident
        $this->produksiService->ubahStatusProduksi($transaksi->nomor_nota, $pegawai, [
            'tahap_status' => TahapProduksi::DICUCI->value,
        ]);
        $this->produksiService->ubahStatusProduksi($transaksi->nomor_nota, $pegawai, [
            'tahap_status' => TahapProduksi::DIKERINGKAN->value,
        ]);

        $firstDetail = $transaksi->detailPakaian()->orderBy('id_detail')->firstOrFail();
        $secondDetail = $transaksi->detailPakaian()->orderByDesc('id_detail')->firstOrFail();

        // Pending incident reported by Pegawai on item 1 (2/5 of 25000 = 10000, RUSAK 5x = 50000.00 estimate)
        LaporanKerusakanKehilangan::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_detail' => $firstDetail->id_detail,
            'id_petugas' => null,
            'id_pegawai_pelapor' => $pegawai->id_pegawai,
            'jenis_insiden' => JenisInsiden::RUSAK,
            'keterangan' => 'Kancing lepas saat pengeringan',
            'nilai_kompensasi' => '0.00',
            'kelebihan_ganti_rugi' => '0.00',
        ]);

        // Confirmed incident on item 2 (3/5 of 25000 = 15000, HILANG 10x = 150000.00 estimate)
        LaporanKerusakanKehilangan::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_detail' => $secondDetail->id_detail,
            'id_petugas' => $petugas->id_petugas,
            'id_pegawai_pelapor' => $pegawai->id_pegawai,
            'jenis_insiden' => JenisInsiden::HILANG,
            'keterangan' => 'Satu kaos hilang',
            'nilai_kompensasi' => '20000.00',
            'kelebihan_ganti_rugi' => '5000.00',
        ]);

        $fresh = $this->transaksiService->findForDetail($transaksi->nomor_nota);
        $formatted = $this->transaksiService->formatTransaksiDetail($fresh);

        $this->assertSame('DIKERINGKAN', $formatted['tahap_produksi_terakhir']);
        $this->assertSame('SELESAI', $formatted['tahap_produksi_berikutnya']);
        $this->assertFalse($formatted['bisa_timbang_ulang']);
        $this->assertFalse($formatted['bisa_ubah_layanan']);
        $this->assertTrue($formatted['bisa_batalkan']);
        $this->assertTrue($formatted['perlu_biaya_pembatalan']);
        $this->assertSame('12500.00', $formatted['estimasi_biaya_pembatalan']);
        $this->assertSame('0.00', $formatted['kelebihan_bayar_tunai']);
        $this->assertSame('5000.00', $formatted['total_kelebihan_ganti_rugi']);
        $this->assertSame('5000.00', $formatted['total_pengembalian_pelanggan']);
        $this->assertSame(1, $formatted['insiden_pending_count']);
        $this->assertCount(2, $formatted['laporan_insiden']);
        $this->assertSame('MENUNGGU_KONFIRMASI', $formatted['laporan_insiden'][0]['status_konfirmasi']);
        $this->assertSame('50000.00', $formatted['laporan_insiden'][0]['estimasi_kompensasi']);
        $this->assertSame('Sari Produksi', $formatted['laporan_insiden'][0]['pegawai_pelapor']['nama_pegawai']);
        $this->assertNull($formatted['laporan_insiden'][0]['petugas']);
        $this->assertSame('TERKONFIRMASI', $formatted['laporan_insiden'][1]['status_konfirmasi']);
        $this->assertSame('150000.00', $formatted['laporan_insiden'][1]['estimasi_kompensasi']);
        $this->assertSame($petugas->nama_petugas, $formatted['laporan_insiden'][1]['petugas']['nama_petugas']);
        $this->assertSame('Sari Produksi', $formatted['riwayat_status_produksi'][1]['pegawai']['nama_pegawai']);
    }
}
