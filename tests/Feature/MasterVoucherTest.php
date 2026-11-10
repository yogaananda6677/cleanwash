<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TingkatKecepatan;
use App\Enums\VoucherStatus;
use App\Models\JenisLayanan;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MasterVoucherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function createPetugasUser(bool $active = true): User
    {
        $factory = User::factory()->petugas();
        if (! $active) {
            $factory = $factory->inactive();
        }

        $user = $factory->create();

        Petugas::create([
            'user_id' => $user->id,
            'nama_petugas' => $user->name,
        ]);

        return $user;
    }

    public function test_guest_and_non_petugas_roles_cannot_access_voucher_endpoints_or_validate(): void
    {
        $voucher = Voucher::create([
            'nomor_voucher' => 'HEMAT10K',
            'nilai' => '10000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(10)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $this->get('/voucher')->assertRedirect('/login');
        $this->post('/voucher', [])->assertRedirect('/login');
        $this->put("/voucher/{$voucher->nomor_voucher}", [])->assertRedirect('/login');
        $this->delete("/voucher/{$voucher->nomor_voucher}")->assertRedirect('/login');
        $this->postJson('/voucher/validate', ['nomor_voucher' => 'HEMAT10K'])->assertStatus(401);

        $pegawai = User::factory()->pegawai()->create();
        $pengantar = User::factory()->pengantar()->create();
        $inactivePetugas = $this->createPetugasUser(active: false);

        foreach ([$pegawai, $pengantar, $inactivePetugas] as $user) {
            $this->actingAs($user)->get('/voucher')->assertForbidden();
            $this->actingAs($user)->post('/voucher', [
                'nomor_voucher' => 'TEST123',
                'nilai' => '5000.00',
                'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDay()->toDateString(),
            ])->assertForbidden();
            $this->actingAs($user)->put("/voucher/{$voucher->nomor_voucher}", [
                'nilai' => '12000.00',
                'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(20)->toDateString(),
            ])->assertForbidden();
            $this->actingAs($user)->delete("/voucher/{$voucher->nomor_voucher}")->assertForbidden();
            $this->actingAs($user)->postJson('/voucher/validate', [
                'nomor_voucher' => 'HEMAT10K',
            ])->assertForbidden();
        }
    }

    public function test_petugas_can_list_filter_and_observe_effective_status_for_expired_tersedia_voucher(): void
    {
        $petugas = $this->createPetugasUser();
        $today = Carbon::today('Asia/Jakarta');

        Voucher::create([
            'nomor_voucher' => 'AKTIF10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(14)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // Status in DB is still TERSEDIA, but masa_berlaku already passed.
        Voucher::create([
            'nomor_voucher' => 'STALEEXP',
            'nilai' => '15000.00',
            'masa_berlaku' => $today->copy()->subDays(2)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        Voucher::create([
            'nomor_voucher' => 'SUDAHDIPAKAI',
            'nilai' => '20000.00',
            'masa_berlaku' => $today->copy()->addDays(30)->toDateString(),
            'status_penggunaan' => VoucherStatus::SUDAH_DIGUNAKAN,
            'digunakan_pada' => now(),
        ]);

        $this->actingAs($petugas)
            ->get('/voucher?search=STALEEXP')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Voucher/Index', shouldExist: false)
                ->where('filters.search', 'STALEEXP')
                ->has('voucher.data', 1)
                ->where('voucher.data.0.nomor_voucher', 'STALEEXP')
                ->where('voucher.data.0.status_penggunaan', 'TERSEDIA')
                ->where('voucher.data.0.effective_status', 'KEDALUWARSA')
            );

        $this->actingAs($petugas)
            ->get('/voucher?status=TERSEDIA')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Voucher/Index', shouldExist: false)
                ->where('filters.status', 'TERSEDIA')
                ->has('voucher.data', 1)
                ->where('voucher.data.0.nomor_voucher', 'AKTIF10K')
                ->where('voucher.data.0.effective_status', 'TERSEDIA')
            );

        $this->actingAs($petugas)
            ->get('/voucher?status=KEDALUWARSA')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Voucher/Index', shouldExist: false)
                ->where('filters.status', 'KEDALUWARSA')
                ->has('voucher.data', 1)
                ->where('voucher.data.0.nomor_voucher', 'STALEEXP')
            );
    }

    public function test_petugas_can_create_voucher_with_uppercase_normalization_and_validation_rules(): void
    {
        $petugas = $this->createPetugasUser();
        $today = Carbon::today('Asia/Jakarta');

        $this->actingAs($petugas)
            ->post('/voucher', [
                'nomor_voucher' => '  hemat-25k  ',
                'nilai' => '25000',
                'masa_berlaku' => $today->toDateString(),
            ])
            ->assertRedirect('/voucher')
            ->assertSessionHas('success');

        $voucher = Voucher::findOrFail('HEMAT-25K');
        $this->assertSame('25000.00', $voucher->nilai);
        $this->assertSame(VoucherStatus::TERSEDIA, $voucher->status_penggunaan);

        // Duplicate code (case-insensitive normalization) must be rejected.
        $this->actingAs($petugas)
            ->postJson('/voucher', [
                'nomor_voucher' => 'HEMAT-25K',
                'nilai' => '10000.00',
                'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nomor_voucher']);

        // Value <= 0 and masa_berlaku < today must be rejected on create.
        $this->actingAs($petugas)
            ->postJson('/voucher', [
                'nomor_voucher' => 'INVALID01',
                'nilai' => '0.00',
                'masa_berlaku' => $today->copy()->subDay()->toDateString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nilai', 'masa_berlaku']);

        // Non alpha_dash code (spaces/slashes) must be rejected.
        $this->actingAs($petugas)
            ->postJson('/voucher', [
                'nomor_voucher' => 'HEMAT 25K',
                'nilai' => '25000.00',
                'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nomor_voucher']);
    }

    public function test_petugas_can_update_and_delete_unused_voucher_but_cannot_modify_or_delete_used_voucher(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $today = Carbon::today('Asia/Jakarta');

        $tersedia = Voucher::create([
            'nomor_voucher' => 'EDITABLE10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(10)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $this->actingAs($petugasUser)
            ->put("/voucher/{$tersedia->nomor_voucher}", [
                'nilai' => '12500.00',
                'masa_berlaku' => $today->copy()->addDays(20)->toDateString(),
                'status_penggunaan' => 'KEDALUWARSA',
            ])
            ->assertRedirect('/voucher')
            ->assertSessionHas('success');

        $tersedia->refresh();
        $this->assertSame('12500.00', $tersedia->nilai);
        $this->assertSame(VoucherStatus::KEDALUWARSA, $tersedia->status_penggunaan);

        // Cannot manually force status_penggunaan to SUDAH_DIGUNAKAN via CRUD update.
        $this->actingAs($petugasUser)
            ->putJson("/voucher/{$tersedia->nomor_voucher}", [
                'nilai' => '12500.00',
                'masa_berlaku' => $today->copy()->addDays(20)->toDateString(),
                'status_penggunaan' => 'SUDAH_DIGUNAKAN',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status_penggunaan']);

        // Unused voucher can be deleted.
        $this->actingAs($petugasUser)
            ->delete("/voucher/{$tersedia->nomor_voucher}")
            ->assertRedirect('/voucher')
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('voucher', ['nomor_voucher' => 'EDITABLE10K']);

        // Used voucher cannot be updated, reverted to TERSEDIA, or deleted.
        $usedVoucher = Voucher::create([
            'nomor_voucher' => 'USED20K',
            'nilai' => '20000.00',
            'masa_berlaku' => $today->copy()->addDays(15)->toDateString(),
            'status_penggunaan' => VoucherStatus::SUDAH_DIGUNAKAN,
            'digunakan_pada' => now(),
        ]);

        $pelanggan = Pelanggan::create([
            'nama' => 'Pelanggan Voucher',
            'no_telepon' => '081555666777',
            'alamat' => 'Jl. Ahmad Yani',
            'boleh_bayar_akhir' => false,
        ]);
        $layanan = JenisLayanan::create([
            'nama_layanan' => 'Cuci Kilat',
            'tingkat_kecepatan' => TingkatKecepatan::EXPRESS,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '15000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);
        Transaksi::create([
            'nomor_nota' => 'CW-20261110-0003',
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $layanan->id_layanan,
            'nomor_voucher' => $usedVoucher->nomor_voucher,
            'tanggal_penerimaan' => now(),
            'berat_atau_jumlah' => '3.00',
            'harga_satuan_snapshot' => '15000.00',
            'nilai_voucher_snapshot' => '20000.00',
            'total_harga' => '25000.00',
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        $this->actingAs($petugasUser)
            ->putJson("/voucher/{$usedVoucher->nomor_voucher}", [
                'nilai' => '50000.00',
                'masa_berlaku' => $today->copy()->addDays(30)->toDateString(),
                'status_penggunaan' => 'TERSEDIA',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['voucher']);

        $this->actingAs($petugasUser)
            ->from('/voucher')
            ->put("/voucher/{$usedVoucher->nomor_voucher}", [
                'nilai' => '50000.00',
                'masa_berlaku' => $today->copy()->addDays(30)->toDateString(),
                'status_penggunaan' => 'TERSEDIA',
            ])
            ->assertRedirect('/voucher')
            ->assertSessionHasErrors(['voucher']);

        $this->actingAs($petugasUser)
            ->deleteJson("/voucher/{$usedVoucher->nomor_voucher}")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['voucher']);

        $webDeleteResponse = $this->actingAs($petugasUser)
            ->from('/voucher')
            ->delete("/voucher/{$usedVoucher->nomor_voucher}");

        $webDeleteResponse->assertRedirect('/voucher');
        $webDeleteResponse->assertSessionHas('error');
        $webDeleteResponse->assertSessionHasErrors(['voucher']);
        $this->assertDatabaseHas('voucher', [
            'nomor_voucher' => 'USED20K',
            'status_penggunaan' => 'SUDAH_DIGUNAKAN',
        ]);
    }

    public function test_voucher_validate_endpoint_enforces_kk03_rules_with_200_and_422_reasons(): void
    {
        $petugas = $this->createPetugasUser();
        $today = Carbon::today('Asia/Jakarta');

        $validVoucher = Voucher::create([
            'nomor_voucher' => 'HEMAT10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(7)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $boundaryTodayVoucher = Voucher::create([
            'nomor_voucher' => 'PASDEADLINE',
            'nilai' => '5000.00',
            'masa_berlaku' => $today->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // Status in DB is STILL TERSEDIA, but masa_berlaku < today!
        Voucher::create([
            'nomor_voucher' => 'TERSEDIA_TAPI_EXPIRED',
            'nilai' => '15000.00',
            'masa_berlaku' => $today->copy()->subDay()->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        Voucher::create([
            'nomor_voucher' => 'FLAG_KEDALUWARSA',
            'nilai' => '15000.00',
            'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::KEDALUWARSA,
        ]);

        Voucher::create([
            'nomor_voucher' => 'SUDAH_TERPAKAI',
            'nilai' => '20000.00',
            'masa_berlaku' => $today->copy()->addDays(30)->toDateString(),
            'status_penggunaan' => VoucherStatus::SUDAH_DIGUNAKAN,
            'digunakan_pada' => now(),
        ]);

        // 1. 200 Valid (including lowercase input normalization).
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => ' hemat10k ',
            ])
            ->assertOk()
            ->assertExactJson([
                'valid' => true,
                'nomor_voucher' => 'HEMAT10K',
                'nilai' => '10000.00',
                'masa_berlaku' => $validVoucher->masa_berlaku->toDateString(),
                'status_penggunaan' => 'TERSEDIA',
                'message' => 'Voucher valid dan siap digunakan.',
            ]);

        // Boundary: masa_berlaku == tanggal_transaksi is valid.
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => $boundaryTodayVoucher->nomor_voucher,
                'tanggal_transaksi' => $today->toDateString(),
            ])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('nomor_voucher', 'PASDEADLINE');

        // 2. 422 NOT_FOUND.
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => 'TIDAK_ADA_999',
            ])
            ->assertStatus(422)
            ->assertJsonPath('valid', false)
            ->assertJsonPath('reason', 'NOT_FOUND')
            ->assertJsonValidationErrors(['nomor_voucher']);

        // 3. 422 EXPIRED when DB status is still TERSEDIA but masa_berlaku < today.
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => 'TERSEDIA_TAPI_EXPIRED',
            ])
            ->assertStatus(422)
            ->assertJsonPath('valid', false)
            ->assertJsonPath('reason', 'EXPIRED')
            ->assertJsonValidationErrors(['nomor_voucher']);

        // 422 EXPIRED when explicit tanggal_transaksi exceeds masa_berlaku.
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => 'HEMAT10K',
                'tanggal_transaksi' => $today->copy()->addDays(8)->toDateString(),
            ])
            ->assertStatus(422)
            ->assertJsonPath('valid', false)
            ->assertJsonPath('reason', 'EXPIRED')
            ->assertJsonValidationErrors(['nomor_voucher']);

        // 422 EXPIRED when DB status is KEDALUWARSA.
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => 'FLAG_KEDALUWARSA',
            ])
            ->assertStatus(422)
            ->assertJsonPath('valid', false)
            ->assertJsonPath('reason', 'EXPIRED')
            ->assertJsonValidationErrors(['nomor_voucher']);

        // 4. 422 ALREADY_USED.
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => 'SUDAH_TERPAKAI',
            ])
            ->assertStatus(422)
            ->assertJsonPath('valid', false)
            ->assertJsonPath('reason', 'ALREADY_USED')
            ->assertJsonValidationErrors(['nomor_voucher']);

        // 5. Empty input rejected by ValidateVoucherRequest.
        $this->actingAs($petugas)
            ->postJson('/voucher/validate', [
                'nomor_voucher' => '   ',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nomor_voucher']);
    }
}
