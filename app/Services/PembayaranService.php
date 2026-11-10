<?php

namespace App\Services;

use App\Enums\JenisBayar;
use App\Enums\StatusPembayaran;
use App\Models\Pembayaran;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Support\DecimalMoney;
use Carbon\CarbonInterface;
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
