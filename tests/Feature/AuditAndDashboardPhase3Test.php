<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Services\JenisLayananService;
use App\Services\PengantaranService;
use App\Services\ProduksiService;
use App\Services\SerahTerimaService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuditAndDashboardPhase3Test extends TestCase
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
            'alamat' => 'Jl. Kaliurang KM 8',
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
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
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

    public function test_audit_endpoint_enforces_rbac_for_non_petugas_and_inactive_users(): void
    {
        $pegawaiUser = $this->createPegawaiUser();
        $kurirUser = $this->createKurirUser();
        $inactivePetugas = $this->createPetugasUser(false, 'Kasir Nonaktif');

        $this->get('/audit')->assertRedirect('/login');
        $this->actingAs($pegawaiUser)->get('/audit')->assertForbidden();
        $this->actingAs($kurirUser)->get('/audit')->assertForbidden();
        $this->actingAs($inactivePetugas)->get('/audit')->assertForbidden();
    }

    public function test_audit_index_paginates_filters_likes_and_builds_piutang_summary_without_n_plus_one(): void
    {
        $petugasUser = $this->createPetugasUser(true, 'Kasir_50%');
        $pegawaiUser = $this->createPegawaiUser('Pegawai Budi');
        $layanan = $this->createLayanan();
        $paylater = $this->createPelanggan('Hotel Arjuna', '0819999001', true);

        // Generate 3 piutang transactions + multiple audit logs across PETUGAS & PEGAWAI
        $piutangNotas = [];
        for ($i = 0; $i < 3; $i++) {
            $trx = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '2.00', '5000.00');
            app(SerahTerimaService::class)->serahkanPakaian($trx->nomor_nota, $petugasUser->petugas);
            $piutangNotas[] = $trx->nomor_nota;
        }

        // Also create 1 fully paid DIAMBIL nota (must NOT appear in piutangSummary)
        $trxLunas = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');
        app(SerahTerimaService::class)->serahkanPakaian($trxLunas->nomor_nota, $petugasUser->petugas);

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($petugasUser)->get('/audit');

        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(20, $queryCount, "Expected <= 20 queries on /audit, got {$queryCount}.");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Audit/Index')
            ->where('logs.per_page', 15)
            ->has('logs.data', 15)
            ->has('availableActions', 13)
            ->where('piutangSummary.total_nota_piutang', 3)
            ->where('piutangSummary.total_nominal_piutang', '45000.00')
            ->has('piutangSummary.items', 3)
            ->where('piutangSummary.items.0.status_pembayaran', StatusPembayaran::BELUM_LUNAS->value)
            ->where('piutangSummary.items.0.sisa_tagihan', '15000.00')
        );

        // Filter by action + actor_role + search with SQL LIKE wildcards
        $this->actingAs($petugasUser)
            ->get('/audit?action=SERAH_TERIMA&actor_role=PETUGAS&search=Kasir_50%25')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Audit/Index')
                ->where('filters.action', 'SERAH_TERIMA')
                ->where('filters.actor_role', UserRole::PETUGAS->value)
                ->where('filters.search', 'Kasir_50%')
                ->has('logs.data', 4)
            );

        // Verify filter by PEGAWAI & search by subject_id
        $targetNota = $piutangNotas[0];
        $this->actingAs($petugasUser)
            ->get("/audit?actor_role=PEGAWAI&search={$targetNota}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Audit/Index')
                ->has('logs.data', 4)
            );
    }

    public function test_dashboard_exposes_phase3_kpis_for_petugas_and_pengantar_with_wib_boundary_and_no_n_plus_one(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 23, 55, 0, 'Asia/Jakarta'));

        try {
            $petugasUser = $this->createPetugasUser();
            $pegawaiUser = $this->createPegawaiUser();
            $kurirAUser = $this->createKurirUser('Kurir A');
            $kurirBUser = $this->createKurirUser('Kurir B');
            $paylater = $this->createPelanggan('PT Nusantara', '0810000001', true);
            $layanan = $this->createLayanan();

            $pengantaranService = app(PengantaranService::class);
            $serahTerimaService = app(SerahTerimaService::class);

            // 1. Piutang DIAMBIL (BELUM_LUNAS): sisa 15000 + sisa 10000 = 25000
            $trxPiutang1 = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '2.00', '5000.00');
            $serahTerimaService->serahkanPakaian($trxPiutang1->nomor_nota, $petugasUser->petugas);

            $trxPiutang2 = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.50', '5000.00');
            $serahTerimaService->serahkanPakaian($trxPiutang2->nomor_nota, $petugasUser->petugas);

            // 2. Courier A delivery today (2026-11-10 23:55 WIB): 1 DITERIMA today, 1 GAGAL unresolved
            $trxDeliveredToday = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');
            $trxFailedOpen = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');
            $trxFailedRescheduled = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');
            $trxFailedPickedUp = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');

            $sesiA = $pengantaranService->buatJadwal($petugasUser->petugas, [
                'id_petugas_antar' => $kurirAUser->petugasPengantaran->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [
                    $trxDeliveredToday->nomor_nota,
                    $trxFailedOpen->nomor_nota,
                    $trxFailedRescheduled->nomor_nota,
                    $trxFailedPickedUp->nomor_nota,
                ],
            ]);
            $pengantaranService->mulaiPengantaran($sesiA, $kurirAUser->petugasPengantaran);

            foreach ($sesiA->itemPengantaran as $item) {
                $pengantaranService->updateStatusItem($item, $kurirAUser->petugasPengantaran, ['status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value]);
                $pengantaranService->updateStatusItem($item->refresh(), $kurirAUser->petugasPengantaran, ['status_terima_pelanggan' => StatusItemPengantaran::DALAM_PERJALANAN->value]);
            }

            $itemDelivered = $sesiA->itemPengantaran()->where('nomor_nota', $trxDeliveredToday->nomor_nota)->firstOrFail();
            $pengantaranService->updateStatusItem($itemDelivered, $kurirAUser->petugasPengantaran, ['status_terima_pelanggan' => StatusItemPengantaran::DITERIMA->value]);

            $itemFailedOpen = $sesiA->itemPengantaran()->where('nomor_nota', $trxFailedOpen->nomor_nota)->firstOrFail();
            $pengantaranService->updateStatusItem($itemFailedOpen, $kurirAUser->petugasPengantaran, [
                'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                'alasan_gagal' => 'Rumah kosong',
            ]);

            $itemFailedResched = $sesiA->itemPengantaran()->where('nomor_nota', $trxFailedRescheduled->nomor_nota)->firstOrFail();
            $pengantaranService->updateStatusItem($itemFailedResched, $kurirAUser->petugasPengantaran, [
                'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                'alasan_gagal' => 'Dijadwal ulang besok',
            ]);
            $pengantaranService->jadwalkanUlang($itemFailedResched->refresh(), $kurirAUser, [
                'tanggal_pengantaran' => '2026-11-11',
            ]);

            $itemFailedPickedUp = $sesiA->itemPengantaran()->where('nomor_nota', $trxFailedPickedUp->nomor_nota)->firstOrFail();
            $pengantaranService->updateStatusItem($itemFailedPickedUp, $kurirAUser->petugasPengantaran, [
                'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                'alasan_gagal' => 'Pelanggan mau ambil sendiri',
            ]);
            // Hand over at loket -> transaksi becomes DIAMBIL, so NOT needing courier follow-up anymore
            $serahTerimaService->serahkanPakaian($trxFailedPickedUp->nomor_nota, $petugasUser->petugas);

            // Courier B also has 1 DITERIMA item today & 1 active session
            $trxKurirB = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');
            $sesiB = $pengantaranService->buatJadwal($petugasUser->petugas, [
                'id_petugas_antar' => $kurirBUser->petugasPengantaran->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trxKurirB->nomor_nota],
            ]);
            $pengantaranService->mulaiPengantaran($sesiB, $kurirBUser->petugasPengantaran);
            $itemB = $sesiB->itemPengantaran->firstOrFail();
            $pengantaranService->updateStatusItem($itemB, $kurirBUser->petugasPengantaran, ['status_terima_pelanggan' => StatusItemPengantaran::DIAMBIL->value]);
            $pengantaranService->updateStatusItem($itemB->refresh(), $kurirBUser->petugasPengantaran, ['status_terima_pelanggan' => StatusItemPengantaran::DALAM_PERJALANAN->value]);
            $pengantaranService->updateStatusItem($itemB->refresh(), $kurirBUser->petugasPengantaran, ['status_terima_pelanggan' => StatusItemPengantaran::DITERIMA->value]);

            // Add 1 more active session for Kurir B so pengantaran_aktif = 2 (rescheduled + activeB)
            $trxAktifB = $this->createTransaksiSelesai($petugasUser->petugas, $pegawaiUser->pegawai, $paylater, $layanan, '1.00', '10000.00');
            $pengantaranService->buatJadwal($petugasUser->petugas, [
                'id_petugas_antar' => $kurirBUser->petugasPengantaran->id_petugas_antar,
                'tanggal_pengantaran' => '2026-11-10',
                'nomor_nota_list' => [$trxAktifB->nomor_nota],
            ]);

            // Check PETUGAS dashboard
            DB::flushQueryLog();
            DB::enableQueryLog();
            $petugasDash = $this->actingAs($petugasUser)->get('/dashboard');
            $petugasQueries = count(DB::getQueryLog());
            DB::disableQueryLog();

            $this->assertLessThanOrEqual(20, $petugasQueries);
            $petugasDash->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('summary.role', UserRole::PETUGAS->value)
                ->where('summary.pengantaran_aktif', 2)
                ->where('summary.piutang_belum_lunas', 2)
                ->where('summary.piutang_nominal_total', '25000.00')
                ->has('summary.total_pelanggan')
                ->has('summary.transaksi_selesai_siap_ambil')
            );

            // Check PENGANTAR A dashboard at 23:55 WIB
            DB::flushQueryLog();
            DB::enableQueryLog();
            $kurirDash = $this->actingAs($kurirAUser)->get('/dashboard');
            $kurirQueries = count(DB::getQueryLog());
            DB::disableQueryLog();

            $this->assertLessThanOrEqual(20, $kurirQueries);
            $kurirDash->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('summary.role', UserRole::PENGANTAR->value)
                ->where('summary.jadwal_pengantaran_aktif', 1)
                ->where('summary.item_pengantaran_aktif', 1)
                ->where('summary.item_terkirim_hari_ini', 1)
                ->where('summary.item_gagal_perlu_tindak_lanjut', 1)
            );

            // Advance 10 minutes to 2026-11-11 00:05 WIB -> yesterday's delivered item must drop to 0
            Carbon::setTestNow(Carbon::create(2026, 11, 11, 0, 5, 0, 'Asia/Jakarta'));
            $this->actingAs($kurirAUser)
                ->get('/dashboard')
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Dashboard/Index')
                    ->where('summary.item_terkirim_hari_ini', 0)
                    ->where('summary.item_gagal_perlu_tindak_lanjut', 1)
                );
        } finally {
            Carbon::setTestNow();
        }
    }
}
