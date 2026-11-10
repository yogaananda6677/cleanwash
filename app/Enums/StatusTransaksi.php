<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum StatusTransaksi: string
{
    use HasValues;

    case AKTIF = 'AKTIF';
    case SELESAI = 'SELESAI';
    case DIAMBIL = 'DIAMBIL';
    case DIBATALKAN = 'DIBATALKAN';
}
