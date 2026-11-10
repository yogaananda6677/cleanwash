<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum UserRole: string
{
    use HasValues;

    case PETUGAS = 'PETUGAS';
    case PEGAWAI = 'PEGAWAI';
    case PENGANTAR = 'PENGANTAR';
}
