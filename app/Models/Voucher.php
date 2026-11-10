<?php

namespace App\Models;

use App\Enums\VoucherStatus;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Voucher extends Model
{
    protected $table = 'voucher';

    protected $primaryKey = 'nomor_voucher';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'nomor_voucher',
        'nilai',
        'masa_berlaku',
        'status_penggunaan',
        'digunakan_pada',
    ];

    /**
     * @var list<string>
     */
    protected $appends = [
        'effective_status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'nilai' => 'decimal:2',
            'masa_berlaku' => 'date:Y-m-d',
            'status_penggunaan' => VoucherStatus::class,
            'digunakan_pada' => 'datetime',
        ];
    }

    /**
     * Resolve effective voucher status factoring in Asia/Jakarta expiration date.
     */
    protected function effectiveStatus(): Attribute
    {
        return Attribute::get(function (): string {
            $status = $this->status_penggunaan instanceof VoucherStatus
                ? $this->status_penggunaan
                : VoucherStatus::tryFrom((string) $this->status_penggunaan);

            if ($status === VoucherStatus::SUDAH_DIGUNAKAN) {
                return VoucherStatus::SUDAH_DIGUNAKAN->value;
            }

            if ($status === VoucherStatus::KEDALUWARSA) {
                return VoucherStatus::KEDALUWARSA->value;
            }

            if ($this->masa_berlaku !== null && $this->masa_berlaku->toDateString() < now('Asia/Jakarta')->toDateString()) {
                return VoucherStatus::KEDALUWARSA->value;
            }

            return VoucherStatus::TERSEDIA->value;
        });
    }

    public function transaksi(): HasOne
    {
        return $this->hasOne(Transaksi::class, 'nomor_voucher', 'nomor_voucher');
    }
}
