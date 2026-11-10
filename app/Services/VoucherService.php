<?php

namespace App\Services;

use App\Enums\VoucherStatus;
use App\Models\Voucher;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VoucherService
{
    /**
     * Paginate vouchers with search and effective status filtering.
     */
    public function paginate(string $search = '', string $status = '', int $perPage = 10): LengthAwarePaginator
    {
        $trimmedSearch = trim($search);
        $normalizedStatus = strtoupper(trim($status));
        $today = now('Asia/Jakarta')->toDateString();

        return Voucher::query()
            ->when($trimmedSearch !== '', function ($query) use ($trimmedSearch): void {
                $query->where('nomor_voucher', 'like', SqlLike::contains($trimmedSearch));
            })
            ->when($normalizedStatus === VoucherStatus::TERSEDIA->value, function ($query) use ($today): void {
                $query->where('status_penggunaan', VoucherStatus::TERSEDIA)
                    ->whereDate('masa_berlaku', '>=', $today);
            })
            ->when($normalizedStatus === VoucherStatus::SUDAH_DIGUNAKAN->value, function ($query): void {
                $query->where('status_penggunaan', VoucherStatus::SUDAH_DIGUNAKAN);
            })
            ->when($normalizedStatus === VoucherStatus::KEDALUWARSA->value, function ($query) use ($today): void {
                $query->where(function ($subQuery) use ($today): void {
                    $subQuery->where('status_penggunaan', VoucherStatus::KEDALUWARSA)
                        ->orWhere(function ($expiredQuery) use ($today): void {
                            $expiredQuery->where('status_penggunaan', VoucherStatus::TERSEDIA)
                                ->whereDate('masa_berlaku', '<', $today);
                        });
                });
            })
            ->orderByDesc('created_at')
            ->orderBy('nomor_voucher')
            ->paginate($perPage)
            ->withQueryString();
    }

    /**
     * @param  array{nomor_voucher: string, nilai: string|int|float, masa_berlaku: string}  $data
     */
    public function create(array $data): Voucher
    {
        return DB::transaction(function () use ($data): Voucher {
            return Voucher::create([
                'nomor_voucher' => Str::upper(trim($data['nomor_voucher'])),
                'nilai' => DecimalMoney::toDecimalString(
                    DecimalMoney::toCents((string) $data['nilai'])
                ),
                'masa_berlaku' => Carbon::parse($data['masa_berlaku'], 'Asia/Jakarta')->toDateString(),
                'status_penggunaan' => VoucherStatus::TERSEDIA,
            ]);
        });
    }

    /**
     * @param  array{nilai: string|int|float, masa_berlaku: string, status_penggunaan?: string}  $data
     *
     * @throws ValidationException
     */
    public function update(Voucher $voucher, array $data): Voucher
    {
        return DB::transaction(function () use ($voucher, $data): Voucher {
            if ($voucher->status_penggunaan === VoucherStatus::SUDAH_DIGUNAKAN) {
                throw ValidationException::withMessages([
                    'voucher' => 'Voucher yang sudah digunakan tidak dapat diubah.',
                ]);
            }

            $nextStatus = $voucher->status_penggunaan;

            if (array_key_exists('status_penggunaan', $data) && $data['status_penggunaan'] !== null) {
                $parsedStatus = VoucherStatus::tryFrom((string) $data['status_penggunaan']);
                if ($parsedStatus === null || $parsedStatus === VoucherStatus::SUDAH_DIGUNAKAN) {
                    throw ValidationException::withMessages([
                        'status_penggunaan' => 'Status penggunaan hanya boleh diatur ke TERSEDIA atau KEDALUWARSA.',
                    ]);
                }

                $nextStatus = $parsedStatus;
            }

            $voucher->update([
                'nilai' => DecimalMoney::toDecimalString(
                    DecimalMoney::toCents((string) $data['nilai'])
                ),
                'masa_berlaku' => Carbon::parse($data['masa_berlaku'], 'Asia/Jakarta')->toDateString(),
                'status_penggunaan' => $nextStatus,
            ]);

            return $voucher->refresh();
        });
    }

    /**
     * Delete a voucher only when it has never been used or linked to any transaction.
     *
     * @throws ValidationException
     */
    public function delete(Voucher $voucher): void
    {
        DB::transaction(function () use ($voucher): void {
            if ($voucher->status_penggunaan === VoucherStatus::SUDAH_DIGUNAKAN || $voucher->transaksi()->exists()) {
                throw ValidationException::withMessages([
                    'voucher' => 'Voucher yang sudah digunakan atau terhubung transaksi tidak dapat dihapus.',
                ]);
            }

            $voucher->delete();
        });
    }

    /**
     * Compute effective status considering Asia/Jakarta expiration date even when DB status is still TERSEDIA.
     */
    public function resolveEffectiveStatus(Voucher $voucher, ?string $referenceDate = null): VoucherStatus
    {
        if ($voucher->status_penggunaan === VoucherStatus::SUDAH_DIGUNAKAN) {
            return VoucherStatus::SUDAH_DIGUNAKAN;
        }

        if ($voucher->status_penggunaan === VoucherStatus::KEDALUWARSA) {
            return VoucherStatus::KEDALUWARSA;
        }

        $date = $referenceDate !== null && trim($referenceDate) !== ''
            ? Carbon::parse($referenceDate, 'Asia/Jakarta')->toDateString()
            : now('Asia/Jakarta')->toDateString();

        if ($voucher->masa_berlaku->toDateString() < $date) {
            return VoucherStatus::KEDALUWARSA;
        }

        return VoucherStatus::TERSEDIA;
    }

    /**
     * Read-only preview validation for POST /voucher/validate (KK-03).
     *
     * @return array{
     *     valid: bool,
     *     nomor_voucher?: string,
     *     nilai?: string,
     *     masa_berlaku?: string,
     *     status_penggunaan?: string,
     *     reason?: 'NOT_FOUND'|'EXPIRED'|'ALREADY_USED',
     *     message: string,
     *     errors?: array{nomor_voucher: list<string>}
     * }
     */
    public function cekValiditasPreview(string $nomorVoucher, ?string $tanggalTransaksi = null): array
    {
        $kode = Str::upper(trim($nomorVoucher));
        $voucher = $kode !== '' ? Voucher::find($kode) : null;

        $invalid = $this->detectInvalidVoucher($voucher, $tanggalTransaksi);

        if ($invalid !== null) {
            return $this->invalidPreview($invalid['reason'], $invalid['message']);
        }

        /** @var Voucher $voucher */
        return [
            'valid' => true,
            'nomor_voucher' => $voucher->nomor_voucher,
            'nilai' => $voucher->nilai,
            'masa_berlaku' => $voucher->masa_berlaku->toDateString(),
            'status_penggunaan' => $voucher->status_penggunaan->value,
            'message' => 'Voucher valid dan siap digunakan.',
        ];
    }

    /**
     * Validate and atomically lock a voucher for exclusive transaction consumption (KK-03).
     *
     * @throws ValidationException
     */
    public function validasiDanKunci(string $nomorVoucher, ?string $tanggalTransaksi = null): Voucher
    {
        $kode = Str::upper(trim($nomorVoucher));

        if ($kode === '') {
            throw ValidationException::withMessages([
                'nomor_voucher' => 'Voucher tidak ditemukan.',
            ]);
        }

        return DB::transaction(function () use ($kode, $tanggalTransaksi): Voucher {
            $voucher = Voucher::query()
                ->where('nomor_voucher', $kode)
                ->lockForUpdate()
                ->first();

            $invalid = $this->detectInvalidVoucher($voucher, $tanggalTransaksi);

            if ($invalid !== null) {
                throw ValidationException::withMessages([
                    'nomor_voucher' => $invalid['message'],
                ]);
            }

            /** @var Voucher $voucher */
            $voucher->update([
                'status_penggunaan' => VoucherStatus::SUDAH_DIGUNAKAN,
                'digunakan_pada' => now('Asia/Jakarta'),
            ]);

            return $voucher->refresh();
        });
    }

    /**
     * @return array{reason: 'NOT_FOUND'|'EXPIRED'|'ALREADY_USED', message: string}|null
     */
    private function detectInvalidVoucher(?Voucher $voucher, ?string $tanggalTransaksi = null): ?array
    {
        if ($voucher === null) {
            return [
                'reason' => 'NOT_FOUND',
                'message' => 'Voucher tidak ditemukan.',
            ];
        }

        if ($voucher->status_penggunaan === VoucherStatus::SUDAH_DIGUNAKAN) {
            return [
                'reason' => 'ALREADY_USED',
                'message' => 'Voucher sudah digunakan pada transaksi lain.',
            ];
        }

        if ($this->resolveEffectiveStatus($voucher, $tanggalTransaksi) === VoucherStatus::KEDALUWARSA) {
            return [
                'reason' => 'EXPIRED',
                'message' => 'Voucher sudah melewati masa berlaku (kedaluwarsa).',
            ];
        }

        return null;
    }

    /**
     * @param  'NOT_FOUND'|'EXPIRED'|'ALREADY_USED'  $reason
     * @return array{
     *     valid: false,
     *     reason: 'NOT_FOUND'|'EXPIRED'|'ALREADY_USED',
     *     message: string,
     *     errors: array{nomor_voucher: list<string>}
     * }
     */
    private function invalidPreview(string $reason, string $message): array
    {
        return [
            'valid' => false,
            'reason' => $reason,
            'message' => $message,
            'errors' => [
                'nomor_voucher' => [$message],
            ],
        ];
    }
}
