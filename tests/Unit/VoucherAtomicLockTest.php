<?php

namespace Tests\Unit;

use App\Enums\JenisBayar;
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
use App\Services\PembayaranService;
use App\Services\TransaksiService;
use App\Services\VoucherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;

class VoucherAtomicLockTest extends TestCase
{
    use RefreshDatabase;

    private function createPetugas(): Petugas
    {
        $user = User::factory()->petugas()->create();

        return Petugas::create([
            'user_id' => $user->id,
            'nama_petugas' => $user->name,
        ]);
    }

    private function createTransaksiRecord(Petugas $petugas, string $totalHarga = '50000.00'): Transaksi
    {
        $pelanggan = Pelanggan::create([
            'nama' => 'Pelanggan Unit',
            'no_telepon' => '08110000'.random_int(1000, 9999),
            'alamat' => 'Jl. Unit Test',
            'boleh_bayar_akhir' => false,
        ]);

        $layanan = JenisLayanan::create([
            'nama_layanan' => 'Layanan Unit '.random_int(100, 999),
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '10000.00',
            'perlu_setrika' => true,
            'is_active' => true,
        ]);

        return Transaksi::create([
            'nomor_nota' => 'CW-20261110-'.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT),
            'id_pelanggan' => $pelanggan->id_pelanggan,
            'id_petugas' => $petugas->id_petugas,
            'id_layanan' => $layanan->id_layanan,
            'tanggal_penerimaan' => now('Asia/Jakarta'),
            'berat_atau_jumlah' => '5.00',
            'harga_satuan_snapshot' => '10000.00',
            'nilai_voucher_snapshot' => '0.00',
            'total_kompensasi' => '0.00',
            'biaya_pembatalan' => '0.00',
            'total_harga' => $totalHarga,
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);
    }

    public function test_validasi_dan_kunci_locks_valid_voucher_and_marks_it_used(): void
    {
        $today = Carbon::today('Asia/Jakarta');

        Voucher::create([
            'nomor_voucher' => 'LOCK10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $service = app(VoucherService::class);

        $locked = DB::transaction(fn (): Voucher => $service->validasiDanKunci('  lock10k  ', $today->toDateString()));

        $this->assertSame('LOCK10K', $locked->nomor_voucher);
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $locked->status_penggunaan);
        $this->assertNotNull($locked->digunakan_pada);

        $fresh = Voucher::findOrFail('LOCK10K');
        $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $fresh->status_penggunaan);
        $this->assertNotNull($fresh->digunakan_pada);
    }

