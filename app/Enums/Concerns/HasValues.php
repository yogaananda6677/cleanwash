<?php

namespace App\Enums\Concerns;

trait HasValues
{
    /**
     * Return all backed string values of the enum.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
