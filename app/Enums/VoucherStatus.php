<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum VoucherStatus: string
{
    use HasValues;

    case TERSEDIA = 'TERSEDIA';
    case SUDAH_DIGUNAKAN = 'SUDAH_DIGUNAKAN';
    case KEDALUWARSA = 'KEDALUWARSA';
}
