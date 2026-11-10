<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TingkatKecepatan;
use App\Models\JenisLayanan;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MasterPelangganTest extends TestCase
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

    public function test_guest_and_non_petugas_roles_cannot_access_pelanggan_endpoints(): void
    {
        $pelanggan = Pelanggan::create([
            'nama' => 'Siti Aminah',
            'no_telepon' => '081234567801',
            'alamat' => 'Jl. Melati No. 1',
            'boleh_bayar_akhir' => false,
        ]);

        $this->get('/pelanggan')->assertRedirect('/login');
        $this->post('/pelanggan', [])->assertRedirect('/login');
        $this->put("/pelanggan/{$pelanggan->id_pelanggan}", [])->assertRedirect('/login');
        $this->delete("/pelanggan/{$pelanggan->id_pelanggan}")->assertRedirect('/login');

        $pegawai = User::factory()->pegawai()->create();
        $pengantar = User::factory()->pengantar()->create();
        $inactivePetugas = $this->createPetugasUser(active: false);

        foreach ([$pegawai, $pengantar, $inactivePetugas] as $user) {
            $this->actingAs($user)->get('/pelanggan')->assertForbidden();
            $this->actingAs($user)->post('/pelanggan', [
                'nama' => 'Baru',
                'no_telepon' => '081999111222',
                'alamat' => 'Jl. Test',
                'boleh_bayar_akhir' => false,
            ])->assertForbidden();
            $this->actingAs($user)->put("/pelanggan/{$pelanggan->id_pelanggan}", [
                'nama' => 'Ubah',
                'no_telepon' => '081234567801',
                'alamat' => 'Jl. Test',
                'boleh_bayar_akhir' => true,
            ])->assertForbidden();
            $this->actingAs($user)->delete("/pelanggan/{$pelanggan->id_pelanggan}")->assertForbidden();
        }
    }

    public function test_petugas_can_view_and_search_pelanggan_by_name_or_phone(): void
    {
        $petugas = $this->createPetugasUser();

        $budi = Pelanggan::create([
            'nama' => 'Budi Santoso',
            'no_telepon' => '081111222333',
            'alamat' => 'Jl. Kenanga No. 10',
            'boleh_bayar_akhir' => false,
        ]);
        $siti = Pelanggan::create([
            'nama' => 'Siti Aminah',
            'no_telepon' => '089999888777',
            'alamat' => 'Jl. Mawar No. 5',
            'boleh_bayar_akhir' => true,
        ]);

        $this->actingAs($petugas)
            ->get('/pelanggan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pelanggan/Index')
                ->where('filters.search', '')
                ->has('pelanggan.data', 2)
                ->where('pelanggan.total', 2)
                ->where('pelanggan.data.0.id_pelanggan', $siti->id_pelanggan)
                ->where('pelanggan.data.0.boleh_bayar_akhir', true)
                ->where('pelanggan.data.0.transaksi_count', 0)
            );

        $this->actingAs($petugas)
            ->get('/pelanggan?search=Siti')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pelanggan/Index')
                ->where('filters.search', 'Siti')
                ->has('pelanggan.data', 1)
                ->where('pelanggan.data.0.id_pelanggan', $siti->id_pelanggan)
            );

        $this->actingAs($petugas)
            ->get('/pelanggan?search=081111')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pelanggan/Index')
                ->where('filters.search', '081111')
                ->has('pelanggan.data', 1)
                ->where('pelanggan.data.0.id_pelanggan', $budi->id_pelanggan)
            );
    }

    public function test_petugas_can_create_update_toggle_boleh_bayar_akhir_and_delete_unused_pelanggan(): void
    {
        $petugas = $this->createPetugasUser();

        $storeResponse = $this->actingAs($petugas)
            ->post('/pelanggan', [
                'nama' => '  Dewi Lestari  ',
                'no_telepon' => ' 081234567890 ',
                'alamat' => ' Jl. Gejayan No. 88 ',
                'boleh_bayar_akhir' => false,
            ]);

        $storeResponse->assertRedirect('/pelanggan');
        $storeResponse->assertSessionHas('success');

        $pelanggan = Pelanggan::where('no_telepon', '081234567890')->firstOrFail();
        $this->assertSame('Dewi Lestari', $pelanggan->nama);
        $this->assertFalse($pelanggan->boleh_bayar_akhir);

        $toggleOnResponse = $this->actingAs($petugas)
            ->put("/pelanggan/{$pelanggan->id_pelanggan}", [
                'nama' => 'Dewi Lestari Updated',
                'no_telepon' => '081234567890',
                'alamat' => 'Jl. Gejayan No. 99',
                'boleh_bayar_akhir' => true,
            ]);

        $toggleOnResponse->assertRedirect('/pelanggan');
        $toggleOnResponse->assertSessionHas('success');

        $pelanggan->refresh();
        $this->assertSame('Dewi Lestari Updated', $pelanggan->nama);
        $this->assertSame('Jl. Gejayan No. 99', $pelanggan->alamat);
        $this->assertTrue($pelanggan->boleh_bayar_akhir);

        $toggleOffResponse = $this->actingAs($petugas)
            ->patch("/pelanggan/{$pelanggan->id_pelanggan}", [
                'nama' => 'Dewi Lestari Updated',
                'no_telepon' => '081234567890',
                'alamat' => 'Jl. Gejayan No. 99',
                'boleh_bayar_akhir' => false,
            ]);

        $toggleOffResponse->assertRedirect('/pelanggan');
        $this->assertFalse($pelanggan->fresh()->boleh_bayar_akhir);

        $deleteResponse = $this->actingAs($petugas)
            ->delete("/pelanggan/{$pelanggan->id_pelanggan}");

        $deleteResponse->assertRedirect('/pelanggan');
        $deleteResponse->assertSessionHas('success');
        $this->assertDatabaseMissing('pelanggan', ['id_pelanggan' => $pelanggan->id_pelanggan]);
    }

    public function test_duplicate_no_telepon_and_invalid_payloads_are_rejected_with_422(): void
    {
        $petugas = $this->createPetugasUser();

        $pelangganA = Pelanggan::create([
            'nama' => 'Pelanggan A',
            'no_telepon' => '081200000001',
            'alamat' => 'Jl. Pertama',
            'boleh_bayar_akhir' => false,
        ]);

        $pelangganB = Pelanggan::create([
            'nama' => 'Pelanggan B',
            'no_telepon' => '081200000002',
            'alamat' => 'Jl. Kedua',
            'boleh_bayar_akhir' => false,
        ]);

        $this->actingAs($petugas)
            ->postJson('/pelanggan', [
                'nama' => 'Duplikat',
                'no_telepon' => '081200000001',
                'alamat' => 'Jl. Baru',
                'boleh_bayar_akhir' => false,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['no_telepon']);

        $this->actingAs($petugas)
            ->postJson('/pelanggan', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'no_telepon', 'alamat', 'boleh_bayar_akhir']);

        $this->actingAs($petugas)
            ->putJson("/pelanggan/{$pelangganB->id_pelanggan}", [
                'nama' => 'Pelanggan B',
                'no_telepon' => '081200000001',
                'alamat' => 'Jl. Kedua',
                'boleh_bayar_akhir' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['no_telepon']);

        // Updating self with own existing phone number must succeed.
        $this->actingAs($petugas)
            ->put("/pelanggan/{$pelangganA->id_pelanggan}", [
                'nama' => 'Pelanggan A Revisi',
                'no_telepon' => '081200000001',
                'alamat' => 'Jl. Pertama No. 2',
                'boleh_bayar_akhir' => true,
            ])
            ->assertRedirect('/pelanggan');

        $this->assertSame('Pelanggan A Revisi', $pelangganA->fresh()->nama);
    }

    public function test_cannot_delete_pelanggan_who_already_has_transaksi(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();

        $pelanggan = Pelanggan::create([
            'nama' => 'Pelanggan Punya Transaksi',
            'no_telepon' => '081333444555',
            'alamat' => 'Jl. Malioboro',
            'boleh_bayar_akhir' => false,
        ]);

        $layanan = JenisLayanan::create([
            'nama_layanan' => 'Cuci Reguler',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '8000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);

        Transaksi::create([
            'nomor_nota' => 'CW-20261110-0001',
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $layanan->id_layanan,
            'tanggal_penerimaan' => now(),
            'berat_atau_jumlah' => '2.50',
            'harga_satuan_snapshot' => '8000.00',
            'total_harga' => '20000.00',
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        $this->actingAs($petugasUser)
            ->deleteJson("/pelanggan/{$pelanggan->id_pelanggan}")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['pelanggan']);

        $webResponse = $this->actingAs($petugasUser)
            ->from('/pelanggan')
            ->delete("/pelanggan/{$pelanggan->id_pelanggan}");

        $webResponse->assertRedirect('/pelanggan');
        $webResponse->assertSessionHas('error');
        $webResponse->assertSessionHasErrors(['pelanggan']);
        $this->assertDatabaseHas('pelanggan', ['id_pelanggan' => $pelanggan->id_pelanggan]);
    }
}
