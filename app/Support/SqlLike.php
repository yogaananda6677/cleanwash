<?php

namespace App\Support;

final class SqlLike
{
    /**
     * Escape MySQL LIKE wildcards so literal search characters do not widen matches.
     */
    public static function escape(string $term): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], trim($term));
    }

    public static function contains(string $term): string
    {
        return '%'.self::escape($term).'%';
    }

    public static function prefix(string $term): string
    {
        return self::escape($term).'%';
    }
}
