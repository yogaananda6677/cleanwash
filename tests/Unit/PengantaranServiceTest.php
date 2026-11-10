<?php

namespace Tests\Unit;

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
use App\Services\PengantaranService;
use App\Services\ProduksiService;
use App\Services\SerahTerimaService;
use App\Services\TransaksiAdjustmentService;
use App\Services\TransaksiService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PengantaranServiceTest extends TestCase
{
    use RefreshDatabase;

    private TransaksiService $transaksiService;

    private ProduksiService $produksiService;

    private PengantaranService $pengantaranService;

    private SerahTerimaService $serahTerimaService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->transaksiService = app(TransaksiService::class);
        $this->produksiService = app(ProduksiService::class);
        $this->pengantaranService = app(PengantaranService::class);
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

    private function createKurir(string $nama = 'Kurir Andi', bool $active = true): PetugasPengantaran
    {
        $factory = User::factory()->pengantar();
        if (! $active) {
            $factory = $factory->inactive();
        }
        $user = $factory->create(['name' => $nama]);

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
            'alamat' => 'Jl. Kaliurang KM 6',
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
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

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

    public function test_cek_hak_bayar_akhir_evaluates_kk06_and_adjusted_balances_accurately(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $layanan = $this->createLayanan();

        $reguler = $this->createPelanggan('Siti Reguler', '081200001001', false);
        $payLater = $this->createPelanggan('Hendra Khusus', '081200001002', true);

        // 1. Regular unpaid (total 30.000, DP 10.000 -> sisa 20.000) -> blocked
        $trxRegulerDp = $this->createTransaksiSelesai($petugas, $pegawai, $reguler, $layanan, '3.00', '10000.00');
        $cekBlocked = $this->serahTerimaService->cekHakBayarAkhir($trxRegulerDp);

        $this->assertFalse($cekBlocked['allowed']);
        $this->assertTrue($cekBlocked['wajib_pelunasan']);
        $this->assertFalse($cekBlocked['boleh_bayar_akhir']);
        $this->assertSame('20000.00', $cekBlocked['sisa_tagihan']);
        $this->assertNotNull($cekBlocked['alasan']);
        $this->assertStringContainsString('Rp 20.000', $cekBlocked['alasan']);
        $this->assertStringContainsString('KK-06', $cekBlocked['alasan']);

        // 2. Regular fully paid (total 20.000, DP 20.000 -> sisa 0.00) -> allowed
        $trxLunas = $this->createTransaksiSelesai($petugas, $pegawai, $reguler, $layanan, '2.00', '20000.00');
        $cekLunas = $this->serahTerimaService->cekHakBayarAkhir($trxLunas);

        $this->assertTrue($cekLunas['allowed']);
        $this->assertFalse($cekLunas['wajib_pelunasan']);
        $this->assertFalse($cekLunas['boleh_bayar_akhir']);
        $this->assertSame('0.00', $cekLunas['sisa_tagihan']);
        $this->assertNull($cekLunas['alasan']);

        // 3. Pay-later customer unpaid (total 25.000, DP 0 -> sisa 25.000) -> allowed
        $trxPayLater = $this->createTransaksiSelesai($petugas, $pegawai, $payLater, $layanan, '2.50', '0.00');
        $cekPayLater = $this->serahTerimaService->cekHakBayarAkhir($trxPayLater);

        $this->assertTrue($cekPayLater['allowed']);
        $this->assertFalse($cekPayLater['wajib_pelunasan']);
        $this->assertTrue($cekPayLater['boleh_bayar_akhir']);
        $this->assertSame('25000.00', $cekPayLater['sisa_tagihan']);
        $this->assertNull($cekPayLater['alasan']);

        // 4. KK-01 timbangUlang raised bill from 20.000 (LUNAS) -> 35.000 (sisa 15.000) on regular customer -> blocked!
        $trxTimbang = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $reguler->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nominal_dp' => '20000.00',
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
        $trxTimbang = $this->produksiService->timbangUlang($trxTimbang->nomor_nota, $pegawai, [
            'berat_aktual' => '3.50',
        ]);
        $cekTimbang = $this->serahTerimaService->cekHakBayarAkhir($trxTimbang);

        $this->assertFalse($cekTimbang['allowed']);
        $this->assertTrue($cekTimbang['wajib_pelunasan']);
        $this->assertSame('15000.00', $cekTimbang['sisa_tagihan']);

        // 5. KK-04 compensation reduces remaining bill to 0.00 -> allowed!
        $detailJaket = $trxTimbang->detailPakaian->firstOrFail();
        $petugasUser = $petugas->user()->firstOrFail();
        app(KompensasiService::class)->laporInsiden($petugasUser, [
            'nomor_nota' => $trxTimbang->nomor_nota,
            'id_detail' => $detailJaket->id_detail,
            'jenis_insiden' => 'RUSAK',
            'keterangan' => 'Kompensasi menutup sisa tagihan penimbangan ulang.',
            'nilai_kompensasi' => '15000.00',
        ]);
        $trxTimbang->refresh();
        $cekAfterKompensasi = $this->serahTerimaService->cekHakBayarAkhir($trxTimbang);

        $this->assertTrue($cekAfterKompensasi['allowed']);
        $this->assertFalse($cekAfterKompensasi['wajib_pelunasan']);
        $this->assertSame('0.00', $cekAfterKompensasi['sisa_tagihan']);
    }

    public function test_buat_jadwal_creates_multi_customer_session_and_rejects_invalid_inputs(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 0, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pegawai = $this->createPegawai();
            $kurirAktif = $this->createKurir('Kurir Aktif', true);
            $kurirNonaktif = $this->createKurir('Kurir Nonaktif', false);
            $layanan = $this->createLayanan();

            $pelangganA = $this->createPelanggan('Pelanggan A', '081211110001');
            $pelangganB = $this->createPelanggan('Pelanggan B', '081211110002');

            $trxSelesaiA = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganA, $layanan, '2.00', '20000.00');
            $trxSelesaiB = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganB, $layanan, '3.00', '30000.00');

            // Inactive courier -> 422
            try {
                $this->pengantaranService->buatJadwal($petugas, [
                    'id_petugas_antar' => $kurirNonaktif->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxSelesaiA->nomor_nota],
                ]);
                $this->fail('Expected ValidationException for inactive courier.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('id_petugas_antar', $e->errors());
            }

            // Past date -> 422
            try {
                $this->pengantaranService->buatJadwal($petugas, [
                    'id_petugas_antar' => $kurirAktif->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-09',
                    'nomor_nota_list' => [$trxSelesaiA->nomor_nota],
                ]);
                $this->fail('Expected ValidationException for past date.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('tanggal_pengantaran', $e->errors());
            }

            // Duplicate nomor_nota -> 422
            try {
                $this->pengantaranService->buatJadwal($petugas, [
                    'id_petugas_antar' => $kurirAktif->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxSelesaiA->nomor_nota, $trxSelesaiA->nomor_nota],
                ]);
                $this->fail('Expected ValidationException for duplicate nomor_nota.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('nomor_nota_list', $e->errors());
            }

            // AKTIF, DIAMBIL, DIBATALKAN -> 422
            $trxAktif = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelangganA->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '1.00',
                'detail_pakaian' => [['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
            ]);
            $trxBatal = $this->transaksiService->buatTransaksi($petugas, [
                'id_pelanggan' => $pelangganB->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '1.00',
                'detail_pakaian' => [['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
            ]);
            $trxBatal = app(TransaksiAdjustmentService::class)->batalkanTransaksi($trxBatal->nomor_nota, $petugas, [
                'alasan_pembatalan' => 'Tes tolak pengantaran nota batal.',
            ]);
            $trxDiambil = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganA, $layanan, '1.00', '10000.00');
            $trxDiambil->update(['status_transaksi' => StatusTransaksi::DIAMBIL, 'diambil_pada' => now('Asia/Jakarta')]);

            foreach ([$trxAktif, $trxBatal, $trxDiambil] as $invalidTrx) {
                try {
                    $this->pengantaranService->buatJadwal($petugas, [
                        'id_petugas_antar' => $kurirAktif->id_petugas_antar,
                        'tanggal_pengantaran' => '2026-11-10',
                        'nomor_nota_list' => [$invalidTrx->nomor_nota],
                    ]);
                    $this->fail("Expected ValidationException for status {$invalidTrx->status_transaksi->value}");
                } catch (ValidationException $e) {
                    $this->assertArrayHasKey('nomor_nota_list', $e->errors());
                }
            }

            // Happy path: multi-customer batch
            $pengantaran = $this->pengantaranService->buatJadwal($petugas, [
                'id_petugas_antar' => $kurirAktif->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trxSelesaiA->nomor_nota, $trxSelesaiB->nomor_nota],
            ]);

            $this->assertSame(StatusPengantaran::DIJADWALKAN, $pengantaran->status_pengantaran);
            $this->assertSame('2026-11-10', $pengantaran->tanggal_pengantaran->toDateString());
            $this->assertCount(2, $pengantaran->itemPengantaran);
            $this->assertSame(
                [StatusItemPengantaran::MENUNGGU->value, StatusItemPengantaran::MENUNGGU->value],
                $pengantaran->itemPengantaran->pluck('status_terima_pelanggan')->map->value->all()
            );

            $audit = AuditLog::where('action', 'PENGANTARAN_CREATED')
                ->where('subject_id', (string) $pengantaran->id_pengantaran)
                ->first();
            $this->assertNotNull($audit);
            $this->assertSame(UserRole::PETUGAS->value, $audit->actor_role);
            $this->assertSame(Pengantaran::class, $audit->subject_type);

            // Duplicate active schedule -> 422
            try {
                $this->pengantaranService->buatJadwal($petugas, [
                    'id_petugas_antar' => $kurirAktif->id_petugas_antar,
                    'tanggal_pengantaran' => '2026-11-10',
                    'nomor_nota_list' => [$trxSelesaiA->nomor_nota],
                ]);
                $this->fail('Expected ValidationException for transaction already in active delivery.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('nomor_nota_list', $e->errors());
            }
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_mulai_and_update_status_item_enforce_sequence_header_sync_and_kk06_gate(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 11, 0, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pegawai = $this->createPegawai();
            $kurirA = $this->createKurir('Kurir A');
            $kurirB = $this->createKurir('Kurir B');
            $layanan = $this->createLayanan();

            $pelangganReguler = $this->createPelanggan('Pelanggan Reguler', '081222220001', false);
            $pelangganPayLater = $this->createPelanggan('Pelanggan PayLater', '081222220002', true);

            // Nota 1: unpaid regular customer (total 20.000, DP 5.000 -> sisa 15.000)
            $trxRegulerUnpaid = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganReguler, $layanan, '2.00', '5000.00');
            // Nota 2: unpaid pay-later customer (total 30.000, DP 0 -> sisa 30.000)
            $trxPayLaterUnpaid = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganPayLater, $layanan, '3.00', '0.00');

            $pengantaran = $this->pengantaranService->buatJadwal($petugas, [
                'id_petugas_antar' => $kurirA->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trxRegulerUnpaid->nomor_nota, $trxPayLaterUnpaid->nomor_nota],
            ]);

            // Other courier cannot start
            try {
                $this->pengantaranService->mulaiPengantaran($pengantaran, $kurirB);
                $this->fail('Expected AuthorizationException for wrong courier.');
            } catch (AuthorizationException) {
                $this->addToAssertionCount(1);
            }

            // Start session: DIJADWALKAN -> BERJALAN
            $started = $this->pengantaranService->mulaiPengantaran($pengantaran, $kurirA);
            $this->assertSame(StatusPengantaran::BERJALAN, $started->status_pengantaran);

            // Cannot start twice
            try {
                $this->pengantaranService->mulaiPengantaran($started, $kurirA);
                $this->fail('Expected ValidationException when starting already BERJALAN delivery.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('status_pengantaran', $e->errors());
            }

            $itemReguler = $started->itemPengantaran->firstWhere('nomor_nota', $trxRegulerUnpaid->nomor_nota);
            $itemPayLater = $started->itemPengantaran->firstWhere('nomor_nota', $trxPayLaterUnpaid->nomor_nota);

            // Skipping MENUNGGU -> DALAM_PERJALANAN or MENUNGGU -> GAGAL must throw 422
            foreach ([StatusItemPengantaran::DALAM_PERJALANAN->value, StatusItemPengantaran::GAGAL->value] as $badTarget) {
                try {
                    $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                        'status_terima_pelanggan' => $badTarget,
                        'alasan_gagal' => 'Alasan gagal uji lompat tahap.',
                    ]);
                    $this->fail("Expected ValidationException when jumping MENUNGGU -> {$badTarget}");
                } catch (ValidationException $e) {
                    $this->assertArrayHasKey('status_terima_pelanggan', $e->errors());
                }
            }

            // Advance itemReguler: MENUNGGU -> DIAMBIL -> DALAM_PERJALANAN
            $itemReguler = $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
            ]);
            $this->assertSame(StatusItemPengantaran::DIAMBIL, $itemReguler->status_terima_pelanggan);

            // Repeating DIAMBIL -> DIAMBIL or reversing DIAMBIL -> MENUNGGU or skipping DIAMBIL -> DITERIMA -> 422
            foreach ([StatusItemPengantaran::DIAMBIL->value, StatusItemPengantaran::MENUNGGU->value, StatusItemPengantaran::DITERIMA->value] as $badTarget) {
                try {
                    $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                        'status_terima_pelanggan' => $badTarget,
                    ]);
                    $this->fail("Expected ValidationException for DIAMBIL -> {$badTarget}");
                } catch (ValidationException $e) {
                    $this->assertArrayHasKey('status_terima_pelanggan', $e->errors());
                }
            }

            $itemReguler = $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                'status_terima_pelanggan' => StatusItemPengantaran::DALAM_PERJALANAN->value,
            ]);

            // KK-06 Gate: DALAM_PERJALANAN -> DITERIMA on unpaid non-paylater MUST fail 422 & rollback cleanly
            try {
                $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                    'status_terima_pelanggan' => StatusItemPengantaran::DITERIMA->value,
                ]);
                $this->fail('Expected ValidationException due to KK-06 unpaid regular customer.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('status_terima_pelanggan', $e->errors());
                $this->assertStringContainsString('KK-06', $e->errors()['status_terima_pelanggan'][0]);
            }

            $itemReguler->refresh();
            $trxRegulerUnpaid->refresh();
            $this->assertSame(StatusItemPengantaran::DALAM_PERJALANAN, $itemReguler->status_terima_pelanggan);
            $this->assertSame(StatusTransaksi::SELESAI, $trxRegulerUnpaid->status_transaksi);
            $this->assertNull($trxRegulerUnpaid->diambil_pada);

            // GAGAL without min 5 chars -> 422
            try {
                $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                    'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                    'alasan_gagal' => 'abc',
                ]);
                $this->fail('Expected ValidationException for short alasan_gagal.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('alasan_gagal', $e->errors());
            }

            // Mark itemReguler as GAGAL with valid reason -> header remains BERJALAN because itemPayLater still MENUNGGU
            $itemReguler = $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                'alasan_gagal' => 'Rumah terkunci, pelanggan belum melunasi sisa tagihan.',
            ]);
            $this->assertSame(StatusItemPengantaran::GAGAL, $itemReguler->status_terima_pelanggan);
            $this->assertSame(StatusPengantaran::BERJALAN, $started->refresh()->status_pengantaran);

            // Terminal GAGAL cannot transition further
            try {
                $this->pengantaranService->updateStatusItem($itemReguler, $kurirA, [
                    'status_terima_pelanggan' => StatusItemPengantaran::DITERIMA->value,
                ]);
                $this->fail('Expected ValidationException when mutating terminal GAGAL item.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('status_terima_pelanggan', $e->errors());
            }

            // Advance itemPayLater: MENUNGGU -> DIAMBIL -> DALAM_PERJALANAN -> DITERIMA (allowed by KK-06!)
            $itemPayLater = $this->pengantaranService->updateStatusItem($itemPayLater, $kurirA, [
                'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
            ]);
            $itemPayLater = $this->pengantaranService->updateStatusItem($itemPayLater, $kurirA, [
                'status_terima_pelanggan' => StatusItemPengantaran::DALAM_PERJALANAN->value,
            ]);
            $itemPayLater = $this->pengantaranService->updateStatusItem($itemPayLater, $kurirA, [
                'status_terima_pelanggan' => StatusItemPengantaran::DITERIMA->value,
                'alasan_gagal' => 'ignored value should become null',
            ]);

            $this->assertSame(StatusItemPengantaran::DITERIMA, $itemPayLater->status_terima_pelanggan);
            $this->assertNull($itemPayLater->alasan_gagal);

            // Header auto-synced to SELESAI (all items DITERIMA/GAGAL)
            $this->assertSame(StatusPengantaran::SELESAI, $started->refresh()->status_pengantaran);

            // Transaction updated to DIAMBIL + BELUM_LUNAS (piutang) + diambil_pada + AuditLog SERAH_TERIMA
            $trxPayLaterUnpaid->refresh();
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxPayLaterUnpaid->status_transaksi);
            $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxPayLaterUnpaid->status_pembayaran);
            $this->assertNotNull($trxPayLaterUnpaid->diambil_pada);

            $serahTerimaAudit = AuditLog::where('action', 'SERAH_TERIMA')
                ->where('subject_id', $trxPayLaterUnpaid->nomor_nota)
                ->first();
            $this->assertNotNull($serahTerimaAudit);
            $this->assertSame(UserRole::PENGANTAR->value, $serahTerimaAudit->actor_role);
            $this->assertSame('KURIR', $serahTerimaAudit->payload_after['kanal']);
            $this->assertTrue($serahTerimaAudit->payload_after['piutang_dicatat']);
            $this->assertSame('30000.00', $serahTerimaAudit->payload_after['sisa_tagihan']);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_jadwalkan_ulang_isolates_kk07_and_blocks_double_reschedule(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 14, 0, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pegawai = $this->createPegawai();
            $kurirA = $this->createKurir('Kurir A');
            $kurirB = $this->createKurir('Kurir B');
            $kurirInactive = $this->createKurir('Kurir Nonaktif', false);
            $layanan = $this->createLayanan();

            $pelangganA = $this->createPelanggan('Pelanggan A', '081233330001');
            $pelangganB = $this->createPelanggan('Pelanggan B', '081233330002');

            $trxA = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganA, $layanan, '2.00', '20000.00');
            $trxB = $this->createTransaksiSelesai($petugas, $pegawai, $pelangganB, $layanan, '2.00', '20000.00');

            $sesiAsal = $this->pengantaranService->buatJadwal($petugas, [
                'id_petugas_antar' => $kurirA->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trxA->nomor_nota, $trxB->nomor_nota],
            ]);
            $sesiAsal = $this->pengantaranService->mulaiPengantaran($sesiAsal, $kurirA);

            $itemA = $sesiAsal->itemPengantaran->firstWhere('nomor_nota', $trxA->nomor_nota);
            $itemB = $sesiAsal->itemPengantaran->firstWhere('nomor_nota', $trxB->nomor_nota);

            // Customer A succeeds (DITERIMA)
            $itemA = $this->pengantaranService->updateStatusItem($itemA, $kurirA, ['status_terima_pelanggan' => 'DIAMBIL']);
            $itemA = $this->pengantaranService->updateStatusItem($itemA, $kurirA, ['status_terima_pelanggan' => 'DALAM_PERJALANAN']);
            $itemA = $this->pengantaranService->updateStatusItem($itemA, $kurirA, ['status_terima_pelanggan' => 'DITERIMA']);

            // Cannot reschedule DITERIMA item
            try {
                $this->pengantaranService->jadwalkanUlang($itemA, $petugas->user, [
                    'tanggal_pengantaran' => '2026-11-11',
                ]);
                $this->fail('Expected ValidationException rescheduling DITERIMA item.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('item', $e->errors());
            }

            // Customer B fails (GAGAL)
            $itemB = $this->pengantaranService->updateStatusItem($itemB, $kurirA, ['status_terima_pelanggan' => 'DIAMBIL']);
            $itemB = $this->pengantaranService->updateStatusItem($itemB, $kurirA, ['status_terima_pelanggan' => 'DALAM_PERJALANAN']);
            $itemB = $this->pengantaranService->updateStatusItem($itemB, $kurirA, [
                'status_terima_pelanggan' => 'GAGAL',
                'alasan_gagal' => 'Pelanggan sedang keluar kota.',
            ]);

            // Kurir B cannot reschedule Kurir A's item -> AuthorizationException
            try {
                $this->pengantaranService->jadwalkanUlang($itemB, $kurirB->user, [
                    'tanggal_pengantaran' => '2026-11-11',
                ]);
                $this->fail('Expected AuthorizationException for Kurir B.');
            } catch (AuthorizationException) {
                $this->addToAssertionCount(1);
            }

            // Kurir A cannot assign another courier -> 422
            try {
                $this->pengantaranService->jadwalkanUlang($itemB, $kurirA->user, [
                    'tanggal_pengantaran' => '2026-11-11',
                    'id_petugas_antar' => $kurirB->id_petugas_antar,
                ]);
                $this->fail('Expected ValidationException when courier assigns another courier.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('id_petugas_antar', $e->errors());
            }

            // Petugas cannot assign inactive courier -> 422
            try {
                $this->pengantaranService->jadwalkanUlang($itemB, $petugas->user, [
                    'tanggal_pengantaran' => '2026-11-11',
                    'id_petugas_antar' => $kurirInactive->id_petugas_antar,
                ]);
                $this->fail('Expected ValidationException for inactive target courier.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('id_petugas_antar', $e->errors());
            }

            // Petugas reschedules Item B to Kurir B
            $sesiBaru = $this->pengantaranService->jadwalkanUlang($itemB, $petugas->user, [
                'tanggal_pengantaran' => '2026-11-11',
                'id_petugas_antar' => $kurirB->id_petugas_antar,
            ]);

            $this->assertNotSame($sesiAsal->id_pengantaran, $sesiBaru->id_pengantaran);
            $this->assertSame(StatusPengantaran::DIJADWALKAN, $sesiBaru->status_pengantaran);
            $this->assertSame($kurirB->id_petugas_antar, $sesiBaru->id_petugas_antar);
            $this->assertSame('2026-11-11', $sesiBaru->tanggal_pengantaran->toDateString());
            $this->assertCount(1, $sesiBaru->itemPengantaran);

            $itemBaru = $sesiBaru->itemPengantaran->firstOrFail();
            $this->assertSame($trxB->nomor_nota, $itemBaru->nomor_nota);
            $this->assertSame(StatusItemPengantaran::MENUNGGU, $itemBaru->status_terima_pelanggan);
            $this->assertNull($itemBaru->alasan_gagal);

            // KK-07 Isolation: Item A, Trx A, and old Item B remain 100% untouched
            $itemA->refresh();
            $itemB->refresh();
            $trxA->refresh();
            $sesiAsal->refresh();
            $this->assertSame(StatusItemPengantaran::DITERIMA, $itemA->status_terima_pelanggan);
            $this->assertSame(StatusTransaksi::DIAMBIL, $trxA->status_transaksi);
            $this->assertSame(StatusItemPengantaran::GAGAL, $itemB->status_terima_pelanggan);
            $this->assertSame('Pelanggan sedang keluar kota.', $itemB->alasan_gagal);
            $this->assertSame(StatusPengantaran::SELESAI, $sesiAsal->status_pengantaran);

            // Double-reschedule on old $itemB -> 422
            try {
                $this->pengantaranService->jadwalkanUlang($itemB, $petugas->user, [
                    'tanggal_pengantaran' => '2026-11-12',
                ]);
                $this->fail('Expected ValidationException on double-reschedule.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('item', $e->errors());
            }

            // Even if $itemBaru also fails later, old $itemB MUST STILL remain blocked (anti-double-reschedule guard #2)
            $itemBaru = $this->pengantaranService->updateStatusItem($itemBaru, $kurirB, ['status_terima_pelanggan' => 'DIAMBIL']);
            $itemBaru = $this->pengantaranService->updateStatusItem($itemBaru, $kurirB, ['status_terima_pelanggan' => 'DALAM_PERJALANAN']);
            $itemBaru = $this->pengantaranService->updateStatusItem($itemBaru, $kurirB, [
                'status_terima_pelanggan' => 'GAGAL',
                'alasan_gagal' => 'Masih belum ada di rumah.',
            ]);

            try {
                $this->pengantaranService->jadwalkanUlang($itemB, $petugas->user, [
                    'tanggal_pengantaran' => '2026-11-12',
                ]);
                $this->fail('Expected ValidationException rescheduling older GAGAL record when newer record exists.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('item', $e->errors());
            }

            // Newer item ($itemBaru) CAN be rescheduled by Kurir B self
            $sesiKetiga = $this->pengantaranService->jadwalkanUlang($itemBaru, $kurirB->user, [
                'tanggal_pengantaran' => '2026-11-12',
            ]);
            $this->assertSame($kurirB->id_petugas_antar, $sesiKetiga->id_petugas_antar);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_transaksi_detail_phase3_additions_reflect_delivery_and_settlement_flags(): void
    {
        $petugas = $this->createPetugas();
        $pegawai = $this->createPegawai();
        $kurir = $this->createKurir('Kurir Detail');
        $layanan = $this->createLayanan();
        $pelangganReguler = $this->createPelanggan('Siti Detail', '081244440001', false);

        // 1. AKTIF unpaid -> bisa_pelunasan = true, bisa_serah_terima_loket = false
        $trx = $this->transaksiService->buatTransaksi($petugas, [
            'id_pelanggan' => $pelangganReguler->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nominal_dp' => '5000.00',
            'detail_pakaian' => [['jenis_pakaian' => 'Celana', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik']],
        ]);

        $detailAktif = $this->transaksiService->formatTransaksiDetail($trx);
        $this->assertTrue($detailAktif['bisa_pelunasan']);
        $this->assertFalse($detailAktif['bisa_serah_terima_loket']);
        $this->assertFalse($detailAktif['sedang_diantar_kurir']);
        $this->assertNull($detailAktif['pengantaran_aktif']);
        $this->assertSame([], $detailAktif['riwayat_pengantaran']);

        // Advance to SELESAI
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $tahap) {
            $trx = $this->produksiService->ubahStatusProduksi($trx->nomor_nota, $pegawai, ['tahap_status' => $tahap]);
        }

        // Still unpaid regular -> bisa_serah_terima_loket = false (KK-06)
        $detailSelesaiUnpaid = $this->transaksiService->formatTransaksiDetail($trx);
        $this->assertTrue($detailSelesaiUnpaid['bisa_pelunasan']);
        $this->assertFalse($detailSelesaiUnpaid['bisa_serah_terima_loket']);

        // Schedule delivery (MENUNGGU) -> pengantaran_aktif present, sedang_diantar_kurir = false
        $sesi = $this->pengantaranService->buatJadwal($petugas, [
            'id_petugas_antar' => $kurir->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trx->nomor_nota],
        ]);
        $item = $sesi->itemPengantaran->firstOrFail();

        $detailMenunggu = $this->transaksiService->formatTransaksiDetail($trx->refresh());
        $this->assertFalse($detailMenunggu['sedang_diantar_kurir']);
        $this->assertNotNull($detailMenunggu['pengantaran_aktif']);
        $this->assertSame($item->id_item_antar, $detailMenunggu['pengantaran_aktif']['id_item_antar']);
        $this->assertCount(1, $detailMenunggu['riwayat_pengantaran']);

        // Mark DIAMBIL -> sedang_diantar_kurir = true, bisa_serah_terima_loket = false
        $this->pengantaranService->updateStatusItem($item, $kurir, ['status_terima_pelanggan' => 'DIAMBIL']);
        $detailDiambilKurir = $this->transaksiService->formatTransaksiDetail($trx->refresh());
        $this->assertTrue($detailDiambilKurir['sedang_diantar_kurir']);
        $this->assertFalse($detailDiambilKurir['bisa_serah_terima_loket']);
    }

    public function test_rebatch_failed_nota_direct_diambil_sync_and_rejects_reschedule_after_diambil(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 15, 0, 0, 'Asia/Jakarta'));

        try {
            $petugas = $this->createPetugas();
            $pegawai = $this->createPegawai();
            $kurir = $this->createKurir('Kurir C');
            $layanan = $this->createLayanan();
            $pelanggan = $this->createPelanggan('Pelanggan Rebatch', '081255550001');

            $trx1 = $this->createTransaksiSelesai($petugas, $pegawai, $pelanggan, $layanan, '2.00', '20000.00');
            $trx2 = $this->createTransaksiSelesai($petugas, $pegawai, $pelanggan, $layanan, '1.00', '10000.00');

            // Create session 1 without calling mulaiPengantaran(), advance MENUNGGU -> DIAMBIL directly -> syncs BERJALAN
            $sesi1 = $this->pengantaranService->buatJadwal($petugas, [
                'id_petugas_antar' => $kurir->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trx1->nomor_nota],
            ]);
            $item1 = $sesi1->itemPengantaran->firstOrFail();

            $item1 = $this->pengantaranService->updateStatusItem($item1, $kurir, ['status_terima_pelanggan' => 'DIAMBIL']);
            $this->assertSame(StatusPengantaran::BERJALAN, $sesi1->refresh()->status_pengantaran);

            $item1 = $this->pengantaranService->updateStatusItem($item1, $kurir, ['status_terima_pelanggan' => 'DALAM_PERJALANAN']);
            $item1 = $this->pengantaranService->updateStatusItem($item1, $kurir, [
                'status_terima_pelanggan' => 'GAGAL',
                'alasan_gagal' => 'Alamat tidak ditemukan pada percobaan pertama.',
            ]);
            $this->assertSame(StatusPengantaran::SELESAI, $sesi1->refresh()->status_pengantaran);

            // Eligible options include trx1 with has_previous_failed_delivery = true
            $eligible = collect($this->pengantaranService->getEligibleTransaksiOptions())->keyBy('nomor_nota');
            $this->assertTrue($eligible->has($trx1->nomor_nota));
            $this->assertTrue($eligible[$trx1->nomor_nota]['has_previous_failed_delivery']);
            $this->assertFalse($eligible[$trx2->nomor_nota]['has_previous_failed_delivery']);

            // Re-batch trx1 together with trx2 via buatJadwal()
            $sesi2 = $this->pengantaranService->buatJadwal($petugas, [
                'id_petugas_antar' => $kurir->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trx1->nomor_nota, $trx2->nomor_nota],
            ]);
            $this->assertCount(2, $sesi2->itemPengantaran);

            // Format detail using direct Eloquent load without withSum/withCount (tests fallback path)
            $plainLoaded = Pengantaran::with(['petugasPengantaran', 'itemPengantaran'])->findOrFail($sesi2->id_pengantaran);
            $formatted = $this->pengantaranService->formatPengantaranDetail($plainLoaded);
            $this->assertSame('20000.00', $formatted['items'][0]['transaksi']['total_dibayar']);
            $this->assertSame(1, $formatted['items'][0]['transaksi']['detail_pakaian_count']);

            // Advance trx1 in sesi2 to GAGAL, then simulate customer picking up at loket (DIAMBIL) -> jadwalkanUlang blocked 422
            $item1Batch2 = $sesi2->itemPengantaran->firstWhere('nomor_nota', $trx1->nomor_nota);
            $item1Batch2 = $this->pengantaranService->updateStatusItem($item1Batch2, $kurir, ['status_terima_pelanggan' => 'DIAMBIL']);
            $item1Batch2 = $this->pengantaranService->updateStatusItem($item1Batch2, $kurir, ['status_terima_pelanggan' => 'DALAM_PERJALANAN']);
            $item1Batch2 = $this->pengantaranService->updateStatusItem($item1Batch2, $kurir, [
                'status_terima_pelanggan' => 'GAGAL',
                'alasan_gagal' => 'Pelanggan memutuskan ambil sendiri di outlet.',
            ]);

            $trx1->refresh()->update(['status_transaksi' => StatusTransaksi::DIAMBIL, 'diambil_pada' => now('Asia/Jakarta')]);
            $formattedAfterPickup = $this->pengantaranService->formatItemDetail($item1Batch2->refresh());
            $this->assertFalse($formattedAfterPickup['bisa_jadwalkan_ulang']);

            try {
                $this->pengantaranService->jadwalkanUlang($item1Batch2, $petugas->user, [
                    'tanggal_pengantaran' => '2026-11-11',
                ]);
                $this->fail('Expected ValidationException when transaction is already DIAMBIL.');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('nomor_nota', $e->errors());
            }
        } finally {
            Carbon::setTestNow();
        }
    }
}
