<?php

namespace Tests\Unit;

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
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Pengantaran;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Services\JenisLayananService;
use App\Services\KompensasiService;
use App\Services\PembayaranService;
use App\Services\PengantaranService;
use App\Services\ProduksiService;
use App\Services\SerahTerimaService;
use App\Services\TransaksiAdjustmentService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SerahTerimaServiceTest extends TestCase
{
    use RefreshDatabase;

    private SerahTerimaService $serahTerimaService;

    private TransaksiService $transaksiService;

    private ProduksiService $produksiService;

    private PengantaranService $pengantaranService;

    private PembayaranService $pembayaranService;

    private TransaksiAdjustmentService $adjustmentService;

    private KompensasiService $kompensasiService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->serahTerimaService = app(SerahTerimaService::class);
        $this->transaksiService = app(TransaksiService::class);
        $this->produksiService = app(ProduksiService::class);
        $this->pengantaranService = app(PengantaranService::class);
        $this->pembayaranService = app(PembayaranService::class);
        $this->adjustmentService = app(TransaksiAdjustmentService::class);
        $this->kompensasiService = app(KompensasiService::class);
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

    private function createKurir(string $nama = 'Kurir Andi'): PetugasPengantaran
    {
        $user = User::factory()->pengantar()->create(['name' => $nama]);

        return PetugasPengantaran::create([
            'user_id' => $user->id,
            'nama_petugas_antar' => $nama,
        ]);
    }

    private function createPelanggan(string $nama, string $phone, bool $bolehBayarAkhir = false): Pelanggan
    {
        return Pelanggan::create([
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Magelang KM 4',
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

    private function createTransaksiSelesai(
        Petugas $petugas,
        Pegawai $pegawai,
        Pelanggan $pelanggan,
        JenisLayanan $layanan,
        string $qty = '2.00',
        string $dp = '0.00'
    ): Transaksi {
        $trx = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $qty,
            'nominal_dp' => $dp,
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        return $this->advanceToSelesai($trx, $pegawai);
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

    public function test_cek_hak_bayar_akhir_and_ambil_pakaian_evaluate_kk06_and_courier_state(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $kurir = $this->createKurir();
        $reguler = $this->createPelanggan('Pelanggan Reguler', '0811111001', false);
        $paylater = $this->createPelanggan('Pelanggan Paylater', '0811111002', true);
        $layanan = $this->createLayanan();

        $trxRegulerBelum = $this->createTransaksiSelesai($petugas, $pegawai, $reguler, $layanan, '2.00', '5000.00');
        $trxPaylaterBelum = $this->createTransaksiSelesai($petugas, $pegawai, $paylater, $layanan, '2.00', '0.00');

        $hakReguler = $this->serahTerimaService->cekHakBayarAkhir($trxRegulerBelum);
        $this->assertFalse($hakReguler['allowed']);
        $this->assertTrue($hakReguler['wajib_pelunasan']);
        $this->assertFalse($hakReguler['boleh_bayar_akhir']);
        $this->assertSame('15000.00', $hakReguler['sisa_tagihan']);
        $this->assertStringContainsString('KK-06', (string) $hakReguler['alasan']);

        $hakPaylater = $this->serahTerimaService->cekHakBayarAkhir($trxPaylaterBelum);
        $this->assertTrue($hakPaylater['allowed']);
        $this->assertFalse($hakPaylater['wajib_pelunasan']);
        $this->assertTrue($hakPaylater['boleh_bayar_akhir']);
        $this->assertSame('20000.00', $hakPaylater['sisa_tagihan']);
        $this->assertNull($hakPaylater['alasan']);

        // Schedule Paylater nota on delivery (MENUNGGU) and test ambilPakaian evaluation
        $pengantaran = $this->pengantaranService->buatJadwal($petugas, [
            'id_petugas_antar' => $kurir->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trxPaylaterBelum->nomor_nota],
        ]);

        $evalMenunggu = $this->serahTerimaService->ambilPakaian($trxPaylaterBelum->nomor_nota);
        $this->assertTrue($evalMenunggu['status_selesai']);
        $this->assertFalse($evalMenunggu['sedang_diantar_kurir']);
        $this->assertTrue($evalMenunggu['ada_pengantaran_menunggu']);
        $this->assertTrue($evalMenunggu['siap_serah_terima']);

        // Move item to DIAMBIL -> sedang_diantar_kurir = true, siap_serah_terima = false
        $item = $pengantaran->itemPengantaran->firstOrFail();
        $this->pengantaranService->mulaiPengantaran($pengantaran, $kurir);
        $this->pengantaranService->updateStatusItem($item, $kurir, [
            'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
        ]);

        $evalDiambil = $this->serahTerimaService->ambilPakaian($trxPaylaterBelum->nomor_nota);
        $this->assertTrue($evalDiambil['sedang_diantar_kurir']);
        $this->assertFalse($evalDiambil['siap_serah_terima']);
    }

    public function test_serahkan_pakaian_enforces_kk06_paid_regular_vs_paylater_and_records_audit(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 15, 45, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pegawai = $this->createPegawai();
            $reguler = $this->createPelanggan('Ibu Sari', '0812222001', false);
            $paylater = $this->createPelanggan('Hotel Melati', '0812222002', true);
            $layanan = $this->createLayanan();

            // Regular unpaid -> blocked 422
            $trxReguler = $this->createTransaksiSelesai($petugas, $pegawai, $reguler, $layanan, '2.00', '5000.00');
            try {
                $this->serahTerimaService->serahkanPakaian($trxReguler->nomor_nota, $petugas, 'Coba ambil', $petugas->user);
                $this->fail('Expected ValidationException under KK-06 for unpaid regular customer.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('status_pembayaran', $e->errors());
                $this->assertStringContainsString('KK-06', $e->errors()['status_pembayaran'][0]);
            }

            $trxReguler->refresh();
            $this->assertSame(StatusTransaksi::SELESAI, $trxReguler->status_transaksi);

            // Settle remaining 15000 -> handover succeeds with LUNAS
            $this->pembayaranService->catatPelunasan($trxReguler->nomor_nota, $petugas, ['nominal_bayar' => '15000.00'], $petugas->user);
            $handedReguler = $this->serahTerimaService->serahkanPakaian($trxReguler->nomor_nota, $petugas, 'Diambil langsung', $petugas->user);

            $this->assertSame(StatusTransaksi::DIAMBIL, $handedReguler->status_transaksi);
            $this->assertSame(StatusPembayaran::LUNAS, $handedReguler->status_pembayaran);
            $this->assertSame('2026-11-10 15:45:00', $handedReguler->diambil_pada->timezone('Asia/Jakarta')->format('Y-m-d H:i:s'));

            // Paylater unpaid -> handover succeeds with BELUM_LUNAS (piutang)
            $trxPaylater = $this->createTransaksiSelesai($petugas, $pegawai, $paylater, $layanan, '3.00', '10000.00');
            $handedPaylater = $this->serahTerimaService->serahkanPakaian($trxPaylater->nomor_nota, $petugas, 'Piutang bulanan', $petugas->user);

            $this->assertSame(StatusTransaksi::DIAMBIL, $handedPaylater->status_transaksi);
            $this->assertSame(StatusPembayaran::BELUM_LUNAS, $handedPaylater->status_pembayaran);

            $audit = AuditLog::query()
                ->where('subject_type', Transaksi::class)
                ->where('subject_id', $trxPaylater->nomor_nota)
                ->where('action', 'SERAH_TERIMA')
                ->latest('id')
                ->first();

            $this->assertNotNull($audit);
            $this->assertSame(UserRole::PETUGAS->value, $audit->actor_role);
            $this->assertSame('LOKET', $audit->payload_after['kanal']);
            $this->assertTrue($audit->payload_after['piutang_dicatat']);
            $this->assertSame('20000.00', $audit->payload_after['sisa_tagihan']);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_serahkan_pakaian_rejects_non_selesai_and_handles_courier_conflict_and_auto_closes_menunggu_items(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $kurir = $this->createKurir();
        $pelangganA = $this->createPelanggan('Pelanggan A', '0813333001', true);
        $pelangganB = $this->createPelanggan('Pelanggan B', '0813333002', false);
        $layanan = $this->createLayanan();

        // Reject AKTIF
        $trxAktif = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelangganB->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '1.00',
            'nominal_dp' => '10000.00',
            'detail_pakaian' => [['jenis_pakaian' => 'Baju', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
        ]);
        $this->expectValidationFailure(fn () => $this->serahTerimaService->serahkanPakaian($trxAktif->nomor_nota, $petugas));

        // Reject DIBATALKAN
        $trxBatal = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelangganB->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '1.00',
            'nominal_dp' => '0.00',
            'detail_pakaian' => [['jenis_pakaian' => 'Baju', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
        ]);
        $this->adjustmentService->batalkanTransaksi($trxBatal->nomor_nota, $petugas, ['alasan_pembatalan' => 'Batal']);
        $this->expectValidationFailure(fn () => $this->serahTerimaService->serahkanPakaian($trxBatal->nomor_nota, $petugas));

        // Anti-Konflik Kurir: Multi-item Pengantaran with Nota A (MENUNGGU) and Nota B (DIAMBIL -> DALAM_PERJALANAN)
        $trxA = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganA, $layanan, '2.00', '20000.00');
        $trxB = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganB, $layanan, '2.00', '20000.00');

        $pengantaran = $this->pengantaranService->buatJadwal($petugas, [
            'id_petugas_antar' => $kurir->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trxA->nomor_nota, $trxB->nomor_nota],
        ]);
        $itemA = $pengantaran->itemPengantaran->firstWhere('nomor_nota', $trxA->nomor_nota);
        $itemB = $pengantaran->itemPengantaran->firstWhere('nomor_nota', $trxB->nomor_nota);

        // Regular unpaid nota with MENUNGGU item must NOT close MENUNGGU item when KK-06 blocks handover!
        $trxUnpaidReg = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganB, $layanan, '1.00', '0.00');
        $singleSession = $this->pengantaranService->buatJadwal($petugas, [
            'id_petugas_antar' => $kurir->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trxUnpaidReg->nomor_nota],
        ]);
        $this->expectValidationFailure(fn () => $this->serahTerimaService->serahkanPakaian($trxUnpaidReg->nomor_nota, $petugas));
        $this->assertSame(StatusItemPengantaran::MENUNGGU, $singleSession->itemPengantaran()->firstOrFail()->status_terima_pelanggan);

        // Move itemB to DIAMBIL -> loket handover for Nota B must be rejected 422
        $this->pengantaranService->mulaiPengantaran($pengantaran, $kurir);
        $this->pengantaranService->updateStatusItem($itemB, $kurir, ['status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value]);
        $this->expectValidationFailure(fn () => $this->serahTerimaService->serahkanPakaian($trxB->nomor_nota, $petugas));

        // Move itemB to DALAM_PERJALANAN -> still rejected 422
        $this->pengantaranService->updateStatusItem($itemB->refresh(), $kurir, ['status_terima_pelanggan' => StatusItemPengantaran::DALAM_PERJALANAN->value]);
        $this->expectValidationFailure(fn () => $this->serahTerimaService->serahkanPakaian($trxB->nomor_nota, $petugas));

        // Handover Nota A (still MENUNGGU) at loket -> closes itemA to GAGAL, preserves Nota B, keeps session BERJALAN
        $this->serahTerimaService->serahkanPakaian($trxA->nomor_nota, $petugas, 'Ambil sendiri', $petugas->user);
        $itemA->refresh();
        $itemB->refresh();
        $pengantaran->refresh();

        $this->assertSame(StatusItemPengantaran::GAGAL, $itemA->status_terima_pelanggan);
        $this->assertSame('Diambil langsung oleh pelanggan di loket kasir.', $itemA->alasan_gagal);
        $this->assertSame(StatusItemPengantaran::DALAM_PERJALANAN, $itemB->status_terima_pelanggan);
        $this->assertSame(StatusPengantaran::BERJALAN, $pengantaran->status_pengantaran);

        $itemUpdateLog = AuditLog::query()
            ->where('subject_type', Transaksi::class)
            ->where('subject_id', $trxA->nomor_nota)
            ->where('action', 'ITEM_PENGANTARAN_UPDATED')
            ->latest('id')
            ->first();
        $this->assertNotNull($itemUpdateLog);

        // Single-item DIJADWALKAN session whose MENUNGGU item is taken at loket -> parent syncs to SELESAI
        $this->pembayaranService->catatPelunasan($trxUnpaidReg->nomor_nota, $petugas, ['nominal_bayar' => '10000.00']);
        $this->serahTerimaService->serahkanPakaian($trxUnpaidReg->nomor_nota, $petugas, null, $petugas->user);
        $singleSession->refresh();
        $this->assertSame(StatusPengantaran::SELESAI, $singleSession->status_pengantaran);

        // Reject already DIAMBIL nota
        $this->expectValidationFailure(fn () => $this->serahTerimaService->serahkanPakaian($trxA->nomor_nota, $petugas));
    }

    public function test_serah_terima_respects_post_adjustment_balances_and_queue_summary(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $kurir = $this->createKurir();
        $reguler = $this->createPelanggan('Pak Anton_50%', '0814444001', false);
        $paylater = $this->createPelanggan('Hotel Bintang', '0814444002', true);
        $layanan = $this->createLayanan();

        // KK-04: compensation brings remaining balance to 0 -> regular customer can pick up
        $trxComp = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $reguler->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00', // 20000
            'nominal_dp' => '10000.00',
            'detail_pakaian' => [['jenis_pakaian' => 'Batik', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
        ]);
        $detail = DetailPakaian::where('nomor_nota', $trxComp->nomor_nota)->firstOrFail();
        $laporan = $this->kompensasiService->laporInsiden($pegawai->user, [
            'nomor_nota' => $trxComp->nomor_nota,
            'id_detail' => $detail->id_detail,
            'jenis_insiden' => JenisInsiden::RUSAK->value,
            'keterangan' => 'Sobek ujung',
        ]);
        $this->kompensasiService->konfirmasiKompensasi($petugas, $laporan, [
            'nilai_kompensasi' => '10000.00',
        ]);
        $trxComp = $this->advanceToSelesai($trxComp->refresh(), $pegawai);
        $handedComp = $this->serahTerimaService->serahkanPakaian($trxComp->nomor_nota, $petugas);
        $this->assertSame(StatusPembayaran::LUNAS, $handedComp->status_pembayaran);

        // Create 1 SELESAI ready & in transit, and 2 DIAMBIL piutang
        $trxSiap = $this->createTransaksiSelesai($petugas, $pegawai, $reguler, $layanan, '2.00', '20000.00');
        $pengantaran = $this->pengantaranService->buatJadwal($petugas, [
            'id_petugas_antar' => $kurir->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trxSiap->nomor_nota],
        ]);
        $this->pengantaranService->mulaiPengantaran($pengantaran, $kurir);
        $this->pengantaranService->updateStatusItem($pengantaran->itemPengantaran->firstOrFail(), $kurir, [
            'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
        ]);

        $trxPiutang1 = $this->createTransaksiSelesai($petugas, $pegawai, $paylater, $layanan, '2.50', '5000.00'); // sisa 20000
        $this->serahTerimaService->serahkanPakaian($trxPiutang1->nomor_nota, $petugas);

        $trxPiutang2 = $this->createTransaksiSelesai($petugas, $pegawai, $paylater, $layanan, '1.50', '2500.50'); // sisa 12499.50
        $this->serahTerimaService->serahkanPakaian($trxPiutang2->nomor_nota, $petugas);

        $summary = $this->serahTerimaService->getSummary();
        $this->assertSame(1, $summary['siap_ambil_count']);
        $this->assertSame(1, $summary['sedang_diantar_count']);
        $this->assertSame(2, $summary['piutang_count']);
        $this->assertSame('32499.50', $summary['total_piutang_nominal']);

        $siapPage = $this->serahTerimaService->paginateQueue(['mode' => 'SIAP_AMBIL', 'search' => '_50%']);
        $this->assertSame(1, $siapPage->total());
        $this->assertSame($trxSiap->nomor_nota, $siapPage->items()[0]['nomor_nota']);

        $piutangPage = $this->serahTerimaService->paginateQueue(['mode' => 'PIUTANG', 'search' => 'Hotel']);
        $this->assertSame(2, $piutangPage->total());

        $riwayatPage = $this->serahTerimaService->paginateQueue(['mode' => 'RIWAYAT_DIAMBIL']);
        $this->assertSame(3, $riwayatPage->total());
    }

    public function test_serahkan_pakaian_preserves_historical_gagal_item_and_resolves_without_circular_di(): void
    {
        // Both services must resolve cleanly from the container without circular dependency
        $this->assertInstanceOf(SerahTerimaService::class, app(SerahTerimaService::class));
        $this->assertInstanceOf(PengantaranService::class, app(PengantaranService::class));

        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $kurir = $this->createKurir();
        $reguler = $this->createPelanggan('Pelanggan Jemput', '0819999888', false);
        $layanan = $this->createLayanan();

        $trx = $this->createTransaksiSelesai($petugas, $pegawai, $reguler, $layanan, '1.00', '10000.00');
        $pengantaran = $this->pengantaranService->buatJadwal($petugas, [
            'id_petugas_antar' => $kurir->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trx->nomor_nota],
        ]);
        $item = $pengantaran->itemPengantaran->firstOrFail();

        $this->pengantaranService->mulaiPengantaran($pengantaran, $kurir);
        $this->pengantaranService->updateStatusItem($item, $kurir, ['status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value]);
        $this->pengantaranService->updateStatusItem($item->refresh(), $kurir, ['status_terima_pelanggan' => StatusItemPengantaran::DALAM_PERJALANAN->value]);
        $this->pengantaranService->updateStatusItem($item->refresh(), $kurir, [
            'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
            'alasan_gagal' => 'Rumah sedang direnovasi',
        ]);

        // Customer picks up at loket directly after failed courier delivery
        $handed = $this->serahTerimaService->serahkanPakaian($trx->nomor_nota, $petugas, 'Ambil setelah kurir gagal');
        $this->assertSame(StatusTransaksi::DIAMBIL, $handed->status_transaksi);

        $item->refresh();
        $this->assertSame(StatusItemPengantaran::GAGAL, $item->status_terima_pelanggan);
        $this->assertSame('Rumah sedang direnovasi', $item->alasan_gagal);
    }

    private function expectValidationFailure(callable $callback): void
    {
        try {
            $callback();
            $this->fail('Expected ValidationException was not thrown.');
        } catch (ValidationException $e) {
            $this->assertNotEmpty($e->errors());
        }
    }
}
