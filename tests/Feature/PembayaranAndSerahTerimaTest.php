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
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Pembayaran;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PembayaranAndSerahTerimaTest extends TestCase
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

    private function createKurirUser(string $name = 'Kurir Andi'): User
    {
        $user = User::factory()->pengantar()->create(['name' => $name]);
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
            'alamat' => 'Jl. Solo KM 7',
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
        $trx = app(TransaksiService::class)->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $qty,
            'nominal_dp' => $dp,
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);

        $produksiService = app(ProduksiService::class);
        foreach ([
            TahapProduksi::DICUCI->value,
            TahapProduksi::DIKERINGKAN->value,
            TahapProduksi::DISETRIKA->value,
            TahapProduksi::SELESAI->value,
        ] as $tahap) {
            $trx = $produksiService->ubahStatusProduksi($trx->nomor_nota, $pegawai, [
                'tahap_status' => $tahap,
            ]);
        }

        return $trx;
    }

    public function test_rbac_blocks_non_petugas_and_inactive_petugas_for_settlement_and_handover(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pegawaiUser = $this->createPegawaiUser();
        $kurirUser = $this->createKurirUser();
        $inactivePetugas = $this->createPetugasUser(false, 'Kasir Nonaktif');
        $pelanggan = $this->createPelanggan('Ani', '0815555001');
        $layanan = $this->createLayanan();

        $trx = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $pelanggan, $layanan);

        // Guest redirected to /login
        $this->get('/serah-terima')->assertRedirect('/login');
        $this->post("/transaksi/{$trx->nomor_nota}/pembayaran", ['nominal_bayar' => '10000.00'])->assertRedirect('/login');
        $this->post("/transaksi/{$trx->nomor_nota}/serah-terima", [])->assertRedirect('/login');

        // PEGAWAI, PENGANTAR, and inactive PETUGAS get 403
        foreach ([$pegawaiUser, $kurirUser, $inactivePetugas] as $forbiddenUser) {
            $this->actingAs($forbiddenUser)->get('/serah-terima')->assertForbidden();
            $this->actingAs($forbiddenUser)->post("/transaksi/{$trx->nomor_nota}/pembayaran", [
                'nominal_bayar' => '10000.00',
            ])->assertForbidden();
            $this->actingAs($forbiddenUser)->post("/transaksi/{$trx->nomor_nota}/serah-terima", [])->assertForbidden();
        }
    }

    public function test_serah_terima_index_returns_inertia_props_filters_and_fits_query_budget(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pegawaiUser = $this->createPegawaiUser();
        $kurirUser = $this->createKurirUser();
        $layanan = $this->createLayanan();

        $reguler = $this->createPelanggan('Pelanggan 100%_Reg', '0816666001', false);
        $paylater = $this->createPelanggan('Hotel Kencana', '0816666002', true);

        $trxSiap = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $reguler, $layanan, '2.00', '20000.00');
        $trxDiantar = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');

        $pengantaran = app(PengantaranService::class)->buatJadwal($petugasUser->petugas, [
            'id_petugas_antar' => $kurirUser->petugasPengantaran->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trxDiantar->nomor_nota],
        ]);
        app(PengantaranService::class)->mulaiPengantaran($pengantaran, $kurirUser->petugasPengantaran);
        app(PengantaranService::class)->updateStatusItem($pengantaran->itemPengantaran->firstOrFail(), $kurirUser->petugasPengantaran, [
            'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
        ]);

        // 2 piutang transactions
        for ($i = 0; $i < 2; $i++) {
            $p = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '2.00', '5000.00');
            app(SerahTerimaService::class)->serahkanPakaian($p->nomor_nota, $petugasUser->petugas);
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($petugasUser)->get('/serah-terima?mode=SIAP_AMBIL&search=100%25_Reg');

        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(20, $queryCount, "Expected <= 20 queries on /serah-terima, got {$queryCount}.");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('SerahTerima/Index')
            ->where('filters.mode', 'SIAP_AMBIL')
            ->where('filters.search', '100%_Reg')
            ->where('summary.siap_ambil_count', 2)
            ->where('summary.sedang_diantar_count', 1)
            ->where('summary.piutang_count', 2)
            ->where('summary.total_piutang_nominal', '30000.00')
            ->has('transaksi.data', 1)
            ->where('transaksi.data.0.nomor_nota', $trxSiap->nomor_nota)
        );

        // Mode PIUTANG
        $this->actingAs($petugasUser)
            ->get('/serah-terima?mode=PIUTANG')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('SerahTerima/Index')
                ->where('filters.mode', 'PIUTANG')
                ->has('transaksi.data', 2)
            );
    }

    public function test_post_pembayaran_handles_settlement_redirects_validation_and_post_adjustment_kk(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pegawaiUser = $this->createPegawaiUser();
        $reguler = $this->createPelanggan('Pak Joko', '0817777001', false);
        $layanan = $this->createLayanan();

        // Nota AKTIF: 2.00 kg * 10000 = 20000, DP 0 -> reweigh KK-01 to 3.00 kg -> 30000 -> pay 10000 -> pay 20000
        $trx = app(TransaksiService::class)->buatTransaksi($petugasUser->petugas, [
            'id_pelanggan' => $reguler->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nominal_dp' => '0.00',
            'detail_pakaian' => [['jenis_pakaian' => 'Selimut', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
        ]);
        app(ProduksiService::class)->timbangUlang($trx->nomor_nota, $pegawaiUser->pegawai, ['berat_aktual' => '3.00']);

        // Partial settlement with default redirect (transaksi.show)
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trx->nomor_nota}/pembayaran", [
                'nominal_bayar' => '10000.00',
            ])
            ->assertRedirect("/transaksi/{$trx->nomor_nota}")
            ->assertSessionHas('success');

        $trx->refresh();
        $this->assertSame(StatusPembayaran::DP, $trx->status_pembayaran);

        // Overpayment rejected 422 (JSON) and flash error (Inertia)
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trx->nomor_nota}/pembayaran", [
                'nominal_bayar' => '20000.01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nominal_bayar']);

        $this->actingAs($petugasUser)
            ->from('/serah-terima')
            ->post("/transaksi/{$trx->nomor_nota}/pembayaran", [
                'nominal_bayar' => '0.00',
                'redirect_to' => 'serah-terima',
            ])
            ->assertRedirect('/serah-terima')
            ->assertSessionHasErrors('nominal_bayar');

        // Final settlement with redirect_to = serah-terima
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trx->nomor_nota}/pembayaran", [
                'nominal_bayar' => '20000.00',
                'redirect_to' => 'serah-terima',
            ])
            ->assertRedirect('/serah-terima')
            ->assertSessionHas('success');

        $trx->refresh();
        $this->assertSame(StatusPembayaran::LUNAS, $trx->status_pembayaran);
        $this->assertSame(2, Pembayaran::where('nomor_nota', $trx->nomor_nota)->count());
        $this->assertSame(2, AuditLog::where('subject_id', $trx->nomor_nota)->where('action', 'PELUNASAN_RECORDED')->count());

        // KK-08 cancelled post-wash with remaining fee can also be settled
        $trxBatal = app(TransaksiService::class)->buatTransaksi($petugasUser->petugas, [
            'id_pelanggan' => $reguler->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2.00',
            'nominal_dp' => '0.00',
            'detail_pakaian' => [['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik']],
        ]);
        app(ProduksiService::class)->ubahStatusProduksi($trxBatal->nomor_nota, $pegawaiUser->pegawai, [
            'tahap_status' => TahapProduksi::DICUCI->value,
        ]);
        app(TransaksiAdjustmentService::class)->batalkanTransaksi($trxBatal->nomor_nota, $petugasUser->petugas, [
            'alasan_pembatalan' => 'Batal pasca cuci',
            'biaya_pembatalan' => '10000.00',
        ]);
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxBatal->nomor_nota}/pembayaran", [
                'nominal_bayar' => '10000.00',
            ])
            ->assertRedirect("/transaksi/{$trxBatal->nomor_nota}");
        $this->assertSame(StatusPembayaran::LUNAS, $trxBatal->refresh()->status_pembayaran);

        // KK-05 incident reduces bill -> remaining reflects compensation
        $trxHilang = app(TransaksiService::class)->buatTransaksi($petugasUser->petugas, [
            'id_pelanggan' => $reguler->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '5.00', // 50000
            'nominal_dp' => '0.00',
            'detail_pakaian' => [['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik']],
        ]);
        $detail = DetailPakaian::where('nomor_nota', $trxHilang->nomor_nota)->firstOrFail();
        $laporan = app(KompensasiService::class)->laporInsiden($pegawaiUser, [
            'nomor_nota' => $trxHilang->nomor_nota,
            'id_detail' => $detail->id_detail,
            'jenis_insiden' => JenisInsiden::HILANG->value,
            'keterangan' => 'Hilang 1 kaos',
        ]);
        app(KompensasiService::class)->konfirmasiKompensasi($petugasUser->petugas, $laporan, [
            'nilai_kompensasi' => '20000.00',
        ]);

        // Remaining is 30000.00 -> paying 30000.01 rejected, paying 30000.00 succeeds
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxHilang->nomor_nota}/pembayaran", ['nominal_bayar' => '30000.01'])
            ->assertStatus(422);
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxHilang->nomor_nota}/pembayaran", ['nominal_bayar' => '30000.00'])
            ->assertRedirect("/transaksi/{$trxHilang->nomor_nota}");
        $this->assertSame(StatusPembayaran::LUNAS, $trxHilang->refresh()->status_pembayaran);
    }

    public function test_post_serah_terima_enforces_kk06_courier_conflict_and_paylater_settlement_flow(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pegawaiUser = $this->createPegawaiUser();
        $kurirUser = $this->createKurirUser();
        $reguler = $this->createPelanggan('Bu Wati', '0818888001', false);
        $paylater = $this->createPelanggan('PT Sejahtera', '0818888002', true);
        $layanan = $this->createLayanan();

        // 1. Regular unpaid -> blocked 422 (KK-06)
        $trxReg = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $reguler, $layanan, '2.00', '5000.00');
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxReg->nomor_nota}/serah-terima", [
                'catatan' => 'Pelanggan datang langsung',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status_pembayaran']);

        // Pay remaining, then handover succeeds -> DIAMBIL + LUNAS
        $this->actingAs($petugasUser)->post("/transaksi/{$trxReg->nomor_nota}/pembayaran", [
            'nominal_bayar' => '15000.00',
        ]);
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxReg->nomor_nota}/serah-terima", [
                'catatan' => 'Sudah lunas',
                'redirect_to' => 'serah-terima',
            ])
            ->assertRedirect('/serah-terima')
            ->assertSessionHas('success');

        $trxReg->refresh();
        $this->assertSame(StatusTransaksi::DIAMBIL, $trxReg->status_transaksi);
        $this->assertSame(StatusPembayaran::LUNAS, $trxReg->status_pembayaran);
        $this->assertNotNull($trxReg->diambil_pada);

        // 2. Paylater unpaid with MENUNGGU item -> auto-closes MENUNGGU to GAGAL, syncs parent Pengantaran to SELESAI, sets DIAMBIL + BELUM_LUNAS
        $trxPaylater = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '2.00', '0.00');
        $pengantaran = app(PengantaranService::class)->buatJadwal($petugasUser->petugas, [
            'id_petugas_antar' => $kurirUser->petugasPengantaran->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trxPaylater->nomor_nota],
        ]);

        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxPaylater->nomor_nota}/serah-terima", [
                'catatan' => 'Diambil staf kantor',
            ])
            ->assertRedirect("/transaksi/{$trxPaylater->nomor_nota}")
            ->assertSessionHas('success');

        $trxPaylater->refresh();
        $pengantaran->refresh();
        $item = $pengantaran->itemPengantaran()->firstOrFail();

        $this->assertSame(StatusTransaksi::DIAMBIL, $trxPaylater->status_transaksi);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxPaylater->status_pembayaran);
        $this->assertSame(StatusItemPengantaran::GAGAL, $item->status_terima_pelanggan);
        $this->assertSame('Diambil langsung oleh pelanggan di loket kasir.', $item->alasan_gagal);
        $this->assertSame(StatusPengantaran::SELESAI, $pengantaran->status_pengantaran);

        // Follow-up settlement on piutang DIAMBIL -> LUNAS
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxPaylater->nomor_nota}/pembayaran", [
                'nominal_bayar' => '20000.00',
                'redirect_to' => 'serah-terima',
            ])
            ->assertRedirect('/serah-terima')
            ->assertSessionHas('success');
        $this->assertSame(StatusPembayaran::LUNAS, $trxPaylater->refresh()->status_pembayaran);

        // 3. In-transit courier item (DIAMBIL) -> loket handover rejected 422
        $trxCourier = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');
        $pengantaran2 = app(PengantaranService::class)->buatJadwal($petugasUser->petugas, [
            'id_petugas_antar' => $kurirUser->petugasPengantaran->id_petugas_antar,
            'tanggal_pengantaran' => now('Asia/Jakarta')->toDateString(),
            'nomor_nota_list' => [$trxCourier->nomor_nota],
        ]);
        app(PengantaranService::class)->mulaiPengantaran($pengantaran2, $kurirUser->petugasPengantaran);
        app(PengantaranService::class)->updateStatusItem($pengantaran2->itemPengantaran->firstOrFail(), $kurirUser->petugasPengantaran, [
            'status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value,
        ]);

        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxCourier->nomor_nota}/serah-terima", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['serah_terima']);
    }
}
