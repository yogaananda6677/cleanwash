<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum JenisInsiden: string
{
    use HasValues;

    case RUSAK = 'RUSAK';
    case HILANG = 'HILANG';
}
