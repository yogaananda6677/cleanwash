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
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\Pelanggan;
use App\Models\Pembayaran;
use App\Models\Petugas;
use App\Models\RiwayatStatusProduksi;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use App\Services\JenisLayananService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TransaksiReceptionTest extends TestCase
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

    private function createPelanggan(string $nama = 'Siti Aminah', string $phone = '081234567890', bool $bolehBayarAkhir = false): Pelanggan
    {
        return Pelanggan::create([
            'nama' => $nama,
            'no_telepon' => $phone,
            'alamat' => 'Jl. Melati No. 10, Yogyakarta',
            'boleh_bayar_akhir' => $bolehBayarAkhir,
        ]);
    }

    private function createLayanan(
        string $nama = 'Cuci Setrika',
        TingkatKecepatan $kecepatan = TingkatKecepatan::REGULER,
        MetodeHitung $metode = MetodeHitung::BERAT,
        SatuanLayanan $satuan = SatuanLayanan::KG,
        string $harga = '8500.00',
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

    public function test_guest_and_non_petugas_roles_cannot_access_transaksi_routes(): void
    {
        $petugasUser = $this->createPetugasUser();
        $petugas = $petugasUser->petugas()->firstOrFail();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan();

        $transaksi = Transaksi::create([
            'nomor_nota' => 'CW-20261110-0001',
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $layanan->id_layanan,
            'tanggal_penerimaan' => now('Asia/Jakarta'),
            'berat_atau_jumlah' => '2.00',
            'harga_satuan_snapshot' => '8500.00',
            'nilai_voucher_snapshot' => '0.00',
            'total_kompensasi' => '0.00',
            'biaya_pembatalan' => '0.00',
            'total_harga' => '17000.00',
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        $this->get('/transaksi')->assertRedirect('/login');
        $this->get('/transaksi/create')->assertRedirect('/login');
        $this->post('/transaksi', [])->assertRedirect('/login');
        $this->get("/transaksi/{$transaksi->nomor_nota}")->assertRedirect('/login');
        $this->get("/transaksi/{$transaksi->nomor_nota}/nota")->assertRedirect('/login');

        $pegawai = User::factory()->pegawai()->create();
        $pengantar = User::factory()->pengantar()->create();
        $inactivePetugas = $this->createPetugasUser(active: false);

        foreach ([$pegawai, $pengantar, $inactivePetugas] as $user) {
            $this->actingAs($user)->get('/transaksi')->assertForbidden();
            $this->actingAs($user)->get('/transaksi/create')->assertForbidden();
            $this->actingAs($user)->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ],
            ])->assertForbidden();
            $this->actingAs($user)->get("/transaksi/{$transaksi->nomor_nota}")->assertForbidden();
            $this->actingAs($user)->get("/transaksi/{$transaksi->nomor_nota}/nota")->assertForbidden();
        }
    }

    public function test_petugas_can_create_transaksi_with_berat_fraction_detail_pakaian_riwayat_and_audit_log(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 11, 10, 10, 15, 0, 'Asia/Jakarta'));

        try {
            $petugasUser = $this->createPetugasUser();
            $petugas = $petugasUser->petugas()->firstOrFail();
            $pelanggan = $this->createPelanggan();
            $layanan = $this->createLayanan(harga: '8500.00');

            // 2.50 kg * 8500.00 = 21250.00
            $response = $this->actingAs($petugasUser)
                ->post('/transaksi', [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'id_layanan' => $layanan->id_layanan,
                    'berat_atau_jumlah' => '2.50',
                    'nominal_dp' => '10000.00',
                    'catatan_khusus' => 'Pisahkan pakaian putih',
                    'detail_pakaian' => [
                        [
                            'jenis_pakaian' => 'Kemeja Putih',
                            'jumlah_potong' => 3,
                            'kondisi_pakaian' => 'Noda ringan di kerah',
                        ],
                        [
                            'jenis_pakaian' => 'Celana Bahan',
                            'jumlah_potong' => 2,
                            'kondisi_pakaian' => 'Baik',
                        ],
                    ],
                ]);

            $response->assertRedirect('/transaksi/CW-20261110-0001');
            $response->assertSessionHas('success');

            $transaksi = Transaksi::with([
                'detailPakaian',
                'pembayaran',
                'riwayatStatusProduksi',
            ])->findOrFail('CW-20261110-0001');

            $this->assertSame($pelanggan->id_pelanggan, $transaksi->id_pelanggan);
            $this->assertSame($petugas->id_petugas, $transaksi->id_petugas);
            $this->assertSame($layanan->id_layanan, $transaksi->id_layanan);
            $this->assertSame('2.50', $transaksi->berat_atau_jumlah);
            $this->assertSame('8500.00', $transaksi->harga_satuan_snapshot);
            $this->assertSame('0.00', $transaksi->nilai_voucher_snapshot);
            $this->assertSame('21250.00', $transaksi->total_harga);
            $this->assertSame(StatusPembayaran::DP, $transaksi->status_pembayaran);
            $this->assertSame(StatusTransaksi::AKTIF, $transaksi->status_transaksi);
            $this->assertSame('Pisahkan pakaian putih', $transaksi->catatan_khusus);

            $this->assertCount(2, $transaksi->detailPakaian);
            $this->assertSame('Kemeja Putih', $transaksi->detailPakaian[0]->jenis_pakaian);
            $this->assertSame(3, $transaksi->detailPakaian[0]->jumlah_potong);

            $this->assertCount(1, $transaksi->pembayaran);
            $this->assertSame(JenisBayar::DP, $transaksi->pembayaran[0]->jenis_bayar);
            $this->assertSame('10000.00', $transaksi->pembayaran[0]->nominal_bayar);

            $this->assertCount(1, $transaksi->riwayatStatusProduksi);
            $this->assertSame(TahapProduksi::DITERIMA, $transaksi->riwayatStatusProduksi[0]->tahap_status);
            $this->assertNull($transaksi->riwayatStatusProduksi[0]->id_pegawai);

            $audit = AuditLog::where('subject_type', Transaksi::class)
                ->where('subject_id', 'CW-20261110-0001')
                ->first();

            $this->assertNotNull($audit);
            $this->assertSame($petugasUser->id, $audit->user_id);
            $this->assertSame(UserRole::PETUGAS->value, $audit->actor_role);
            $this->assertSame('TRANSAKSI_CREATED', $audit->action);
            $this->assertNull($audit->payload_before);
            $this->assertSame('21250.00', $audit->payload_after['total_harga'] ?? null);

            // Second transaction on the same day gets CW-20261110-0002
            $secondResponse = $this->actingAs($petugasUser)
                ->post('/transaksi', [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'id_layanan' => $layanan->id_layanan,
                    'berat_atau_jumlah' => '1.25',
                    'detail_pakaian' => [
                        ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 4, 'kondisi_pakaian' => 'Normal'],
                    ],
                ]);

            $secondResponse->assertRedirect('/transaksi/CW-20261110-0002');
            $second = Transaksi::findOrFail('CW-20261110-0002');
            // 1.25 * 8500.00 = 10625.00
            $this->assertSame('10625.00', $second->total_harga);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_validates_empty_detail_pakaian_inactive_layanan_and_integer_pcs_constraint(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pelanggan = $this->createPelanggan();

        $layananPcs = $this->createLayanan(
            nama: 'Cuci Sepatu',
            kecepatan: TingkatKecepatan::REGULER,
            metode: MetodeHitung::JUMLAH,
            satuan: SatuanLayanan::PCS,
            harga: '25000.00',
            perluSetrika: false,
            isActive: true
        );

        $layananInactive = $this->createLayanan(
            nama: 'Cuci Karpet Nonaktif',
            kecepatan: TingkatKecepatan::REGULER,
            metode: MetodeHitung::JUMLAH,
            satuan: SatuanLayanan::PCS,
            harga: '30000.00',
            perluSetrika: false,
            isActive: false
        );

        // 1. Empty detail_pakaian rejected 422
        $this->actingAs($petugasUser)
            ->postJson('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layananPcs->id_layanan,
                'berat_atau_jumlah' => '2',
                'detail_pakaian' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['detail_pakaian']);

        // 2. Fractional berat_atau_jumlah (2.5) rejected 422 for JUMLAH (pcs)
        $this->actingAs($petugasUser)
            ->postJson('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layananPcs->id_layanan,
                'berat_atau_jumlah' => '2.5',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Sepatu Sneakers', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Sol kotor'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['berat_atau_jumlah']);

        // 3. Inactive service rejected 422
        $this->actingAs($petugasUser)
            ->postJson('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layananInactive->id_layanan,
                'berat_atau_jumlah' => '1',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Karpet', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Berdebu'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['id_layanan']);

        // 4. Integer pcs (e.g. "2" or "2.00") succeeds
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layananPcs->id_layanan,
                'berat_atau_jumlah' => '2',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Sepatu Sneakers', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $created = Transaksi::firstOrFail();
        $this->assertSame('50000.00', $created->total_harga);
    }

    public function test_kk09_updating_master_layanan_price_does_not_alter_existing_transaksi_snapshot_or_totals(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan(
            nama: 'Cuci Komplit',
            kecepatan: TingkatKecepatan::REGULER,
            metode: MetodeHitung::BERAT,
            satuan: SatuanLayanan::KG,
            harga: '8000.00',
            perluSetrika: true,
            isActive: true
        );

        // Create transaction under old price: 3.00 kg * 8000.00 = 24000.00, DP 10000.00 => sisa 14000.00
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'nominal_dp' => '10000.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kaos', 'jumlah_potong' => 5, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $oldTransaksi = Transaksi::firstOrFail();
        $this->assertSame('8000.00', $oldTransaksi->harga_satuan_snapshot);
        $this->assertSame('24000.00', $oldTransaksi->total_harga);

        // Update master JenisLayanan price via PUT /layanan/{id} to 15000.00
        $this->actingAs($petugasUser)
            ->put("/layanan/{$layanan->id_layanan}", [
                'nama_layanan' => 'Cuci Komplit',
                'tingkat_kecepatan' => 'REGULER',
                'metode_hitung' => 'BERAT',
                'satuan' => 'kg',
                'harga_satuan' => '15000.00',
                'perlu_setrika' => true,
                'is_active' => true,
            ])
            ->assertRedirect('/layanan');

        $layanan->refresh();
        $this->assertSame('15000.00', $layanan->harga_satuan);

        // Verify old transaction snapshot & totals remain completely immutable
        $oldTransaksi->refresh();
        $this->assertSame('8000.00', $oldTransaksi->harga_satuan_snapshot);
        $this->assertSame('24000.00', $oldTransaksi->total_harga);

        $this->actingAs($petugasUser)
            ->get("/transaksi/{$oldTransaksi->nomor_nota}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Show', shouldExist: false)
                ->where('transaksi.harga_satuan_snapshot', '8000.00')
                ->where('transaksi.subtotal_layanan', '24000.00')
                ->where('transaksi.total_harga', '24000.00')
                ->where('transaksi.total_dibayar', '10000.00')
                ->where('transaksi.sisa_tagihan', '14000.00')
                ->where('transaksi.layanan.harga_satuan', '15000.00')
            );

        // New transaction created after price update uses the new price 15000.00
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $newTransaksi = Transaksi::where('nomor_nota', '!=', $oldTransaksi->nomor_nota)->firstOrFail();
        $this->assertSame('15000.00', $newTransaksi->harga_satuan_snapshot);
        $this->assertSame('45000.00', $newTransaksi->total_harga);
    }

    public function test_kk03_voucher_claim_locking_rejection_and_atomic_rollback(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan(harga: '10000.00');
        $today = Carbon::today('Asia/Jakarta');

        $validVoucher = Voucher::create([
            'nomor_voucher' => 'HEMAT10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $largeVoucher = Voucher::create([
            'nomor_voucher' => 'DISKON50K',
            'nilai' => '50000.00',
            'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $expiredByDate = Voucher::create([
            'nomor_voucher' => 'EXP_DATE',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->subDay()->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // 1. Valid voucher claimed atomically
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'nomor_voucher' => ' hemat10k ',
                'nominal_dp' => '5000.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 3, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $t1 = Transaksi::where('nomor_voucher', 'HEMAT10K')->firstOrFail();
        $this->assertSame('10000.00', $t1->nilai_voucher_snapshot);
        // 3.00 * 10000.00 - 10000.00 = 20000.00
        $this->assertSame('20000.00', $t1->total_harga);
        $this->assertSame(StatusPembayaran::DP, $t1->status_pembayaran);

        $validVoucher->refresh();
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $validVoucher->status_penggunaan);
        $this->assertNotNull($validVoucher->digunakan_pada);

        // Snapshot counts before invalid attempts
        $transaksiCountBefore = Transaksi::count();
        $detailCountBefore = DetailPakaian::count();
        $pembayaranCountBefore = Pembayaran::count();
        $riwayatCountBefore = RiwayatStatusProduksi::count();
        $auditCountBefore = AuditLog::count();

        // 2. Sequential re-claim of HEMAT10K, expired voucher, and unknown voucher must fail 422 with ZERO partial rows
        foreach (['HEMAT10K', $expiredByDate->nomor_voucher, 'VOUCHER_GA_ADA'] as $badVoucher) {
            $this->actingAs($petugasUser)
                ->postJson('/transaksi', [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'id_layanan' => $layanan->id_layanan,
                    'berat_atau_jumlah' => '2.00',
                    'nomor_voucher' => $badVoucher,
                    'nominal_dp' => '5000.00',
                    'detail_pakaian' => [
                        ['jenis_pakaian' => 'Celana', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                    ],
                ])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['nomor_voucher']);

            $this->assertSame($transaksiCountBefore, Transaksi::count());
            $this->assertSame($detailCountBefore, DetailPakaian::count());
            $this->assertSame($pembayaranCountBefore, Pembayaran::count());
            $this->assertSame($riwayatCountBefore, RiwayatStatusProduksi::count());
            $this->assertSame($auditCountBefore, AuditLog::count());
        }

        // 3. Valid voucher + invalid nominal_dp (> total_harga after discount) must roll back voucher lock completely!
        // 2.00 * 10000 = 20000 - 50000 = 0.00 total_harga, so nominal_dp = 1000.00 exceeds total_harga
        $this->actingAs($petugasUser)
            ->postJson('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'nomor_voucher' => $largeVoucher->nomor_voucher,
                'nominal_dp' => '1000.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nominal_dp']);

        $largeVoucher->refresh();
        $this->assertSame(VoucherStatus::TERSEDIA, $largeVoucher->status_penggunaan);
        $this->assertNull($largeVoucher->digunakan_pada);
        $this->assertSame($transaksiCountBefore, Transaksi::count());
        $this->assertSame($detailCountBefore, DetailPakaian::count());

        // 4. Voucher value >= subtotal clamps total_harga to 0.00 and sets LUNAS automatically without payment row
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'nomor_voucher' => $largeVoucher->nomor_voucher,
                'nominal_dp' => '0.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Jaket', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $tFree = Transaksi::where('nomor_voucher', $largeVoucher->nomor_voucher)->firstOrFail();
        $this->assertSame('0.00', $tFree->total_harga);
        $this->assertSame(StatusPembayaran::LUNAS, $tFree->status_pembayaran);
        $this->assertCount(0, $tFree->pembayaran);
    }

    public function test_dp_payment_status_rules_for_belum_bayar_dp_lunas_and_overpay_rejection(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan(harga: '10000.00');

        // 1. nominal_dp = 0 (omitted or 0.00) with total_harga > 0 => BELUM_BAYAR, 0 Pembayaran rows
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'nominal_dp' => '0.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $tBelum = Transaksi::orderByDesc('nomor_nota')->firstOrFail();
        $this->assertSame(StatusPembayaran::BELUM_BAYAR, $tBelum->status_pembayaran);
        $this->assertCount(0, $tBelum->pembayaran);

        // 2. 0 < nominal_dp < total_harga => DP + 1 Pembayaran(DP)
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'nominal_dp' => '12000.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $tDp = Transaksi::orderByDesc('nomor_nota')->firstOrFail();
        $this->assertSame(StatusPembayaran::DP, $tDp->status_pembayaran);
        $this->assertCount(1, $tDp->pembayaran);
        $this->assertSame(JenisBayar::DP, $tDp->pembayaran[0]->jenis_bayar);
        $this->assertSame('12000.00', $tDp->pembayaran[0]->nominal_bayar);

        // 3. nominal_dp == total_harga => LUNAS + 1 Pembayaran(PELUNASAN)
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'nominal_dp' => '30000.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertRedirect();

        $tLunas = Transaksi::orderByDesc('nomor_nota')->firstOrFail();
        $this->assertSame(StatusPembayaran::LUNAS, $tLunas->status_pembayaran);
        $this->assertCount(1, $tLunas->pembayaran);
        $this->assertSame(JenisBayar::PELUNASAN, $tLunas->pembayaran[0]->jenis_bayar);
        $this->assertSame('30000.00', $tLunas->pembayaran[0]->nominal_bayar);

        // 4. nominal_dp > total_harga => 422 on nominal_dp
        $countBeforeOverpay = Transaksi::count();
        $this->actingAs($petugasUser)
            ->postJson('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '3.00',
                'nominal_dp' => '30000.01',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Kemeja', 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Baik'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nominal_dp']);
        $this->assertSame($countBeforeOverpay, Transaksi::count());
    }

    public function test_inertia_pages_match_phase_1_contracts_and_index_avoids_n_plus_one_queries(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pelangganA = $this->createPelanggan('Andi Wijaya', '081111000111', true);
        $pelangganB = $this->createPelanggan('Budi Santoso', '082222000222', false);

        $layananActive = $this->createLayanan(
            nama: 'Cuci Setrika',
            kecepatan: TingkatKecepatan::REGULER,
            metode: MetodeHitung::BERAT,
            satuan: SatuanLayanan::KG,
            harga: '8000.00',
            perluSetrika: true,
            isActive: true
        );
        $this->createLayanan(
            nama: 'Layanan Nonaktif',
            kecepatan: TingkatKecepatan::EXPRESS,
            metode: MetodeHitung::JUMLAH,
            satuan: SatuanLayanan::PCS,
            harga: '20000.00',
            perluSetrika: false,
            isActive: false
        );

        $voucher = Voucher::create([
            'nomor_voucher' => 'PROMO5K',
            'nilai' => '5000.00',
            'masa_berlaku' => Carbon::today('Asia/Jakarta')->addDays(10)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        // 1. GET /transaksi/create renders active layananOptions with ordered tahap_layanan and pelangganOptions
        $this->actingAs($petugasUser)
            ->get('/transaksi/create')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Create', shouldExist: false)
                ->has('pelangganOptions', 2)
                ->where('pelangganOptions.0.nama', 'Andi Wijaya')
                ->where('pelangganOptions.0.boleh_bayar_akhir', true)
                ->has('layananOptions', 1)
                ->where('layananOptions.0.id_layanan', $layananActive->id_layanan)
                ->where('layananOptions.0.harga_satuan', '8000.00')
                ->has('layananOptions.0.tahap_layanan', 5)
                ->where('layananOptions.0.tahap_layanan.0.nama_tahap', 'DITERIMA')
            );

        // Create 10 transactions to verify full props and absence of N+1 queries
        for ($i = 1; $i <= 10; $i++) {
            $this->actingAs($petugasUser)
                ->post('/transaksi', [
                    'id_pelanggan' => $i === 1 ? $pelangganA->id_pelanggan : $pelangganB->id_pelanggan,
                    'id_layanan' => $layananActive->id_layanan,
                    'berat_atau_jumlah' => '2.50',
                    'nomor_voucher' => $i === 1 ? $voucher->nomor_voucher : null,
                    'nominal_dp' => $i === 1 ? '5000.00' : ($i === 2 ? '20000.00' : '0.00'),
                    'catatan_khusus' => "Catatan {$i}",
                    'detail_pakaian' => [
                        ['jenis_pakaian' => "Item {$i}", 'jumlah_potong' => 2, 'kondisi_pakaian' => 'Normal'],
                    ],
                ])
                ->assertRedirect();
        }

        $targetNota = Transaksi::where('nomor_voucher', 'PROMO5K')->firstOrFail()->nomor_nota;

        // 2. GET /transaksi with 10 rows must stay free of N+1 queries
        DB::flushQueryLog();
        DB::enableQueryLog();

        $indexResponse = $this->actingAs($petugasUser)->get('/transaksi');

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        // Count query + paginate + 7 eager relations = <= 15 queries for 10 transactions (N+1 would be 50+)
        $this->assertLessThanOrEqual(15, count($queries), 'Detected excessive SQL queries (possible N+1) on GET /transaksi: '.count($queries));

        $indexResponse
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Index', shouldExist: false)
                ->where('filters.search', '')
                ->where('filters.status_pembayaran', '')
                ->has('transaksi.data', 10)
                ->where('transaksi.total', 10)
            );

        // 3. Search by customer name, phone, and nomor_nota + filter status_pembayaran
        $this->actingAs($petugasUser)
            ->get('/transaksi?search=Andi&status_pembayaran=DP')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Transaksi/Index', shouldExist: false)
                ->where('filters.search', 'Andi')
                ->where('filters.status_pembayaran', 'DP')
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $targetNota)
                ->where('transaksi.data.0.subtotal_layanan', '20000.00')
                ->where('transaksi.data.0.nilai_voucher_snapshot', '5000.00')
                ->where('transaksi.data.0.total_harga', '15000.00')
                ->where('transaksi.data.0.total_dibayar', '5000.00')
                ->where('transaksi.data.0.sisa_tagihan', '10000.00')
                ->where('transaksi.data.0.pelanggan.nama', 'Andi Wijaya')
                ->where('transaksi.data.0.voucher.nomor_voucher', 'PROMO5K')
                ->has('transaksi.data.0.layanan.tahap_layanan', 5)
                ->has('transaksi.data.0.detail_pakaian', 1)
                ->has('transaksi.data.0.pembayaran', 1)
                ->where('transaksi.data.0.pembayaran.0.petugas.nama_petugas', $petugasUser->name)
                ->has('transaksi.data.0.riwayat_status_produksi', 1)
                ->where('transaksi.data.0.riwayat_status_produksi.0.tahap_status', 'DITERIMA')
                ->where('transaksi.data.0.riwayat_status_produksi.0.id_pegawai', null)
            );

        $this->actingAs($petugasUser)
            ->get('/transaksi?search=081111000111')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $targetNota)
            );

        $this->actingAs($petugasUser)
            ->get("/transaksi?search={$targetNota}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('transaksi.data', 1)
                ->where('transaksi.data.0.nomor_nota', $targetNota)
            );

        // 4. GET /transaksi/{nota} and GET /transaksi/{nota}/nota match full TransaksiDetail contract
        foreach ([
            "/transaksi/{$targetNota}" => 'Transaksi/Show',
            "/transaksi/{$targetNota}/nota" => 'Transaksi/Nota',
        ] as $uri => $component) {
            $this->actingAs($petugasUser)
                ->get($uri)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component($component, shouldExist: false)
                    ->where('transaksi.nomor_nota', $targetNota)
                    ->where('transaksi.berat_atau_jumlah', '2.50')
                    ->where('transaksi.harga_satuan_snapshot', '8000.00')
                    ->where('transaksi.nilai_voucher_snapshot', '5000.00')
                    ->where('transaksi.total_kompensasi', '0.00')
                    ->where('transaksi.biaya_pembatalan', '0.00')
                    ->where('transaksi.subtotal_layanan', '20000.00')
                    ->where('transaksi.total_harga', '15000.00')
                    ->where('transaksi.total_dibayar', '5000.00')
                    ->where('transaksi.sisa_tagihan', '10000.00')
                    ->where('transaksi.status_pembayaran', 'DP')
                    ->where('transaksi.status_transaksi', 'AKTIF')
                    ->where('transaksi.diambil_pada', null)
                    ->where('transaksi.pelanggan.id_pelanggan', $pelangganA->id_pelanggan)
                    ->where('transaksi.petugas.nama_petugas', $petugasUser->name)
                    ->where('transaksi.layanan.id_layanan', $layananActive->id_layanan)
                    ->has('transaksi.layanan.tahap_layanan', 5)
                    ->where('transaksi.voucher.nomor_voucher', 'PROMO5K')
                    ->has('transaksi.detail_pakaian', 1)
                    ->has('transaksi.pembayaran', 1)
                    ->has('transaksi.riwayat_status_produksi', 1)
                );
        }

        // 5. Unknown nomor_nota returns 404 on show and nota
        $this->actingAs($petugasUser)->get('/transaksi/CW-99999999-9999')->assertNotFound();
        $this->actingAs($petugasUser)->get('/transaksi/CW-99999999-9999/nota')->assertNotFound();
    }

    public function test_validates_detail_pakaian_item_fields_and_normalizes_whitespace_voucher(): void
    {
        $petugasUser = $this->createPetugasUser();
        $pelanggan = $this->createPelanggan();
        $layanan = $this->createLayanan(harga: '10000.00');

        $this->actingAs($petugasUser)
            ->postJson('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'nominal_dp' => '-500.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => '   ', 'jumlah_potong' => 0, 'kondisi_pakaian' => ''],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'nominal_dp',
                'detail_pakaian.0.jenis_pakaian',
                'detail_pakaian.0.jumlah_potong',
                'detail_pakaian.0.kondisi_pakaian',
            ]);

        // Whitespace-only nomor_voucher is normalized to null (no voucher applied)
        $this->actingAs($petugasUser)
            ->post('/transaksi', [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $layanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'nomor_voucher' => '   ',
                'nominal_dp' => '',
                'catatan_khusus' => '   ',
                'detail_pakaian' => [
                    ['jenis_pakaian' => '  Jaket  ', 'jumlah_potong' => 1, 'kondisi_pakaian' => '  Normal  '],
                ],
            ])
            ->assertRedirect();

        $created = Transaksi::firstOrFail();
        $this->assertNull($created->nomor_voucher);
        $this->assertNull($created->catatan_khusus);
        $this->assertSame('0.00', $created->nilai_voucher_snapshot);
        $this->assertSame('20000.00', $created->total_harga);
        $this->assertSame(StatusPembayaran::BELUM_BAYAR, $created->status_pembayaran);
        $this->assertSame('Jaket', $created->detailPakaian()->firstOrFail()->jenis_pakaian);
    }
}
