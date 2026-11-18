<?php

namespace Tests\Feature;

use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\RiwayatStatusProduksi;
use App\Models\Transaksi;
use Database\Seeders\CleanWashSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_application_serves_landing_page_and_shares_inertia_props(): void
    {
        $this->withoutVite();

        $landing = $this->get('/');
        $landing->assertOk();
        $landing->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->has('services')
            ->has('activeVouchers')
        );

        $response = $this->get('/login');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/Login')
            ->where('auth.user', null)
            ->has('flash')
        );
    }

    public function test_application_uses_asia_jakarta_timezone_and_isolated_mysql_testing_database(): void
    {
        $this->assertSame('Asia/Jakarta', config('app.timezone'));
        $this->assertSame('mysql', config('database.default'));
        $this->assertSame('3307', (string) config('database.connections.mysql.port'));
        $this->assertSame('cleanwash_testing', DB::connection()->getDatabaseName());

        $version = DB::selectOne('SELECT VERSION() AS version');
        $this->assertNotNull($version);
        $this->assertStringStartsWith('8.4.', (string) $version->version);
    }

    public function test_guest_can_access_public_nota_and_tracking_endpoint(): void
    {
        $this->withoutVite();
        $this->seed(CleanWashSeeder::class);

        // Tracking invalid nota returns 404
        $invalidTrack = $this->getJson('/lacak/CW-INVALID-9999');
        $invalidTrack->assertNotFound();
        $invalidTrack->assertJson([
            'success' => false,
            'message' => 'Nomor nota tidak ditemukan dalam sistem CleanWash.',
        ]);

        // Accessing invalid public receipt returns 404
        $invalidNota = $this->get('/nota/CW-INVALID-9999');
        $invalidNota->assertNotFound();

        // Create transaction with clothes items and production stage
        $pelanggan = Pelanggan::firstOrFail();
        $layanan = JenisLayanan::firstOrFail();
        $petugas = Petugas::firstOrFail();

        $transaksi = Transaksi::create([
            'nomor_nota' => 'CW-20261118-0001',
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $layanan->id_layanan,
            'tanggal_penerimaan' => now('Asia/Jakarta'),
            'berat_atau_jumlah' => '3.00',
            'harga_satuan_snapshot' => $layanan->harga_satuan,
            'nilai_voucher_snapshot' => '0.00',
            'total_kompensasi' => '0.00',
            'biaya_pembatalan' => '0.00',
            'total_harga' => '25500.00',
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        DetailPakaian::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'jenis_pakaian' => 'Kemeja Katun',
            'jumlah_potong' => 4,
            'kondisi_pakaian' => 'Kancing atas lepas',
        ]);

        RiwayatStatusProduksi::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_pegawai' => Pegawai::firstOrFail()->id_pegawai,
            'tahap_status' => TahapProduksi::DITERIMA,
            'waktu_update' => now('Asia/Jakarta'),
        ]);

        // Tracking valid nota returns 200 with itemized JSON details
        $validTrack = $this->getJson("/lacak/{$transaksi->nomor_nota}");
        $validTrack->assertOk();
        $validTrack->assertJson([
            'success' => true,
            'data' => [
                'nomor_nota' => 'CW-20261118-0001',
                'nama_pelanggan' => $pelanggan->nama,
                'total_harga' => '25500.00',
                'status_pembayaran' => 'BELUM_BAYAR',
                'detail_pakaian' => [
                    [
                        'jenis_pakaian' => 'Kemeja Katun',
                        'jumlah_potong' => 4,
                        'kondisi_pakaian' => 'Kancing atas lepas',
                    ],
                ],
            ],
        ]);

        // Accessing public receipt returns 200 with Inertia Transaksi/Nota and isPublicView = true
        $publicReceipt = $this->get("/nota/{$transaksi->nomor_nota}");
        $publicReceipt->assertOk();
        $publicReceipt->assertInertia(fn (Assert $page) => $page
            ->component('Transaksi/Nota')
            ->where('isPublicView', true)
            ->where('transaksi.nomor_nota', 'CW-20261118-0001')
            ->where('transaksi.pelanggan.nama', $pelanggan->nama)
        );
    }
}
