<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum JenisBayar: string
{
    use HasValues;

    case DP = 'DP';
    case PELUNASAN = 'PELUNASAN';
}
