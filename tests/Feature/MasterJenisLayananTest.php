<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Models\JenisLayanan;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\TahapLayanan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MasterJenisLayananTest extends TestCase
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

    public function test_guest_and_non_petugas_roles_cannot_access_layanan_endpoints(): void
    {
        $layanan = JenisLayanan::create([
            'nama_layanan' => 'Cuci Setrika',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '8000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);

        $this->get('/layanan')->assertRedirect('/login');
        $this->post('/layanan', [])->assertRedirect('/login');
        $this->put("/layanan/{$layanan->id_layanan}", [])->assertRedirect('/login');
        $this->delete("/layanan/{$layanan->id_layanan}")->assertRedirect('/login');

        $pegawai = User::factory()->pegawai()->create();
        $pengantar = User::factory()->pengantar()->create();
        $inactivePetugas = $this->createPetugasUser(active: false);

        foreach ([$pegawai, $pengantar, $inactivePetugas] as $user) {
            $this->actingAs($user)->get('/layanan')->assertForbidden();
            $this->actingAs($user)->post('/layanan', [
                'nama_layanan' => 'Baru',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '10000.00',
                'perlu_setrika' => true,
            ])->assertForbidden();
            $this->actingAs($user)->put("/layanan/{$layanan->id_layanan}", [
                'nama_layanan' => 'Cuci Setrika',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '9000.00',
                'perlu_setrika' => true,
            ])->assertForbidden();
            $this->actingAs($user)->delete("/layanan/{$layanan->id_layanan}")->assertForbidden();
        }
    }

    public function test_petugas_can_list_and_search_layanan_with_ordered_tahap_and_decimal_price(): void
    {
        $petugas = $this->createPetugasUser();

        $cuciSetrika = JenisLayanan::create([
            'nama_layanan' => 'Cuci Setrika',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '8000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);
        TahapLayanan::create(['id_layanan' => $cuciSetrika->id_layanan, 'nama_tahap' => TahapProduksi::DITERIMA, 'urutan' => 1]);
        TahapLayanan::create(['id_layanan' => $cuciSetrika->id_layanan, 'nama_tahap' => TahapProduksi::SELESAI, 'urutan' => 2]);

        $cuciSepatu = JenisLayanan::create([
            'nama_layanan' => 'Cuci Sepatu',
            'tingkat_kecepatan' => TingkatKecepatan::EXPRESS,
            'metode_hitung' => MetodeHitung::JUMLAH,
            'satuan' => SatuanLayanan::PCS,
            'harga_satuan' => '40000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ]);
        foreach (TahapProduksi::canonicalSequence(false) as $index => $tahap) {
            TahapLayanan::create([
                'id_layanan' => $cuciSepatu->id_layanan,
                'nama_tahap' => $tahap,
                'urutan' => $index + 1,
            ]);
        }

        $this->actingAs($petugas)
            ->get('/layanan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Layanan/Index')
                ->where('filters.search', '')
                ->has('layanan.data', 2)
                ->where('layanan.data.0.id_layanan', $cuciSepatu->id_layanan)
                ->where('layanan.data.0.harga_satuan', '40000.00')
                ->has('layanan.data.0.tahap_layanan', 4)
                ->where('layanan.data.0.tahap_layanan.0.nama_tahap', 'DITERIMA')
                ->where('layanan.data.0.tahap_layanan.3.nama_tahap', 'SELESAI')
            );

        $this->actingAs($petugas)
            ->get('/layanan?search=Sepatu')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Layanan/Index')
                ->where('filters.search', 'Sepatu')
                ->has('layanan.data', 1)
                ->where('layanan.data.0.id_layanan', $cuciSepatu->id_layanan)
            );
    }

    public function test_petugas_can_create_layanan_with_automatic_canonical_and_custom_tahap_layanan(): void
    {
        $petugas = $this->createPetugasUser();

        $this->actingAs($petugas)
            ->post('/layanan', [
                'nama_layanan' => 'Cuci Kering Lipat',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '7500',
                'perlu_setrika' => true,
            ])
            ->assertRedirect('/layanan')
            ->assertSessionHas('success');

        $layananSetrika = JenisLayanan::with('tahapLayanan')
            ->where('nama_layanan', 'Cuci Kering Lipat')
            ->firstOrFail();

        $this->assertSame('7500.00', $layananSetrika->harga_satuan);
        $this->assertTrue($layananSetrika->is_active);
        $this->assertSame(
            ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'],
            $layananSetrika->tahapLayanan->map(fn (TahapLayanan $t) => $t->nama_tahap->value)->all()
        );

        $this->actingAs($petugas)
            ->post('/layanan', [
                'nama_layanan' => 'Cuci Sepatu Canvas',
                'tingkat_kecepatan' => 'EXPRESS',
                'metode_hitung' => 'JUMLAH',
                'satuan' => 'pcs',
                'harga_satuan' => 35000.5,
                'perlu_setrika' => false,
                'is_active' => true,
            ])
            ->assertRedirect('/layanan');

        $layananSepatu = JenisLayanan::with('tahapLayanan')
            ->where('nama_layanan', 'Cuci Sepatu Canvas')
            ->firstOrFail();

        $this->assertSame('35000.50', $layananSepatu->harga_satuan);
        $sepatuStages = $layananSepatu->tahapLayanan->map(fn (TahapLayanan $t) => $t->nama_tahap->value)->all();
        $this->assertSame(['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'], $sepatuStages);
        $this->assertNotContains('DISETRIKA', $sepatuStages);

        // Custom valid stage sequence when perlu_setrika = true (e.g., Setrika Saja).
        $this->actingAs($petugas)
            ->post('/layanan', [
                'nama_layanan' => 'Setrika Saja',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '5000.00',
                'perlu_setrika' => true,
                'tahap_layanan' => ['DITERIMA', 'DISETRIKA', 'SELESAI'],
            ])
            ->assertRedirect('/layanan');

        $setrikaSaja = JenisLayanan::with('tahapLayanan')
            ->where('nama_layanan', 'Setrika Saja')
            ->firstOrFail();

        $this->assertSame(
            ['DITERIMA', 'DISETRIKA', 'SELESAI'],
            $setrikaSaja->tahapLayanan->map(fn (TahapLayanan $t) => $t->nama_tahap->value)->all()
        );
    }

    public function test_validates_strict_metode_hitung_satuan_pairing_and_tahap_layanan_constraints(): void
    {
        $petugas = $this->createPetugasUser();

        // BERAT must use kg, not pcs.
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Salah Satuan 1',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'pcs',
                'harga_satuan' => '10000.00',
                'perlu_setrika' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['satuan']);

        // JUMLAH must use pcs, not kg.
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Salah Satuan 2',
                'tingkat_kecepatan' => 'EXPRESS',
                'metode_hitung' => 'JUMLAH',
                'satuan' => 'kg',
                'harga_satuan' => '25000.00',
                'perlu_setrika' => false,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['satuan']);

        // Non-positive price or > 2 decimals must fail.
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Harga Invalid',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '0.00',
                'perlu_setrika' => true,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['harga_satuan']);

        // perlu_setrika = false CANNOT include DISETRIKA stage.
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Sepatu Illegal Setrika',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'JUMLAH',
                'satuan' => 'pcs',
                'harga_satuan' => '30000.00',
                'perlu_setrika' => false,
                'tahap_layanan' => ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tahap_layanan']);

        // Custom stage must begin with DITERIMA and end with SELESAI without duplicates.
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Tahap Tidak Valid',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '9000.00',
                'perlu_setrika' => true,
                'tahap_layanan' => ['DICUCI', 'DISETRIKA'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tahap_layanan']);

        // Empty array [] for tahap_layanan must fail min:2 (only null triggers canonical generation).
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Tahap Kosong',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '9000.00',
                'perlu_setrika' => true,
                'tahap_layanan' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tahap_layanan']);

        // Duplicate stages in custom tahap_layanan must be rejected.
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Tahap Duplikat',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '9000.00',
                'perlu_setrika' => true,
                'tahap_layanan' => ['DITERIMA', 'DICUCI', 'DICUCI', 'SELESAI'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tahap_layanan.1', 'tahap_layanan.2']);
    }

    public function test_validates_unique_nama_layanan_and_tingkat_kecepatan_combination(): void
    {
        $petugas = $this->createPetugasUser();

        $this->actingAs($petugas)->post('/layanan', [
            'nama_layanan' => 'Cuci Bedcover',
            'tingkat_kecepatan' => 'REGULER',
            'metode_hitung' => 'JUMLAH',
            'satuan' => 'pcs',
            'harga_satuan' => '30000.00',
            'perlu_setrika' => false,
        ])->assertRedirect('/layanan');

        // Same name with EXPRESS is allowed.
        $this->actingAs($petugas)->post('/layanan', [
            'nama_layanan' => 'Cuci Bedcover',
            'tingkat_kecepatan' => 'EXPRESS',
            'metode_hitung' => 'JUMLAH',
            'satuan' => 'pcs',
            'harga_satuan' => '45000.00',
            'perlu_setrika' => false,
        ])->assertRedirect('/layanan');

        // Same (nama_layanan, tingkat_kecepatan) must fail with 422.
        $this->actingAs($petugas)
            ->postJson('/layanan', [
                'nama_layanan' => 'Cuci Bedcover',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'JUMLAH',
                'satuan' => 'pcs',
                'harga_satuan' => '32000.00',
                'perlu_setrika' => false,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nama_layanan']);

        $express = JenisLayanan::where('nama_layanan', 'Cuci Bedcover')
            ->where('tingkat_kecepatan', TingkatKecepatan::EXPRESS)
            ->firstOrFail();

        // Updating EXPRESS record to REGULER collides with existing REGULER record.
        $this->actingAs($petugas)
            ->putJson("/layanan/{$express->id_layanan}", [
                'nama_layanan' => 'Cuci Bedcover',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'JUMLAH',
                'satuan' => 'pcs',
                'harga_satuan' => '45000.00',
                'perlu_setrika' => false,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nama_layanan']);
    }

    public function test_petugas_can_update_layanan_and_resync_tahap_layanan_when_perlu_setrika_changes(): void
    {
        $petugas = $this->createPetugasUser();

        $this->actingAs($petugas)->post('/layanan', [
            'nama_layanan' => 'Cuci Karpet',
            'tingkat_kecepatan' => 'REGULER',
            'metode_hitung' => 'JUMLAH',
            'satuan' => 'pcs',
            'harga_satuan' => '25000.00',
            'perlu_setrika' => true,
        ])->assertRedirect('/layanan');

        $layanan = JenisLayanan::with('tahapLayanan')->where('nama_layanan', 'Cuci Karpet')->firstOrFail();
        $this->assertCount(5, $layanan->tahapLayanan);

        $this->actingAs($petugas)
            ->put("/layanan/{$layanan->id_layanan}", [
                'nama_layanan' => 'Cuci Karpet Tebal',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'JUMLAH',
                'satuan' => 'pcs',
                'harga_satuan' => '32500.00',
                'perlu_setrika' => false,
                'is_active' => false,
            ])
            ->assertRedirect('/layanan')
            ->assertSessionHas('success');

        $layanan->refresh()->load('tahapLayanan');
        $this->assertSame('Cuci Karpet Tebal', $layanan->nama_layanan);
        $this->assertSame('32500.00', $layanan->harga_satuan);
        $this->assertFalse($layanan->perlu_setrika);
        $this->assertFalse($layanan->is_active);

        $updatedStages = $layanan->tahapLayanan->map(fn (TahapLayanan $t) => $t->nama_tahap->value)->all();
        $this->assertSame(['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'], $updatedStages);
        $this->assertNotContains('DISETRIKA', $updatedStages);
    }

    public function test_cannot_delete_layanan_with_transaksi_but_can_delete_unused_layanan(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();

        $unused = JenisLayanan::create([
            'nama_layanan' => 'Layanan Hapus',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '6000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ]);
        TahapLayanan::create([
            'id_layanan' => $unused->id_layanan,
            'nama_tahap' => TahapProduksi::DITERIMA,
            'urutan' => 1,
        ]);

        $this->actingAs($petugasUser)
            ->delete("/layanan/{$unused->id_layanan}")
            ->assertRedirect('/layanan')
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('jenis_layanan', ['id_layanan' => $unused->id_layanan]);

        $used = JenisLayanan::create([
            'nama_layanan' => 'Layanan Terpakai',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '8000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);

        $pelanggan = Pelanggan::create([
            'nama' => 'Pelanggan Uji',
            'no_telepon' => '081444555666',
            'alamat' => 'Jl. Sudirman',
            'boleh_bayar_akhir' => false,
        ]);

        Transaksi::create([
            'nomor_nota' => 'CW-20261110-0002',
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $used->id_layanan,
            'tanggal_penerimaan' => now(),
            'berat_atau_jumlah' => '3.00',
            'harga_satuan_snapshot' => '8000.00',
            'total_harga' => '24000.00',
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        $this->actingAs($petugasUser)
            ->deleteJson("/layanan/{$used->id_layanan}")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['layanan']);

        $webResponse = $this->actingAs($petugasUser)
            ->from('/layanan')
            ->delete("/layanan/{$used->id_layanan}");

        $webResponse->assertRedirect('/layanan');
        $webResponse->assertSessionHas('error');
        $webResponse->assertSessionHasErrors(['layanan']);
        $this->assertDatabaseHas('jenis_layanan', ['id_layanan' => $used->id_layanan]);
    }
}
