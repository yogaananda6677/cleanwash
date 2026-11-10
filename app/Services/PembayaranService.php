<?php

namespace App\Services;

use App\Enums\JenisBayar;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Pembayaran;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Models\User;
use App\Support\DecimalMoney;
use BackedEnum;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class PembayaranService
{
    /**
     * Resolve initial transaction payment status from down payment and total amount.
     *
     * @throws ValidationException
     */
    public function resolveStatusPembayaranAwal(string $nominalDp, string $totalHarga): StatusPembayaran
    {
        $dp = $this->normalizeMoney($nominalDp, 'nominal_dp');
        $total = $this->normalizeMoney($totalHarga, 'total_harga');

        if (DecimalMoney::lt($dp, '0.00')) {
            throw ValidationException::withMessages([
                'nominal_dp' => 'Nominal DP tidak boleh bernilai negatif.',
            ]);
        }

        if (DecimalMoney::gt($dp, $total)) {
            throw ValidationException::withMessages([
                'nominal_dp' => 'Nominal DP tidak boleh melebihi total harga transaksi.',
            ]);
        }

        if (DecimalMoney::eq($total, '0.00') || DecimalMoney::eq($dp, $total)) {
            return StatusPembayaran::LUNAS;
        }

        if (DecimalMoney::eq($dp, '0.00')) {
            return StatusPembayaran::BELUM_BAYAR;
        }

        return StatusPembayaran::DP;
    }

    /**
     * Persist the initial payment ledger record when nominal DP is greater than zero.
     *
     * @throws ValidationException
     */
    public function catatPembayaranAwal(
        Transaksi $transaksi,
        Petugas $petugas,
        string $nominalDp,
        string $totalHarga,
        ?CarbonInterface $tanggalBayar = null
    ): ?Pembayaran {
        $status = $this->resolveStatusPembayaranAwal($nominalDp, $totalHarga);
        $dp = $this->normalizeMoney($nominalDp, 'nominal_dp');

        if (DecimalMoney::eq($dp, '0.00')) {
            return null;
        }

        $jenisBayar = $status === StatusPembayaran::LUNAS
            ? JenisBayar::PELUNASAN
            : JenisBayar::DP;

        $paidAt = $tanggalBayar !== null
            ? $tanggalBayar->copy()->timezone('Asia/Jakarta')
            : now('Asia/Jakarta');

        return Pembayaran::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_petugas' => $petugas->id_petugas,
            'tanggal_bayar' => $paidAt,
            'jenis_bayar' => $jenisBayar,
            'nominal_bayar' => $dp,
        ]);
    }

    /**
     * Record a partial or final settlement payment on a transaction with remaining balance.
     *
     * @param  array{nominal_bayar: string|int|float}  $data
     *
     * @throws ValidationException
     */
    public function catatPelunasan(
        string $nomorNota,
        Petugas $petugas,
        array $data,
        ?User $actor = null,
        ?CarbonInterface $tanggalBayar = null
    ): Pembayaran {
        $rawNominal = $data['nominal_bayar'] ?? null;
        if (! is_string($rawNominal) && ! is_int($rawNominal) && ! is_float($rawNominal)) {
            throw ValidationException::withMessages([
                'nominal_bayar' => 'Nominal pelunasan wajib diisi.',
            ]);
        }

        $nominalBayar = $this->normalizeMoney((string) $rawNominal, 'nominal_bayar');

        if (DecimalMoney::lte($nominalBayar, '0.00')) {
            throw ValidationException::withMessages([
                'nominal_bayar' => 'Nominal pelunasan harus lebih besar dari Rp 0.',
            ]);
        }

        return DB::transaction(function () use ($nomorNota, $petugas, $nominalBayar, $actor, $tanggalBayar): Pembayaran {
            $now = $tanggalBayar !== null
                ? $tanggalBayar->copy()->timezone('Asia/Jakarta')
                : now('Asia/Jakarta');

            $lockedTransaksi = Transaksi::query()
                ->where('nomor_nota', $nomorNota)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedTransaksi->load('pembayaran');

            $totalDibayarSebelum = $this->hitungTotalDibayar($lockedTransaksi);
            $sisaTagihanSebelum = DecimalMoney::maxZero(
                DecimalMoney::subtract((string) $lockedTransaksi->total_harga, $totalDibayarSebelum)
            );

            if (DecimalMoney::lte($sisaTagihanSebelum, '0.00')) {
                throw ValidationException::withMessages([
                    'nominal_bayar' => "Transaksi {$nomorNota} sudah lunas dan tidak memiliki sisa tagihan.",
                ]);
            }

            if (! in_array($lockedTransaksi->status_transaksi, [
                StatusTransaksi::AKTIF,
                StatusTransaksi::SELESAI,
                StatusTransaksi::DIAMBIL,
                StatusTransaksi::DIBATALKAN,
            ], true)) {
                throw ValidationException::withMessages([
                    'nominal_bayar' => "Transaksi {$nomorNota} tidak dapat menerima pelunasan.",
                ]);
            }

            if (DecimalMoney::gt($nominalBayar, $sisaTagihanSebelum)) {
                $formattedSisa = DecimalMoney::formatRupiah($sisaTagihanSebelum);

                throw ValidationException::withMessages([
                    'nominal_bayar' => "Nominal pelunasan tidak boleh melebihi sisa tagihan sebesar {$formattedSisa}.",
                ]);
            }

            $statusPembayaranSebelum = $lockedTransaksi->status_pembayaran instanceof StatusPembayaran
                ? $lockedTransaksi->status_pembayaran
                : StatusPembayaran::from((string) $lockedTransaksi->status_pembayaran);

            $pembayaran = Pembayaran::create([
                'nomor_nota' => $lockedTransaksi->nomor_nota,
                'id_petugas' => $petugas->id_petugas,
                'tanggal_bayar' => $now,
                'jenis_bayar' => JenisBayar::PELUNASAN,
                'nominal_bayar' => $nominalBayar,
            ]);

            $totalDibayarSesudah = DecimalMoney::add($totalDibayarSebelum, $nominalBayar);
            $sisaTagihanSesudah = DecimalMoney::maxZero(
                DecimalMoney::subtract((string) $lockedTransaksi->total_harga, $totalDibayarSesudah)
            );

            $statusPembayaranBaru = $this->updateStatusLunas($lockedTransaksi, $totalDibayarSesudah);

            AuditLog::create([
                'user_id' => $actor?->id ?? $petugas->user_id,
                'actor_role' => $actor !== null
                    ? ($actor->role instanceof BackedEnum ? $actor->role->value : (string) $actor->role)
                    : UserRole::PETUGAS->value,
                'action' => 'PELUNASAN_RECORDED',
                'subject_type' => Transaksi::class,
                'subject_id' => $lockedTransaksi->nomor_nota,
                'payload_before' => [
                    'status_pembayaran' => $statusPembayaranSebelum->value,
                    'total_dibayar' => $totalDibayarSebelum,
                    'sisa_tagihan' => $sisaTagihanSebelum,
                ],
                'payload_after' => [
                    'id_pembayaran' => $pembayaran->id_pembayaran,
                    'jenis_bayar' => JenisBayar::PELUNASAN->value,
                    'nominal_bayar' => $nominalBayar,
                    'total_dibayar' => $totalDibayarSesudah,
                    'sisa_tagihan' => $sisaTagihanSesudah,
                    'status_pembayaran' => $statusPembayaranBaru->value,
                    'id_petugas' => $petugas->id_petugas,
                ],
                'created_at' => $now,
            ]);

            return $pembayaran->load('petugas');
        });
    }

    /**
     * Determine and persist the updated payment status after a settlement payment.
     *
     * @throws ValidationException
     */
    public function updateStatusLunas(Transaksi $transaksi, string $totalDibayarSesudah): StatusPembayaran
    {
        $dibayar = $this->normalizeMoney($totalDibayarSesudah, 'total_dibayar');
        $statusSebelum = $transaksi->status_pembayaran instanceof StatusPembayaran
            ? $transaksi->status_pembayaran
            : StatusPembayaran::from((string) $transaksi->status_pembayaran);

        if (DecimalMoney::gte($dibayar, (string) $transaksi->total_harga)) {
            $statusBaru = StatusPembayaran::LUNAS;
        } elseif (
            $transaksi->status_transaksi === StatusTransaksi::DIAMBIL
            || in_array($statusSebelum, [StatusPembayaran::BELUM_LUNAS, StatusPembayaran::LUNAS], true)
        ) {
            $statusBaru = StatusPembayaran::BELUM_LUNAS;
        } else {
            $statusBaru = StatusPembayaran::DP;
        }

        if ($transaksi->exists && $transaksi->status_pembayaran !== $statusBaru) {
            $transaksi->update([
                'status_pembayaran' => $statusBaru,
            ]);
        }

        return $statusBaru;
    }

    /**
     * Sum all payment ledger records for a transaction using DecimalMoney without N+1 when preloaded.
     */
    public function hitungTotalDibayar(Transaksi $transaksi): string
    {
        $records = $transaksi->relationLoaded('pembayaran')
            ? $transaksi->pembayaran
            : $transaksi->pembayaran()->get(['nominal_bayar']);

        $total = '0.00';

        foreach ($records as $pembayaran) {
            $total = DecimalMoney::add($total, (string) $pembayaran->nominal_bayar);
        }

        return $total;
    }

    /**
     * Compute aggregate count and total outstanding balance for handed-over (DIAMBIL) unpaid transactions.
     *
     * @return array{count: int, total_nominal: string}
     */
    public function summarizePiutangMetrics(): array
    {
        $rows = Transaksi::query()
            ->select(['nomor_nota', 'total_harga'])
            ->withSum('pembayaran as total_dibayar_sum', 'nominal_bayar')
            ->where('status_transaksi', StatusTransaksi::DIAMBIL)
            ->where('status_pembayaran', '!=', StatusPembayaran::LUNAS)
            ->get();

        $totalNominal = '0.00';

        foreach ($rows as $row) {
            $rawDibayar = $row->getAttribute('total_dibayar_sum');
            $dibayar = ($rawDibayar === null || trim((string) $rawDibayar) === '')
                ? '0.00'
                : DecimalMoney::toDecimalString(DecimalMoney::toCents((string) $rawDibayar));
            $sisa = DecimalMoney::maxZero(
                DecimalMoney::subtract((string) $row->total_harga, $dibayar)
            );
            $totalNominal = DecimalMoney::add($totalNominal, $sisa);
        }

        return [
            'count' => $rows->count(),
            'total_nominal' => $totalNominal,
        ];
    }

    /**
     * Resolve payment status uniformly after re-weighing, service change, cancellation, or compensation.
     */
    public function resolveStatusPembayaranSetelahPenyesuaian(
        StatusPembayaran $currentStatus,
        string $totalHargaBaru,
        string $totalDibayar
    ): StatusPembayaran {
        $totalBaru = $this->normalizeMoney($totalHargaBaru, 'total_harga');
        $dibayar = $this->normalizeMoney($totalDibayar, 'total_dibayar');

        if (DecimalMoney::lte($totalBaru, $dibayar)) {
            return StatusPembayaran::LUNAS;
        }

        if (DecimalMoney::eq($dibayar, '0.00')) {
            return StatusPembayaran::BELUM_BAYAR;
        }

        if (in_array($currentStatus, [StatusPembayaran::LUNAS, StatusPembayaran::BELUM_LUNAS], true)) {
            return StatusPembayaran::BELUM_LUNAS;
        }

        return StatusPembayaran::DP;
    }

    /**
     * @throws ValidationException
     */
    private function normalizeMoney(string $amount, string $field): string
    {
        try {
            return DecimalMoney::toDecimalString(DecimalMoney::toCents($amount));
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages([
                $field => 'Format nominal uang tidak valid.',
            ]);
        }
    }
}
