<?php

namespace Tests\Feature;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\TingkatKecepatan;
use App\Enums\VoucherStatus;
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\JenisLayanan;
use App\Models\Pelanggan;
use App\Models\Pembayaran;
use App\Models\Petugas;
use App\Models\RiwayatStatusProduksi;
use App\Models\TahapLayanan;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\Voucher;
use App\Services\JenisLayananService;
use App\Services\VoucherService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class VoucherConcurrencyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (! Schema::hasTable('voucher')) {
            Artisan::call('migrate', ['--force' => true]);
        }
    }

    /**
     * Clean up committed test rows in reverse FK order so RefreshDatabase tests stay pristine.
     */
    private function cleanupConcurrencyArtifacts(?int $userId, ?int $petugasId, ?int $pelangganId, ?int $layananId, string $voucherCode): void
    {
        $notas = Transaksi::query()
            ->where(function ($query) use ($voucherCode, $pelangganId): void {
                $query->where('nomor_voucher', $voucherCode);
                if ($pelangganId !== null) {
                    $query->orWhere('id_pelanggan', $pelangganId);
                }
            })
            ->pluck('nomor_nota')
            ->all();

        if ($notas !== []) {
            AuditLog::where('subject_type', Transaksi::class)->whereIn('subject_id', $notas)->delete();
            RiwayatStatusProduksi::whereIn('nomor_nota', $notas)->delete();
            Pembayaran::whereIn('nomor_nota', $notas)->delete();
            DetailPakaian::whereIn('nomor_nota', $notas)->delete();
            Transaksi::whereIn('nomor_nota', $notas)->delete();
        }

        Voucher::where('nomor_voucher', $voucherCode)->delete();

        if ($layananId !== null) {
            TahapLayanan::where('id_layanan', $layananId)->delete();
            JenisLayanan::where('id_layanan', $layananId)->delete();
        }

        if ($pelangganId !== null) {
            Pelanggan::where('id_pelanggan', $pelangganId)->delete();
        }

        if ($petugasId !== null) {
            Petugas::where('id_petugas', $petugasId)->delete();
        }

        if ($userId !== null) {
            User::where('id', $userId)->delete();
        }
    }

    public function test_validasi_dan_kunci_acquires_real_mysql_for_update_row_lock(): void
    {
        $voucherCode = 'LOCKROW10K';
        $today = Carbon::today('Asia/Jakarta');

        Voucher::where('nomor_voucher', $voucherCode)->delete();
        Voucher::create([
            'nomor_voucher' => $voucherCode,
            'nilai' => '10000.00',
            'masa_berlaku' => $today->copy()->addDays(5)->toDateString(),
            'status_penggunaan' => VoucherStatus::TERSEDIA,
        ]);

        Config::set('database.connections.mysql_peer', Config::get('database.connections.mysql'));
        DB::purge('mysql_peer');

        $peer = DB::connection('mysql_peer');
        $peer->statement('SET SESSION innodb_lock_wait_timeout = 1');

        try {
            DB::beginTransaction();

            $voucherService = app(VoucherService::class);
            $locked = $voucherService->validasiDanKunci($voucherCode, $today->toDateString());
            $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $locked->status_penggunaan);

            // Second connection must block and fail with InnoDB lock wait timeout (1205) while lock is held.
            $timedOut = false;
            try {
                $peer->beginTransaction();
                $peer->table('voucher')
                    ->where('nomor_voucher', $voucherCode)
                    ->lockForUpdate()
                    ->first();
                $peer->commit();
            } catch (QueryException $exception) {
                $peer->rollBack();
                $timedOut = str_contains($exception->getMessage(), '1205')
                    || str_contains(strtolower($exception->getMessage()), 'lock wait timeout');
            }

            $this->assertTrue($timedOut, 'Expected second DB connection to hit InnoDB lock wait timeout on locked voucher row.');

            DB::commit();

            // After commit, peer sees SUDAH_DIGUNAKAN via current locking read.
            $peerRow = $peer->table('voucher')->where('nomor_voucher', $voucherCode)->first();
            $this->assertNotNull($peerRow);
            $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN->value, $peerRow->status_penggunaan);

            // Subsequent validasiDanKunci must reject with ValidationException.
            $this->expectException(ValidationException::class);
            DB::transaction(fn () => $voucherService->validasiDanKunci($voucherCode, $today->toDateString()));
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            if ($peer->transactionLevel() > 0) {
                $peer->rollBack();
            }
            DB::disconnect('mysql_peer');
            Voucher::where('nomor_voucher', $voucherCode)->delete();
        }
    }

    public function test_two_concurrent_processes_claiming_same_voucher_allow_exactly_one_transaction(): void
    {
        $voucherCode = 'RACE10K';
        $today = Carbon::today('Asia/Jakarta');

        $userId = null;
        $petugasId = null;
        $pelangganId = null;
        $layananId = null;

        try {
            $user = User::factory()->petugas()->create([
                'email' => 'race.petugas.'.uniqid().'@cleanwash.local',
            ]);
            $userId = $user->id;

            $petugas = Petugas::create([
                'user_id' => $user->id,
                'nama_petugas' => $user->name,
            ]);
            $petugasId = $petugas->id_petugas;

            $pelanggan = Pelanggan::create([
                'nama' => 'Pelanggan Race',
                'no_telepon' => '0819'.random_int(10000000, 99999999),
                'alamat' => 'Jl. Konkurensi No. 1',
                'boleh_bayar_akhir' => false,
            ]);
            $pelangganId = $pelanggan->id_pelanggan;

            $layanan = app(JenisLayananService::class)->create([
                'nama_layanan' => 'Cuci Race '.uniqid(),
                'tingkat_kecepatan' => TingkatKecepatan::REGULER->value,
                'metode_hitung' => MetodeHitung::BERAT->value,
                'satuan' => SatuanLayanan::KG->value,
                'harga_satuan' => '10000.00',
                'perlu_setrika' => true,
                'is_active' => true,
            ]);
            $layananId = $layanan->id_layanan;

            Voucher::where('nomor_voucher', $voucherCode)->delete();
            Voucher::create([
                'nomor_voucher' => $voucherCode,
                'nilai' => '10000.00',
                'masa_berlaku' => $today->copy()->addDays(7)->toDateString(),
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ]);

            $barrierFile = sys_get_temp_dir().'/cw_race_barrier_'.uniqid().'.lock';

            $workerScript = <<<'PHP'
require $argv[1] . '/vendor/autoload.php';
$app = require $argv[1] . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$petugas = App\Models\Petugas::findOrFail((int) $argv[2]);
$pelangganId = (int) $argv[3];
$layananId = (int) $argv[4];
$voucherCode = $argv[5];
$barrierFile = $argv[6];

$deadline = microtime(true) + 5.0;
while (! file_exists($barrierFile) && microtime(true) < $deadline) {
    usleep(2000);
}

try {
    $transaksi = app(App\Services\TransaksiService::class)->buatTransaksi($petugas, [
        'id_pelanggan' => $pelangganId,
        'id_layanan' => $layananId,
        'berat_atau_jumlah' => '3.00',
        'nomor_voucher' => $voucherCode,
        'nominal_dp' => '5000.00',
        'catatan_khusus' => 'Parallel race test',
        'detail_pakaian' => [
            [
                'jenis_pakaian' => 'Kemeja',
                'jumlah_potong' => 3,
                'kondisi_pakaian' => 'Normal',
            ],
        ],
    ]);

    echo json_encode(['ok' => true, 'nomor_nota' => $transaksi->nomor_nota], JSON_THROW_ON_ERROR);
} catch (Illuminate\Validation\ValidationException $e) {
    echo json_encode(['ok' => false, 'type' => 'validation', 'errors' => $e->errors()], JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'type' => get_class($e), 'message' => $e->getMessage()], JSON_THROW_ON_ERROR);
}
PHP;

            $env = [
                'APP_ENV' => 'testing',
                'APP_KEY' => (string) config('app.key'),
                'APP_TIMEZONE' => 'Asia/Jakarta',
                'DB_CONNECTION' => (string) config('database.default'),
                'DB_HOST' => (string) config('database.connections.mysql.host'),
                'DB_PORT' => (string) config('database.connections.mysql.port'),
                'DB_DATABASE' => (string) config('database.connections.mysql.database'),
                'DB_USERNAME' => (string) config('database.connections.mysql.username'),
                'DB_PASSWORD' => (string) config('database.connections.mysql.password'),
            ];

            $args = [
                PHP_BINARY,
                '-r',
                $workerScript,
                base_path(),
                (string) $petugasId,
                (string) $pelangganId,
                (string) $layananId,
                $voucherCode,
                $barrierFile,
            ];

            $p1 = new Process($args, base_path(), $env);
            $p2 = new Process($args, base_path(), $env);

            $p1->start();
            $p2->start();

            // Release both workers simultaneously once spawned.
            usleep(120_000);
            file_put_contents($barrierFile, 'go');

            $p1->wait();
            $p2->wait();

            if (file_exists($barrierFile)) {
                unlink($barrierFile);
            }

            $this->assertTrue($p1->isSuccessful(), 'Worker 1 failed: '.$p1->getErrorOutput());
            $this->assertTrue($p2->isSuccessful(), 'Worker 2 failed: '.$p2->getErrorOutput());

            $r1 = json_decode($p1->getOutput(), true, 512, JSON_THROW_ON_ERROR);
            $r2 = json_decode($p2->getOutput(), true, 512, JSON_THROW_ON_ERROR);

            $successes = array_values(array_filter([$r1, $r2], fn (array $r): bool => $r['ok'] === true));
            $failures = array_values(array_filter([$r1, $r2], fn (array $r): bool => $r['ok'] === false));

            $this->assertCount(1, $successes, 'Exactly one parallel claim must succeed.');
            $this->assertCount(1, $failures, 'Exactly one parallel claim must be rejected.');
            $this->assertSame('validation', $failures[0]['type']);
            $this->assertArrayHasKey('nomor_voucher', $failures[0]['errors']);

            $this->assertSame(1, Transaksi::where('nomor_voucher', $voucherCode)->count());
            $this->assertSame(1, Transaksi::where('id_pelanggan', $pelangganId)->count());

            $usedVoucher = Voucher::findOrFail($voucherCode);
            $this->assertSame(VoucherStatus::SUDAH_DIGUNAKAN, $usedVoucher->status_penggunaan);
            $this->assertNotNull($usedVoucher->digunakan_pada);
        } finally {
            $this->cleanupConcurrencyArtifacts($userId, $petugasId, $pelangganId, $layananId, $voucherCode);
        }
    }
}
