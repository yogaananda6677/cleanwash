<?php

namespace App\Support;

use InvalidArgumentException;

final class DecimalMoney
{
    private const SCALE = 100;

    /**
     * Parse a decimal string (up to 2 decimal places) into integer cents.
     */
    public static function fromString(string $amount): int
    {
        $trimmed = trim($amount);

        if ($trimmed === '' || preg_match('/^([+-])?(\d+)(?:\.(\d{1,2}))?$/', $trimmed, $matches) !== 1) {
            throw new InvalidArgumentException("Invalid decimal money string [{$amount}].");
        }

        $sign = ($matches[1] ?? '') === '-' ? -1 : 1;
        $wholePart = ltrim($matches[2], '0');
        $wholeDigits = $wholePart === '' ? '0' : $wholePart;
        $fractionDigits = str_pad($matches[3] ?? '', 2, '0', STR_PAD_RIGHT);

        if (strlen($wholeDigits) > strlen((string) intdiv(PHP_INT_MAX, self::SCALE))) {
            throw new InvalidArgumentException("Decimal money value [{$amount}] exceeds integer bounds.");
        }

        $wholeInt = (int) $wholeDigits;
        $maxWhole = intdiv(PHP_INT_MAX, self::SCALE);

        if ($wholeInt > $maxWhole) {
            throw new InvalidArgumentException("Decimal money value [{$amount}] exceeds integer bounds.");
        }

        $fractionInt = (int) $fractionDigits;
        $scaledWhole = $wholeInt * self::SCALE;

        if ($scaledWhole > PHP_INT_MAX - $fractionInt) {
            throw new InvalidArgumentException("Decimal money value [{$amount}] exceeds integer bounds.");
        }

        $cents = $scaledWhole + $fractionInt;

        if ($cents === 0) {
            return 0;
        }

        return $sign * $cents;
    }

    /**
     * Alias for fromString().
     */
    public static function toCents(string $amount): int
    {
        return self::fromString($amount);
    }

    /**
     * Format integer cents into a fixed 2-decimal string.
     */
    public static function toDecimalString(int $cents): string
    {
        if ($cents === 0) {
            return '0.00';
        }

        $sign = $cents < 0 ? '-' : '';
        $absCents = abs($cents);
        $whole = intdiv($absCents, self::SCALE);
        $fraction = $absCents % self::SCALE;

        return sprintf('%s%d.%02d', $sign, $whole, $fraction);
    }

    /**
     * Add two decimal money strings.
     */
    public static function add(string $left, string $right): string
    {
        $leftCents = self::toCents($left);
        $rightCents = self::toCents($right);

        if ($rightCents > 0 && $leftCents > PHP_INT_MAX - $rightCents) {
            throw new InvalidArgumentException('Addition exceeds integer bounds.');
        }

        if ($rightCents < 0 && $leftCents < PHP_INT_MIN - $rightCents) {
            throw new InvalidArgumentException('Addition exceeds integer bounds.');
        }

        return self::toDecimalString($leftCents + $rightCents);
    }

    /**
     * Subtract the right decimal money string from the left decimal money string.
     */
    public static function subtract(string $left, string $right): string
    {
        $leftCents = self::toCents($left);
        $rightCents = self::toCents($right);

        if ($rightCents < 0 && $leftCents > PHP_INT_MAX + $rightCents) {
            throw new InvalidArgumentException('Subtraction exceeds integer bounds.');
        }

        if ($rightCents > 0 && $leftCents < PHP_INT_MIN + $rightCents) {
            throw new InvalidArgumentException('Subtraction exceeds integer bounds.');
        }

        return self::toDecimalString($leftCents - $rightCents);
    }

    /**
     * Multiply a 2-decimal quantity by a 2-decimal unit price using half-up rounding.
     */
    public static function multiplyQuantity(string $qty, string $unitPrice): string
    {
        $qtyCents = self::toCents($qty);
        $priceCents = self::toCents($unitPrice);

        if ($qtyCents === 0 || $priceCents === 0) {
            return '0.00';
        }

        $negative = ($qtyCents < 0) !== ($priceCents < 0);
        $absQty = abs($qtyCents);
        $absPrice = abs($priceCents);

        $qtyWhole = intdiv($absQty, self::SCALE);
        $qtyFrac = $absQty % self::SCALE;

        if ($qtyWhole !== 0 && $absPrice > intdiv(PHP_INT_MAX, $qtyWhole)) {
            throw new InvalidArgumentException('Multiplication exceeds integer bounds.');
        }

        $wholeCents = $qtyWhole * $absPrice;

        if ($qtyFrac !== 0 && $absPrice > intdiv(PHP_INT_MAX, $qtyFrac)) {
            throw new InvalidArgumentException('Multiplication exceeds integer bounds.');
        }

        $fracScaled = $qtyFrac * $absPrice;
        $fracCents = intdiv($fracScaled + 50, self::SCALE);

        if ($wholeCents > PHP_INT_MAX - $fracCents) {
            throw new InvalidArgumentException('Multiplication exceeds integer bounds.');
        }

        $totalCents = $wholeCents + $fracCents;

        if ($totalCents === 0) {
            return '0.00';
        }

        return self::toDecimalString($negative ? -$totalCents : $totalCents);
    }

    /**
     * Clamp negative amounts to "0.00".
     */
    public static function maxZero(string $amount): string
    {
        $cents = self::toCents($amount);

        return self::toDecimalString(max(0, $cents));
    }

    /**
     * Compare two decimal money strings (-1, 0, or 1).
     */
    public static function compare(string $left, string $right): int
    {
        return self::toCents($left) <=> self::toCents($right);
    }

    public static function gt(string $left, string $right): bool
    {
        return self::compare($left, $right) > 0;
    }

    public static function gte(string $left, string $right): bool
    {
        return self::compare($left, $right) >= 0;
    }

    public static function lt(string $left, string $right): bool
    {
        return self::compare($left, $right) < 0;
    }

    public static function lte(string $left, string $right): bool
    {
        return self::compare($left, $right) <= 0;
    }

    public static function eq(string $left, string $right): bool
    {
        return self::compare($left, $right) === 0;
    }
}
