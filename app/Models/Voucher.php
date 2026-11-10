<?php

namespace App\Models;

use App\Enums\VoucherStatus;
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

    public function transaksi(): HasOne
    {
        return $this->hasOne(Transaksi::class, 'nomor_voucher', 'nomor_voucher');
    }
}
