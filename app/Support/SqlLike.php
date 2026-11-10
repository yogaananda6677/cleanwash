<?php

namespace App\Support;

final class SqlLike
{
    /**
     * Escape MySQL LIKE wildcards so literal search characters do not widen matches.
     */
    public static function contains(string $term): string
    {
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], trim($term));

        return '%'.$escaped.'%';
    }
}
