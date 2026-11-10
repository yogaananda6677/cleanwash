<?php

namespace Tests\Feature;

use App\Enums\JenisBayar;
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
use App\Models\Pegawai;
use App\Models\Pelanggan;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\TahapLayanan;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class Phase1EndToEndTest extends TestCase
{
    use RefreshDatabase;

    public function test_phase_1_end_to_end_reception_to_printable_nota_kk09_kk03_and_cross_actor_rbac(): void
    {
        $this->assertTrue((bool) config('inertia.testing.ensure_pages_exist'));

        $manifestPath = public_path('build/manifest.json');
        $this->assertFileExists($manifestPath, 'Vite build manifest must exist before running E2E test.');

        $manifest = json_decode((string) file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        foreach ([
            'resources/js/Pages/Auth/Login.tsx',
            'resources/js/Pages/Dashboard/Index.tsx',
            'resources/js/Pages/Pelanggan/Index.tsx',
            'resources/js/Pages/Layanan/Index.tsx',
            'resources/js/Pages/Voucher/Index.tsx',
            'resources/js/Pages/Transaksi/Index.tsx',
            'resources/js/Pages/Transaksi/Create.tsx',
            'resources/js/Pages/Transaksi/Show.tsx',
            'resources/js/Pages/Transaksi/Nota.tsx',
        ] as $pageEntry) {
            $this->assertArrayHasKey($pageEntry, $manifest, "Vite manifest missing Phase 1 page entry: {$pageEntry}");
        }

        // Prepare actors across all 3 staff roles
        $petugasUser = User::factory()->petugas()->create([
            'name' => 'Rina Kasir',
            'email' => 'rina.kasir@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        $petugas = Petugas::create([
            'user_id' => $petugasUser->id,
            'nama_petugas' => 'Rina Kasir',
        ]);

        $pegawaiUser = User::factory()->pegawai()->create([
            'name' => 'Bambang Produksi',
            'email' => 'bambang.produksi@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        Pegawai::create([
            'user_id' => $pegawaiUser->id,
            'nama_pegawai' => 'Bambang Produksi',
        ]);

        $pengantarUser = User::factory()->pengantar()->create([
            'name' => 'Agus Kurir',
            'email' => 'agus.kurir@cleanwash.test',
            'password' => Hash::make('secret123'),
        ]);
        PetugasPengantaran::create([
            'user_id' => $pengantarUser->id,
            'nama_petugas_antar' => 'Agus Kurir',
        ]);

        // 1. Petugas login (POST /login) -> access /dashboard (rendered with real Vite manifest)
        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Auth/Login'));

        $this->post('/login', [
            'email' => $petugasUser->email,
            'password' => 'secret123',
        ])->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($petugasUser);

        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('auth.user.role', UserRole::PETUGAS->value)
                ->where('auth.user.actor_id', $petugas->id_petugas)
                ->where('summary.role', UserRole::PETUGAS->value)
            );

        // 2. Create new Pelanggan (boleh_bayar_akhir = false) via POST /pelanggan
        $this->post('/pelanggan', [
            'nama' => 'Siti Nurhaliza',
            'no_telepon' => '081298765432',
            'alamat' => 'Jl. Kaliurang KM 7, Sleman',
            'boleh_bayar_akhir' => false,
        ])->assertRedirect('/pelanggan');

        $pelanggan = Pelanggan::where('no_telepon', '081298765432')->firstOrFail();
        $this->assertFalse($pelanggan->boleh_bayar_akhir);

        $this->get('/pelanggan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pelanggan/Index')
                ->where('pelanggan.data.0.id_pelanggan', $pelanggan->id_pelanggan)
            );

        // 3. Create new JenisLayanan (Cuci Sepatu Kilat, JUMLAH/pcs, perlu_setrika = false, harga_satuan = 30000.00)
        //    and verify TahapLayanan excludes DISETRIKA
        $this->post('/layanan', [
            'nama_layanan' => 'Cuci Sepatu Kilat',
            'tingkat_kecepatan' => TingkatKecepatan::EXPRESS->value,
            'metode_hitung' => MetodeHitung::JUMLAH->value,
            'satuan' => SatuanLayanan::PCS->value,
            'harga_satuan' => '30000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ])->assertRedirect('/layanan');

        $layanan = JenisLayanan::with(['tahapLayanan' => fn ($q) => $q->orderBy('urutan')])
            ->where('nama_layanan', 'Cuci Sepatu Kilat')
            ->firstOrFail();

        $this->assertSame('30000.00', $layanan->harga_satuan);
        $this->assertFalse($layanan->perlu_setrika);
        $stageNames = $layanan->tahapLayanan->map(fn (TahapLayanan $tahap): string => $tahap->nama_tahap->value)->all();
        $this->assertSame(['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'], $stageNames);
        $this->assertNotContains(TahapProduksi::DISETRIKA->value, $stageNames);

        $this->get('/layanan')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Layanan/Index')
                ->where('layanan.data.0.id_layanan', $layanan->id_layanan)
            );

        // 4. Create new Voucher (CLEAN10K, nilai = 10000.00, valid for 14 days) via POST /voucher
        $validUntil = Carbon::today('Asia/Jakarta')->addDays(14)->toDateString();
        $this->post('/voucher', [
            'nomor_voucher' => 'CLEAN10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $validUntil,
        ])->assertRedirect('/voucher');

        $voucher = Voucher::findOrFail('CLEAN10K');
        $this->assertSame('10000.00', $voucher->nilai);
        $this->assertSame(VoucherStatus::TERSEDIA, $voucher->status_penggunaan);

        $this->get('/voucher')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Voucher/Index')
                ->where('voucher.data.0.nomor_voucher', 'CLEAN10K')
            );

        // 5. Open cashier form, validate voucher via POST /voucher/validate (200 valid), then submit transaction
        //    with 2 DetailPakaian rows, berat_atau_jumlah = 2, nomor_voucher = CLEAN10K, nominal_dp = 20000.00
        $this->get('/transaksi/create')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Create')
                ->where('pelangganOptions.0.id_pelanggan', $pelanggan->id_pelanggan)
                ->where('layananOptions.0.id_layanan', $layanan->id_layanan)
            );

        $this->postJson('/voucher/validate', [
            'nomor_voucher' => 'CLEAN10K',
        ])
            ->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('nomor_voucher', 'CLEAN10K')
            ->assertJsonPath('nilai', '10000.00')
            ->assertJsonPath('status_penggunaan', 'TERSEDIA');

        $storeResponse = $this->post('/transaksi', [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2',
            'nomor_voucher' => 'CLEAN10K',
            'nominal_dp' => '20000.00',
            'catatan_khusus' => 'Bersihkan sol putih dengan sikat halus',
            'detail_pakaian' => [
                [
                    'jenis_pakaian' => 'Sneakers Kanvas Putih',
                    'jumlah_potong' => 1,
                    'kondisi_pakaian' => 'Noda lumpur di sol samping',
                ],
                [
                    'jenis_pakaian' => 'Sepatu Running',
                    'jumlah_potong' => 1,
                    'kondisi_pakaian' => 'Tali agak kusam',
                ],
            ],
        ]);

        // 6. Verify redirect to /transaksi/{nota}, inspect Transaksi/Index, Transaksi/Show & Transaksi/Nota
        $createdTransaksi = Transaksi::latest('created_at')->firstOrFail();
        $nota = $createdTransaksi->nomor_nota;
        $this->assertMatchesRegularExpression('/^CW-\d{8}-\d{4}$/', $nota);

        $storeResponse->assertRedirect("/transaksi/{$nota}");

        $this->get('/transaksi')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Index')
                ->where('transaksi.data.0.nomor_nota', $nota)
            );

        $this->get("/transaksi/{$nota}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Show')
                ->where('transaksi.nomor_nota', $nota)
                ->where('transaksi.subtotal_layanan', '60000.00')
                ->where('transaksi.nilai_voucher_snapshot', '10000.00')
                ->where('transaksi.total_harga', '50000.00')
                ->where('transaksi.total_dibayar', '20000.00')
                ->where('transaksi.sisa_tagihan', '30000.00')
                ->where('transaksi.status_pembayaran', StatusPembayaran::DP->value)
            );

        $notaResponse = $this->get("/transaksi/{$nota}/nota");
        $notaResponse->assertOk();
        $notaResponse->assertSee($manifest['resources/js/app.tsx']['file'], false);
        $notaResponse->assertInertia(fn (Assert $page) => $page
            ->component('Transaksi/Nota')
            ->where('transaksi.nomor_nota', $nota)
            ->where('transaksi.berat_atau_jumlah', '2.00')
            ->where('transaksi.harga_satuan_snapshot', '30000.00')
            ->where('transaksi.subtotal_layanan', '60000.00')
            ->where('transaksi.nilai_voucher_snapshot', '10000.00')
            ->where('transaksi.total_harga', '50000.00')
            ->where('transaksi.total_dibayar', '20000.00')
            ->where('transaksi.sisa_tagihan', '30000.00')
            ->where('transaksi.status_pembayaran', StatusPembayaran::DP->value)
            ->where('transaksi.status_transaksi', StatusTransaksi::AKTIF->value)
            ->where('transaksi.catatan_khusus', 'Bersihkan sol putih dengan sikat halus')
            ->where('transaksi.petugas.nama_petugas', 'Rina Kasir')
            ->where('transaksi.pelanggan.nama', 'Siti Nurhaliza')
            ->where('transaksi.pelanggan.no_telepon', '081298765432')
            ->where('transaksi.pelanggan.boleh_bayar_akhir', false)
            ->where('transaksi.layanan.nama_layanan', 'Cuci Sepatu Kilat')
            ->where('transaksi.layanan.satuan', 'pcs')
            ->where('transaksi.layanan.perlu_setrika', false)
            ->has('transaksi.layanan.tahap_layanan', 4)
            ->where('transaksi.voucher.nomor_voucher', 'CLEAN10K')
            ->where('transaksi.voucher.status_penggunaan', VoucherStatus::SUDAH_DIGUNAKAN->value)
            ->has('transaksi.detail_pakaian', 2)
            ->where('transaksi.detail_pakaian.0.jenis_pakaian', 'Sneakers Kanvas Putih')
            ->where('transaksi.detail_pakaian.1.jenis_pakaian', 'Sepatu Running')
            ->has('transaksi.pembayaran', 1)
            ->where('transaksi.pembayaran.0.jenis_bayar', JenisBayar::DP->value)
            ->where('transaksi.pembayaran.0.nominal_bayar', '20000.00')
            ->has('transaksi.riwayat_status_produksi', 1)
            ->where('transaksi.riwayat_status_produksi.0.tahap_status', TahapProduksi::DITERIMA->value)
        );

        $voucher->refresh();
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $voucher->status_penggunaan);
        $this->assertNotNull($voucher->digunakan_pada);

        $this->assertDatabaseHas('audit_logs', [
            'subject_type' => Transaksi::class,
            'subject_id' => $nota,
            'action' => 'TRANSAKSI_CREATED',
        ]);
        $this->assertSame(1, AuditLog::where('subject_id', $nota)->count());

        // 7. Verify KK-09 End-to-End: update master JenisLayanan price to 45000.00 via PUT /layanan/{id}
        //    and verify /transaksi/{nota}/nota preserves snapshot 30000.00, total 50000.00, sisa 30000.00
        $this->put("/layanan/{$layanan->id_layanan}", [
            'nama_layanan' => 'Cuci Sepatu Kilat',
            'tingkat_kecepatan' => TingkatKecepatan::EXPRESS->value,
            'metode_hitung' => MetodeHitung::JUMLAH->value,
            'satuan' => SatuanLayanan::PCS->value,
            'harga_satuan' => '45000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ])->assertRedirect('/layanan');

        $this->assertSame('45000.00', $layanan->fresh()->harga_satuan);

        $this->get("/transaksi/{$nota}/nota")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Nota')
                ->where('transaksi.harga_satuan_snapshot', '30000.00')
                ->where('transaksi.subtotal_layanan', '60000.00')
                ->where('transaksi.nilai_voucher_snapshot', '10000.00')
                ->where('transaksi.total_harga', '50000.00')
                ->where('transaksi.total_dibayar', '20000.00')
                ->where('transaksi.sisa_tagihan', '30000.00')
                ->where('transaksi.layanan.harga_satuan', '45000.00')
            );

        // 8. Verify KK-03 End-to-End: reusing CLEAN10K via /voucher/validate & POST /transaksi is rejected 422
        $this->postJson('/voucher/validate', [
            'nomor_voucher' => 'CLEAN10K',
        ])
            ->assertStatus(422)
            ->assertJsonPath('valid', false)
            ->assertJsonPath('reason', 'ALREADY_USED')
            ->assertJsonValidationErrors(['nomor_voucher']);

        $transaksiCountBeforeReuse = Transaksi::count();
        $this->postJson('/transaksi', [
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_layanan' => $layanan->id_layanan,
            'berat_atau_jumlah' => '2',
            'nomor_voucher' => 'CLEAN10K',
            'nominal_dp' => '10000.00',
            'detail_pakaian' => [
                [
                    'jenis_pakaian' => 'Sepatu Kulit',
                    'jumlah_potong' => 1,
                    'kondisi_pakaian' => 'Normal',
                ],
            ],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nomor_voucher']);

        $this->assertSame($transaksiCountBeforeReuse, Transaksi::count());

        // 9. Verify cross-actor RBAC: PEGAWAI and PENGANTAR receive 403 on /transaksi/{nota}/nota
        $this->post('/logout')->assertRedirect('/login');
        $this->assertGuest();

        foreach ([$pegawaiUser, $pengantarUser] as $nonPetugasUser) {
            $this->post('/login', [
                'email' => $nonPetugasUser->email,
                'password' => 'secret123',
            ])->assertRedirect('/dashboard');

            $this->get("/transaksi/{$nota}/nota")->assertForbidden();

            $this->post('/logout')->assertRedirect('/login');
            $this->assertGuest();
        }
    }
}
