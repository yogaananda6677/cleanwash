<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum MetodeHitung: string
{
    use HasValues;

    case BERAT = 'BERAT';
    case JUMLAH = 'JUMLAH';
}
