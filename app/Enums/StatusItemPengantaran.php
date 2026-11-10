<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum StatusItemPengantaran: string
{
    use HasValues;

    case MENUNGGU = 'MENUNGGU';
    case DIAMBIL = 'DIAMBIL';
    case DALAM_PERJALANAN = 'DALAM_PERJALANAN';
    case DITERIMA = 'DITERIMA';
    case GAGAL = 'GAGAL';
}
