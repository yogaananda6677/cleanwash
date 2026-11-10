<?php

namespace App\Enums;

use App\Enums\Concerns\HasValues;

enum TahapProduksi: string
{
    use HasValues;

    case DITERIMA = 'DITERIMA';
    case DICUCI = 'DICUCI';
    case DIKERINGKAN = 'DIKERINGKAN';
    case DISETRIKA = 'DISETRIKA';
    case SELESAI = 'SELESAI';

    /**
     * Build the canonical ordered production stages for a service.
     *
     * @return list<self>
     */
    public static function canonicalSequence(bool $perluSetrika): array
    {
        if ($perluSetrika) {
            return [
                self::DITERIMA,
                self::DICUCI,
                self::DIKERINGKAN,
                self::DISETRIKA,
                self::SELESAI,
            ];
        }

        return [
            self::DITERIMA,
            self::DICUCI,
            self::DIKERINGKAN,
            self::SELESAI,
        ];
    }
}
