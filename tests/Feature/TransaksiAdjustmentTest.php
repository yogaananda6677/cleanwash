<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TingkatKecepatan;
use App\Enums\UserRole;
use App\Enums\VoucherStatus;
use App\Models\AuditLog;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use App\Services\JenisLayananService;
use App\Services\ProduksiService;
use App\Services\TransaksiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TransaksiAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function createPetugasUser(bool $active = true, bool $withProfile = true, string $name = 'Rina Kasir'): User
    {
        $factory = User::factory()->petugas();
        if (! $active) {
            $factory = $factory->inactive();
        }

        $user = $factory->create(['name' => $name]);

        if ($withProfile) {
            Petugas::create([
                'user_id' => $user->id,
                'nama_petugas' => $user->name,
            ]);
        }

        return $user;
    }

    private function createPegawaiUser(string $name = 'Bambang Produksi'): User
    {
        $user = User::factory()->pegawai()->create(['name' => $name]);
        Pegawai::create([
            'user_id' => $user->id,
            'nama_pegawai' => $user->name,
        ]);

        return $user;
    }

    private function createPengantarUser(string $name = 'Agus Kurir'): User
    {
        $user = User::factory()->pengantar()->create(['name' => $name]);
        PetugasPengantaran::create([
            'user_id' => $user->id,
            'nama_petugas_antar' => $user->name,
        ]);

        return $user;
    }

    private function createPelanggan(string $nama = 'Dewi Lestari', string $phone = '081311112222'): Pelanggan
    {
        return Pelanggan::create([
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Palagan No. 12',
            'boleh_bayar_akhir' => false,
        ]);
    }

    private function createLayanan(
        string $nama,
        TingkatKecepatan $kecepatan = TingkatKecepatan::REGULER,
        MetodeHitung $metode = MetodeHitung::BERAT,
        SatuanLayanan $satuan = SatuanLayanan::KG,
        string $harga = '10000.00',
        bool $perluSetrika = true,
        bool $isActive = true
    ): JenisLayanan {
        return app(JenisLayananService::class)->create([
            'nama_layanan' => $nama,
            'tingkat_kecepatan' => $kecepatan->value,
            'metode_hitung' => $metode->value,
            'satuan' => $satuan->value,
            'harga_satuan' => $harga,
            'perlu_setrika' => $perluSetrika,
            'is_active' => $isActive,
        ]);
    }

    private function createTransaksiViaService(
        Petugas $petugas,
        Pelanggan $pelanggan,
        JenisLayanan $layanan,
        string $qty = '2.00',
        ?string $voucherCode = null,
        string $dp = '0.00'
    ): Transaksi {
        return app(TransaksiService::class)->buatTransaksi($petugas, [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => $qty,
            'nomor_voucher' => $voucherCode,
            'nominal_dp' => $dp,
            'detail_pakaian' => [
                ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
            ],
        ]);
    }

    public function test_adjustment_endpoints_enforce_active_petugas_rbac_and_transaksi_policy(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $inactivePetugas = $this->createPetugasUser(active: false);
        $petugasWithoutProfile = $this->createPetugasUser(active: true, withProfile: false);
        $pegawaiUser = $this->createPegawaiUser();
        $pengantarUser = $this->createPengantarUser();

        $pelanggan = $this->createPelanggan();
        $layananA = $this->createLayanan('Cuci Reguler');
        $layananB = $this->createLayanan('Cuci Express', TingkatKecepatan::EXPRESS, harga: '15000.00');
        $transaksi = $this->createTransaksiViaService($petugas, $pelanggan, $layananA);

        // Guests redirected to login
        $this->post("/transaksi/{$transaksi->nomor_nota}/ubah-layanan", [
            'id_layanan_baru' => $layananB->id_layanan,
            'alasan_perubahan' => 'Ganti layanan',
        ])->assertRedirect('/login');

        $this->post("/transaksi/{$transaksi->nomor_nota}/batalkan", [
            'alasan_pembatalan' => 'Batal nota',
        ])->assertRedirect('/login');

        // PEGAWAI, PENGANTAR, and inactive PETUGAS are rejected 403
        foreach ([$pegawaiUser, $pengantarUser, $inactivePetugas] as $user) {
            $this->actingAs($user)
                ->post("/transaksi/{$transaksi->nomor_nota}/ubah-layanan", [
                    'id_layanan_baru' => $layananB->id_layanan,
                    'alasan_perubahan' => 'Tidak berhak',
                ])
                ->assertForbidden();

            $this->actingAs($user)
                ->post("/transaksi/{$transaksi->nomor_nota}/batalkan", [
                    'alasan_pembatalan' => 'Tidak berhak',
                ])
                ->assertForbidden();
        }

        // Active PETUGAS without Petugas profile is also rejected 403
        $this->actingAs($petugasWithoutProfile)
            ->post("/transaksi/{$transaksi->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananB->id_layanan,
                'alasan_perubahan' => 'Profil petugas tidak ada',
            ])
            ->assertForbidden();

        $this->actingAs($petugasWithoutProfile)
            ->post("/transaksi/{$transaksi->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Profil petugas tidak ada',
            ])
            ->assertForbidden();

        // TransaksiPolicy Gate assertions
        $this->assertTrue(Gate::forUser($petugasUser)->allows('ubahLayanan', $transaksi));
        $this->assertTrue(Gate::forUser($petugasUser)->allows('batalkan', $transaksi));
        $this->assertTrue(Gate::forUser($pegawaiUser)->denies('ubahLayanan', $transaksi));
        $this->assertTrue(Gate::forUser($pengantarUser)->denies('batalkan', $transaksi));

        // Unknown nota returns 404
        $this->actingAs($petugasUser)
            ->postJson('/transaksi/CW-99999999-9999/ubah-layanan', [
                'id_layanan_baru' => $layananB->id_layanan,
                'alasan_perubahan' => 'Nota tidak ada',
            ])
            ->assertNotFound();

        $this->actingAs($petugasUser)
            ->postJson('/transaksi/CW-99999999-9999/batalkan', [
                'alasan_pembatalan' => 'Nota tidak ada',
            ])
            ->assertNotFound();
    }

    public function test_ac_p2_06_petugas_can_change_service_at_diterima_and_dicuci_with_kk09_and_422_guards(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawai = $this->createPegawaiUser()->pegawai()->firstOrFail();
        $pelanggan = $this->createPelanggan();

        $layananReguler = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true);
        $layananExpress = $this->createLayanan('Cuci Setrika', TingkatKecepatan::EXPRESS, MetodeHitung::BERAT, SatuanLayanan::KG, '18000.00', true);
        $layananSepatu = $this->createLayanan('Cuci Sepatu', TingkatKecepatan::REGULER, MetodeHitung::JUMLAH, SatuanLayanan::PCS, '15000.00', false);
        $layananNonaktif = $this->createLayanan('Layanan Nonaktif', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '12000.00', true, false);

        // 1. Happy path at DITERIMA: LUNAS (2.00 * 10000 = 20000 paid) -> Cuci Express (18000) -> 36000 BELUM_LUNAS
        $trxDiterima = $this->createTransaksiViaService($petugas, $pelanggan, $layananReguler, '2.00', null, '20000.00');
        $this->assertSame(StatusPembayaran::LUNAS, $trxDiterima->status_pembayaran);

        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxDiterima->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananExpress->id_layanan,
                'alasan_perubahan' => 'Permintaan percepatan ke layanan Express.',
            ])
            ->assertRedirect("/transaksi/{$trxDiterima->nomor_nota}")
            ->assertSessionHas('success');

        $trxDiterima->refresh();
        $this->assertSame($layananExpress->id_layanan, $trxDiterima->id_layanan);
        $this->assertSame('18000.00', $trxDiterima->harga_satuan_snapshot);
        $this->assertSame('36000.00', $trxDiterima->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_LUNAS, $trxDiterima->status_pembayaran);

        // KK-09 immunity: updating new service master rate afterwards keeps snapshot 18000.00
        $this->actingAs($petugasUser)
            ->put("/layanan/{$layananExpress->id_layanan}", [
                'nama_layanan' => 'Cuci Setrika',
                'tingkat_kecepatan' => TingkatKecepatan::EXPRESS->value,
                'metode_hitung' => MetodeHitung::BERAT->value,
                'satuan' => SatuanLayanan::KG->value,
                'harga_satuan' => '24000.00',
                'perlu_setrika' => true,
                'is_active' => true,
            ])
            ->assertRedirect('/layanan');

        $trxDiterima->refresh();
        $this->assertSame('18000.00', $trxDiterima->harga_satuan_snapshot);
        $this->assertSame('36000.00', $trxDiterima->total_harga);

        // 2. Happy path at DICUCI: BERAT -> JUMLAH, DP 20000 -> 1 * 15000 = 15000 -> LUNAS
        $trxDicuci = $this->createTransaksiViaService($petugas, $pelanggan, $layananReguler, '3.00', null, '20000.00');
        app(ProduksiService::class)->ubahStatusProduksi($trxDicuci->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);

        // Reject missing or fractional quantity when switching BERAT -> JUMLAH
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxDicuci->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananSepatu->id_layanan,
                'alasan_perubahan' => 'Tanpa kuantitas pcs.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('berat_atau_jumlah_baru');

        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxDicuci->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananSepatu->id_layanan,
                'berat_atau_jumlah_baru' => '1.50',
                'alasan_perubahan' => 'Desimal tidak sah untuk pcs.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('berat_atau_jumlah_baru');

        // Valid integer quantity 1 pcs succeeds
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxDicuci->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananSepatu->id_layanan,
                'berat_atau_jumlah_baru' => '1',
                'alasan_perubahan' => 'Koreksi kategori item menjadi sepatu satuan.',
            ])
            ->assertRedirect("/transaksi/{$trxDicuci->nomor_nota}")
            ->assertSessionHas('success');

        $trxDicuci->refresh();
        $this->assertSame($layananSepatu->id_layanan, $trxDicuci->id_layanan);
        $this->assertSame('1.00', $trxDicuci->berat_atau_jumlah);
        $this->assertSame('15000.00', $trxDicuci->harga_satuan_snapshot);
        $this->assertSame('15000.00', $trxDicuci->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxDicuci->status_pembayaran);

        // 3. Reject inactive service, identical service, and Inertia flash error check
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxDiterima->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananNonaktif->id_layanan,
                'alasan_perubahan' => 'Coba layanan nonaktif.',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('id_layanan_baru');

        $this->actingAs($petugasUser)
            ->from("/transaksi/{$trxDiterima->nomor_nota}")
            ->post("/transaksi/{$trxDiterima->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananExpress->id_layanan,
                'alasan_perubahan' => 'Coba layanan identik.',
            ])
            ->assertRedirect("/transaksi/{$trxDiterima->nomor_nota}")
            ->assertSessionHas('error')
            ->assertSessionHasErrors('id_layanan_baru');

        // 4. Reject stages DIKERINGKAN, DISETRIKA, SELESAI and terminal statuses DIAMBIL, DIBATALKAN
        app(ProduksiService::class)->ubahStatusProduksi($trxDiterima->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);
        foreach (['DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
            app(ProduksiService::class)->ubahStatusProduksi($trxDiterima->nomor_nota, $pegawai, ['tahap_status' => $stage]);

            $this->actingAs($petugasUser)
                ->postJson("/transaksi/{$trxDiterima->nomor_nota}/ubah-layanan", [
                    'id_layanan_baru' => $layananReguler->id_layanan,
                    'alasan_perubahan' => "Sudah tahap {$stage}.",
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('id_layanan_baru');
        }

        $trxDiambil = $this->createTransaksiViaService($petugas, $pelanggan, $layananReguler);
        $trxDiambil->update(['status_transaksi' => StatusTransaksi::DIAMBIL]);
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxDiambil->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananExpress->id_layanan,
                'alasan_perubahan' => 'Sudah diambil.',
            ])
            ->assertStatus(422);

        $trxBatal = $this->createTransaksiViaService($petugas, $pelanggan, $layananReguler);
        $trxBatal->update(['status_transaksi' => StatusTransaksi::DIBATALKAN]);
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxBatal->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananExpress->id_layanan,
                'alasan_perubahan' => 'Sudah dibatalkan.',
            ])
            ->assertStatus(422);
    }

    public function test_ac_p2_07_batalkan_at_diterima_releases_voucher_and_allows_immediate_reuse_via_http(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 11, 0, 0, 'Asia/Jakarta'));

        try {
            $petugasUser = $this->createPetugasUser();
            $petugas = $petugasUser->petugas()->firstOrFail();
            $pelanggan = $this->createPelanggan();
            $layanan = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true);

            $voucher = Voucher::create([
                'nomor_voucher' => 'RELEASE20K',
                'nilai' => '20000.00',
                'masa_berlaku' => '2026-11-20',
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ]);

            // Create first transaction via HTTP with RELEASE20K + DP 10000.00
            // 3.00 * 10000 - 20000 = 10000.00 paid 10000.00 -> LUNAS
            $this->actingAs($petugasUser)
                ->post('/transaksi', [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'id_layanan' => $layanan->id_layanan,
                    'berat_atau_jumlah' => '3.00',
                    'nomor_voucher' => 'RELEASE20K',
                    'nominal_dp' => '10000.00',
                    'detail_pakaian' => [
                        ['jenis_pakaian' => 'Selimut', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                    ],
                ])
                ->assertRedirect();

            $firstTrx = Transaksi::where('nomor_voucher', 'RELEASE20K')->firstOrFail();
            $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $voucher->fresh()->status_penggunaan);

            // Reject biaya_pembatalan > 0 on DITERIMA
            $this->actingAs($petugasUser)
                ->postJson("/transaksi/{$firstTrx->nomor_nota}/batalkan", [
                    'alasan_pembatalan' => 'Batal DITERIMA harus gratis.',
                    'biaya_pembatalan' => '5000.00',
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors('biaya_pembatalan');

            // Cancel at DITERIMA
            $this->actingAs($petugasUser)
                ->post("/transaksi/{$firstTrx->nomor_nota}/batalkan", [
                    'alasan_pembatalan' => 'Pelanggan membatalkan sebelum cucian diproses.',
                ])
                ->assertRedirect("/transaksi/{$firstTrx->nomor_nota}")
                ->assertSessionHas('success');

            $firstTrx->refresh();
            $this->assertSame(StatusTransaksi::DIBATALKAN, $firstTrx->status_transaksi);
            $this->assertSame('0.00', $firstTrx->biaya_pembatalan);
            $this->assertSame('0.00', $firstTrx->total_harga);
            $this->assertNull($firstTrx->nomor_voucher);
            $this->assertSame('0.00', $firstTrx->nilai_voucher_snapshot);

            $voucher->refresh();
            $this->assertSame(VoucherStatus::TERSEDIA, $voucher->status_penggunaan);
            $this->assertNull($voucher->digunakan_pada);

            // Validate & reuse RELEASE20K on a brand-new HTTP transaction (no UNIQUE(nomor_voucher) collision!)
            $this->actingAs($petugasUser)
                ->postJson('/voucher/validate', [
                    'nomor_voucher' => 'RELEASE20K',
                ])
                ->assertOk()
                ->assertJsonPath('valid', true)
                ->assertJsonPath('status_penggunaan', 'TERSEDIA');

            $this->actingAs($petugasUser)
                ->post('/transaksi', [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'id_layanan' => $layanan->id_layanan,
                    'berat_atau_jumlah' => '3.00',
                    'nomor_voucher' => 'RELEASE20K',
                    'nominal_dp' => '5000.00',
                    'detail_pakaian' => [
                        ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Normal'],
                    ],
                ])
                ->assertRedirect();

            $secondTrx = Transaksi::where('nomor_voucher', 'RELEASE20K')->firstOrFail();
            $this->assertNotSame($firstTrx->nomor_nota, $secondTrx->nomor_nota);
            $this->assertSame('10000.00', $secondTrx->total_harga);
            $this->assertSame(StatusPembayaran::DP, $secondTrx->status_pembayaran);
            $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $voucher->fresh()->status_penggunaan);

            // Voucher whose masa_berlaku passed before cancellation at DITERIMA becomes KEDALUWARSA
            $expiringVoucher = Voucher::create([
                'nomor_voucher' => 'EXPONCANCEL',
                'nilai' => '5000.00',
                'masa_berlaku' => '2026-11-10',
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ]);
            $trxExpiring = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '2.00', 'EXPONCANCEL', '0.00');

            Carbon::setTestNow(Carbon::create(2026, 11, 11, 8, 0, 0, 'Asia/Jakarta'));

            $this->actingAs($petugasUser)
                ->post("/transaksi/{$trxExpiring->nomor_nota}/batalkan", [
                    'alasan_pembatalan' => 'Batal keesokan hari di tahap DITERIMA.',
                ])
                ->assertRedirect("/transaksi/{$trxExpiring->nomor_nota}");

            $this->assertNull($trxExpiring->fresh()->nomor_voucher);
            $expiringVoucher->refresh();
            $this->assertSame(VoucherStatus::KEDALUWARSA, $expiringVoucher->status_penggunaan);
            $this->assertNull($expiringVoucher->digunakan_pada);

            $this->actingAs($petugasUser)
                ->postJson('/voucher/validate', ['nomor_voucher' => 'EXPONCANCEL'])
                ->assertStatus(422)
                ->assertJsonPath('reason', 'EXPIRED');
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_ac_p2_08_batalkan_after_washing_requires_fee_keeps_voucher_and_rejects_terminal_states(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawai = $this->createPegawaiUser()->pegawai()->firstOrFail();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true);

        Voucher::create([
            'nomor_voucher' => 'USEDKEEP10K',
            'nilai' => '10000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(10)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // 1. Cancel at DICUCI with voucher: 4.00 * 10000 = 40000 subtotal, -10000 voucher = 30000 paid LUNAS
        $trxDicuci = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '4.00', 'USEDKEEP10K', '30000.00');
        app(ProduksiService::class)->ubahStatusProduksi($trxDicuci->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);

        // Reject free cancel (0.00) via JSON and Inertia flash
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxDicuci->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Mencoba batal gratis saat dicuci.',
                'biaya_pembatalan' => '0.00',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('biaya_pembatalan');

        $this->actingAs($petugasUser)
            ->from("/transaksi/{$trxDicuci->nomor_nota}")
            ->post("/transaksi/{$trxDicuci->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Mencoba batal gratis saat dicuci.',
                'biaya_pembatalan' => '0',
            ])
            ->assertRedirect("/transaksi/{$trxDicuci->nomor_nota}")
            ->assertSessionHas('error')
            ->assertSessionHasErrors('biaya_pembatalan');

        // Reject > subtotal_layanan
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxDicuci->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Melebihi subtotal.',
                'biaya_pembatalan' => '40000.01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('biaya_pembatalan');

        // Default 50% of 40000.00 = 20000.00; voucher stays SUDAH_DIGUNAKAN and linked
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxDicuci->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Batal setelah pencucian berjalan.',
            ])
            ->assertRedirect("/transaksi/{$trxDicuci->nomor_nota}")
            ->assertSessionHas('success');

        $trxDicuci->refresh();
        $this->assertSame(StatusTransaksi::DIBATALKAN, $trxDicuci->status_transaksi);
        $this->assertSame('20000.00', $trxDicuci->biaya_pembatalan);
        $this->assertSame('20000.00', $trxDicuci->total_harga);
        $this->assertSame('USEDKEEP10K', $trxDicuci->nomor_voucher);
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, Voucher::findOrFail('USEDKEEP10K')->status_penggunaan);

        // Voucher cannot be reused after post-wash cancellation
        $this->actingAs($petugasUser)
            ->postJson('/voucher/validate', ['nomor_voucher' => 'USEDKEEP10K'])
            ->assertStatus(422)
            ->assertJsonPath('reason', 'ALREADY_USED');

        // 2. Cancel at DIKERINGKAN with custom fee and kompensasi deduction
        $trxDikeringkan = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '3.00', null, '10000.00');
        $trxDikeringkan->update(['total_kompensasi' => '5000.00', 'total_harga' => '25000.00']);
        app(ProduksiService::class)->ubahStatusProduksi($trxDikeringkan->nomor_nota, $pegawai, ['tahap_status' => 'DICUCI']);
        app(ProduksiService::class)->ubahStatusProduksi($trxDikeringkan->nomor_nota, $pegawai, ['tahap_status' => 'DIKERINGKAN']);

        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxDikeringkan->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Batal saat pengeringan dengan biaya negosiasi.',
                'biaya_pembatalan' => '15000.00',
            ])
            ->assertRedirect("/transaksi/{$trxDikeringkan->nomor_nota}");

        $trxDikeringkan->refresh();
        // total_harga = 15000 - 5000 = 10000.00 == 10000.00 paid -> LUNAS
        $this->assertSame('15000.00', $trxDikeringkan->biaya_pembatalan);
        $this->assertSame('10000.00', $trxDikeringkan->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $trxDikeringkan->status_pembayaran);

        // 3. Cancel at DISETRIKA
        $trxDisetrika = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '2.00', null, '0.00');
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA'] as $stage) {
            app(ProduksiService::class)->ubahStatusProduksi($trxDisetrika->nomor_nota, $pegawai, ['tahap_status' => $stage]);
        }

        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trxDisetrika->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Batal saat penyetrikaan.',
            ])
            ->assertRedirect("/transaksi/{$trxDisetrika->nomor_nota}");

        $trxDisetrika->refresh();
        $this->assertSame(StatusTransaksi::DIBATALKAN, $trxDisetrika->status_transaksi);
        $this->assertSame('10000.00', $trxDisetrika->biaya_pembatalan);
        $this->assertSame('10000.00', $trxDisetrika->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_BAYAR, $trxDisetrika->status_pembayaran);

        // 4. Reject cancelling already DIBATALKAN, SELESAI, and DIAMBIL
        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxDisetrika->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Sudah dibatalkan.',
            ])
            ->assertStatus(422);

        $trxSelesai = $this->createTransaksiViaService($petugas, $pelanggan, $layanan, '2.00');
        foreach (['DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'] as $stage) {
            app(ProduksiService::class)->ubahStatusProduksi($trxSelesai->nomor_nota, $pegawai, ['tahap_status' => $stage]);
        }

        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxSelesai->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Sudah SELESAI.',
            ])
            ->assertStatus(422);

        $trxSelesai->update([
            'status_transaksi' => StatusTransaksi::DIAMBIL,
            'diambil_pada' => now('Asia/Jakarta'),
        ]);

        $this->actingAs($petugasUser)
            ->postJson("/transaksi/{$trxSelesai->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Sudah DIAMBIL.',
            ])
            ->assertStatus(422);
    }

    public function test_transaksi_show_props_include_active_layanan_options_and_audit_logs_with_user_and_no_n_plus_1(): void
    {
        $petugasUser = $this->createPetugasUser(name: 'Sari Kasir');
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pegawaiUser = $this->createPegawaiUser(name: 'Joko Produksi');
        $pegawai = $pegawaiUser->pegawai()->firstOrFail();
        $pelanggan = $this->createPelanggan();

        $layananAktif1 = $this->createLayanan('Cuci Setrika', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '10000.00', true, true);
        $layananAktif2 = $this->createLayanan('Cuci Sepatu', TingkatKecepatan::EXPRESS, MetodeHitung::JUMLAH, SatuanLayanan::PCS, '25000.00', false, true);
        $this->createLayanan('Layanan Nonaktif', TingkatKecepatan::REGULER, MetodeHitung::BERAT, SatuanLayanan::KG, '5000.00', true, false);

        $trx = $this->createTransaksiViaService($petugas, $pelanggan, $layananAktif1, '2.00', null, '10000.00');

        // Perform multiple cross-actor audited actions
        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trx->nomor_nota}/ubah-layanan", [
                'id_layanan_baru' => $layananAktif2->id_layanan,
                'berat_atau_jumlah_baru' => '1',
                'alasan_perubahan' => 'Pindah ke layanan sepatu.',
            ])
            ->assertRedirect("/transaksi/{$trx->nomor_nota}");

        app(ProduksiService::class)->ubahStatusProduksi($trx->nomor_nota, $pegawai, [
            'tahap_status' => 'DICUCI',
        ], $pegawaiUser);

        $this->actingAs($petugasUser)
            ->post("/transaksi/{$trx->nomor_nota}/batalkan", [
                'alasan_pembatalan' => 'Dibatalkan saat dicuci.',
            ])
            ->assertRedirect("/transaksi/{$trx->nomor_nota}");

        DB::flushQueryLog();
        DB::enableQueryLog();

        $response = $this->actingAs($petugasUser)->get("/transaksi/{$trx->nomor_nota}");

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertLessThanOrEqual(20, count($queries), 'Possible N+1 query on GET /transaksi/{nota}: '.count($queries));

        $expectedAuditCount = AuditLog::where('subject_id', $trx->nomor_nota)->count();
        $this->assertSame(4, $expectedAuditCount);

        $response
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Show')
                ->where('transaksi.nomor_nota', $trx->nomor_nota)
                ->where('transaksi.status_transaksi', StatusTransaksi::DIBATALKAN->value)
                ->where('transaksi.biaya_pembatalan', '12500.00')
                ->where('transaksi.total_harga', '12500.00')
                ->has('layananOptions', 2)
                ->where('layananOptions.0.id_layanan', $layananAktif2->id_layanan)
                ->has('layananOptions.0.tahap_layanan', 4)
                ->where('layananOptions.1.id_layanan', $layananAktif1->id_layanan)
                ->has('layananOptions.1.tahap_layanan', 5)
                ->has('auditLogs', 4)
                ->where('auditLogs.0.action', 'TRANSAKSI_CANCELLED')
                ->where('auditLogs.0.actor_role', UserRole::PETUGAS->value)
                ->where('auditLogs.0.user.name', 'Sari Kasir')
                ->where('auditLogs.1.action', 'PRODUKSI_STATUS_UPDATED')
                ->where('auditLogs.1.actor_role', UserRole::PEGAWAI->value)
                ->where('auditLogs.1.user.name', 'Joko Produksi')
                ->where('auditLogs.2.action', 'LAYANAN_CHANGED')
                ->where('auditLogs.3.action', 'TRANSAKSI_CREATED')
            );
    }
}
