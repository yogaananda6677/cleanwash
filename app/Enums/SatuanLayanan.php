<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum SatuanLayanan: string
{
    use HasValues;

    case KG = 'kg';
    case PCS = 'pcs';
}
