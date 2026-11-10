<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum TingkatKecepatan: string
{
    use HasValues;

    case REGULER = 'REGULER';
    case EXPRESS = 'EXPRESS';
}
