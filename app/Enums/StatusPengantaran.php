<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum StatusPengantaran: string
{
    use HasValues;

    case DIJADWALKAN = 'DIJADWALKAN';
    case BERJALAN = 'BERJALAN';
    case SELESAI = 'SELESAI';
}