    public function test_validasi_dan_kunci_rejects_missing_expired_and_already_used_vouchers(): void
    {
        $today = Carbon::today('Asia/Jakarta');

        Voucher::create([
            'nomor_voucher' => 'EXPIRED_DATE',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->subDay()->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        Voucher::create([
            'nomor_voucher' => 'EXPIRED_FLAG',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::KEDALUWARSA,
        ]);

        Voucher::create([
            'nomor_voucher' => 'USED_VOUCHER',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::SUDAH_DIGUNAKAN,
            'digunakan_pada' => now('Asia/Jakarta'),
        ]);

        $service = app(VoucherService::class);

        foreach (['UNKNOWN_CODE', 'EXPIRED_DATE', 'EXPIRED_FLAG', 'USED_VOUCHER'] as $code) {
            try {
                DB::transaction(fn () => $service->validasiDanKunci($code, $today->toDateString()));
                $this->fail("Expected ValidationException for voucher [{$code}].");
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('nomor_voucher', $exception->errors());
            }
        }
    }

    public function test_validasi_dan_kunci_rolls_back_when_outer_transaction_fails(): void
    {
        $today = Carbon::today('Asia/Jakarta');

        Voucher::create([
            'nomor_voucher' => 'ROLLBACK10K',
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(3)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        $service = app(VoucherService::class);

        try {
            DB::transaction(function () use ($service, $today): void {
                $locked = $service->validasiDanKunci('ROLLBACK10K', $today->toDateString());
                $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $locked->status_penggunaan);

                throw new RuntimeException('Simulated failure after voucher lock');
            });
            $this->fail('Expected RuntimeException to trigger transaction rollback.');
        } catch (RuntimeException) {
            // Expected rollback trigger.
        }

        $voucher = Voucher::findOrFail('ROLLBACK10K');
        $this->assertSame(VoucherStatus::TERSEDIA, $voucher->status_penggunaan);
        $this->assertNull($voucher->digunakan_pada);
    }

    public function test_pembayaran_service_records_initial_payments_and_rejects_overpayment(): void
    {
        $petugas = $this->createPetugas();
        $service = app(PembayaranService::class);
        $now = now('Asia/Jakarta');

        // 1. DP = 0, total > 0 => BELUM_BAYAR, no Pembayaran row
        $t1 = $this->createTransaksiRecord($petugas, '50000.00');
        $this->assertSame(StatusPembayaran::BELUM_BAYAR, $service->resolveStatusPembayaranAwal('0.00', '50000.00'));
        $service->catatPembayaranAwal($t1, $petugas, '0.00', '50000.00', $now);
        $this->assertCount(0, $t1->pembayaran()->get());

        // 2. 0 < DP < total => DP, 1 Pembayaran(DP)
        $t2 = $this->createTransaksiRecord($petugas, '50000.00');
        $this->assertSame(StatusPembayaran::DP, $service->resolveStatusPembayaranAwal('15000.00', '50000.00'));
        $service->catatPembayaranAwal($t2, $petugas, '15000.00', '50000.00', $now);
        $p2 = $t2->pembayaran()->firstOrFail();
        $this->assertSame(JenisBayar::DP, $p2->jenis_bayar);
        $this->assertSame('15000.00', $p2->nominal_bayar);

        // 3. DP == total (> 0) => LUNAS, 1 Pembayaran(PELUNASAN)
        $t3 = $this->createTransaksiRecord($petugas, '50000.00');
        $this->assertSame(StatusPembayaran::LUNAS, $service->resolveStatusPembayaranAwal('50000.00', '50000.00'));
        $service->catatPembayaranAwal($t3, $petugas, '50000.00', '50000.00', $now);
        $p3 = $t3->pembayaran()->firstOrFail();
        $this->assertSame(JenisBayar::PELUNASAN, $p3->jenis_bayar);
        $this->assertSame('50000.00', $p3->nominal_bayar);

        // 4. total == 0, DP == 0 => LUNAS, 0 Pembayaran rows
        $t4 = $this->createTransaksiRecord($petugas, '0.00');
        $this->assertSame(StatusPembayaran::LUNAS, $service->resolveStatusPembayaranAwal('0.00', '0.00'));
        $service->catatPembayaranAwal($t4, $petugas, '0.00', '0.00', $now);
        $this->assertCount(0, $t4->pembayaran()->get());

        // 5. DP > total => ValidationException on nominal_dp
        $t5 = $this->createTransaksiRecord($petugas, '50000.00');
        $this->expectException(ValidationException::class);
        $service->catatPembayaranAwal($t5, $petugas, '50000.01', '50000.00', $now);
    }

    public function test_transaksi_service_generates_sequential_daily_nomor_nota(): void
    {
        $petugas = $this->createPetugas();
        $service = app(TransaksiService::class);
        $date = Carbon::create(2026, 11, 10, 9, 30, 0, 'Asia/Jakarta');

        $first = DB::transaction(fn (): string => $service->generateNomorNota($date));
        $this->assertSame('CW-20261110-0001', $first);

        $pelanggan = Pelanggan::create([
            'nama' => 'Pelanggan Nota',
            'no_telepon' => '081900001111',
            'alamat' => 'Jl. Nota',
            'boleh_bayar_akhir' => false,
        ]);
        $layanan = JenisLayanan::create([
            'nama_layanan' => 'Layanan Nota',
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
            'tanggal_penerimaan' => $date,
            'berat_atau_jumlah' => '2.00',
            'harga_satuan_snapshot' => '8000.00',
            'total_harga' => '16000.00',
            'status_pembayaran' => StatusPembayaran::BELUM_BAYAR,
            'status_transaksi' => StatusTransaksi::AKTIF,
        ]);

        $second = DB::transaction(fn (): string => $service->generateNomorNota($date));
        $this->assertSame('CW-20261110-0002', $second);

        // Next day resets sequence to 0001
        $nextDay = $date->copy()->addDay();
        $nextDayFirst = DB::transaction(fn (): string => $service->generateNomorNota($nextDay));
        $this->assertSame('CW-20261111-0001', $nextDayFirst);
    }

    public function test_pembayaran_service_rejects_negative_dp(): void
    {
        $service = app(PembayaranService::class);

        $this->expectException(ValidationException::class);
        $service->resolveStatusPembayaranAwal('-5000.00', '50000.00');
    }

    public function test_transaksi_service_enforces_active_layanan_and_integer_jumlah_even_outside_http(): void
    {
        $petugas = $this->createPetugas();
        $pelanggan = Pelanggan::create([
            'nama' => 'Pelanggan Direct',
            'no_telepon' => '081955556666',
            'alamat' => 'Jl. Direct',
            'boleh_bayar_akhir' => false,
        ]);

        $inactiveLayanan = JenisLayanan::create([
            'nama_layanan' => 'Layanan Nonaktif Direct',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::BERAT,
            'satuan' => SatuanLayanan::KG,
            'harga_satuan' => '9000.00',
            'perlu_setrika' => true,
            'is_active' => false,
        ]);

        $pcsLayanan = JenisLayanan::create([
            'nama_layanan' => 'Layanan Satuan Direct',
            'tingkat_kecepatan' => TingkatKecepatan::REGULER,
            'metode_hitung' => MetodeHitung::JUMLAH,
            'satuan' => SatuanLayanan::PCS,
            'harga_satuan' => '15000.00',
            'perlu_setrika' => false,
            'is_active' => true,
        ]);

        $service = app(TransaksiService::class);

        try {
            $service->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $inactiveLayanan->id_layanan,
                'berat_atau_jumlah' => '2.00',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Baju', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ],
            ]);
            $this->fail('Expected ValidationException for inactive service.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('id_layanan', $exception->errors());
        }

        try {
            $service->buatTransaksi($petugas, [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_layanan' => $pcsLayanan->id_layanan,
                'berat_atau_jumlah' => '1.50',
                'detail_pakaian' => [
                    ['jenis_pakaian' => 'Sepatu', 'jumlah_potong' => 1, 'kondisi_pakaian' => 'Baik'],
                ],
            ]);
            $this->fail('Expected ValidationException for fractional JUMLAH quantity.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('berat_atau_jumlah', $exception->errors());
        }
    }
}
