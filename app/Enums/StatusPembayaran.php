<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum StatusPembayaran: string
{
    use HasValues;

    case BELUM_BAYAR = 'BELUM_BAYAR';
    case DP = 'DP';
    case LUNAS = 'LUNAS';
    case BELUM_LUNAS = 'BELUM_LUNAS';
}
