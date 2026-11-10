<?php

namespace Tests\Unit;

use App\Support\DecimalMoney;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class DecimalMoneyTest extends TestCase
{
    public function test_converts_between_decimal_strings_and_integer_cents(): void
    {
        $this->assertSame(0, DecimalMoney::fromString('0'));
        $this->assertSame(0, DecimalMoney::fromString('0.00'));
        $this->assertSame(5, DecimalMoney::toCents('0.05'));
        $this->assertSame(15050, DecimalMoney::fromString('150.5'));
        $this->assertSame(750000, DecimalMoney::toCents('7500.00'));
        $this->assertSame(-2505, DecimalMoney::fromString('-25.05'));

        $this->assertSame('0.00', DecimalMoney::toDecimalString(0));
        $this->assertSame('0.05', DecimalMoney::toDecimalString(5));
        $this->assertSame('7500.00', DecimalMoney::toDecimalString(750000));
        $this->assertSame('-25.05', DecimalMoney::toDecimalString(-2505));
    }

    public function test_adds_and_subtracts_large_nominals_without_float_drift(): void
    {
        // Classic IEEE-754 float drift traps: 0.10 + 0.20, 100.00 - 99.99
        $this->assertSame('0.30', DecimalMoney::add('0.10', '0.20'));
        $this->assertSame('0.01', DecimalMoney::subtract('100.00', '99.99'));

        // Large nominals up to DECIMAL(12,2) range
        $this->assertSame('1100000000.00', DecimalMoney::add('999999999.99', '100000000.01'));
        $this->assertSame('899999999.98', DecimalMoney::subtract('999999999.99', '100000000.01'));

        // Negative subtraction outcome before clamping
        $this->assertSame('-5000.00', DecimalMoney::subtract('10000.00', '15000.00'));
    }

    public function test_multiplies_fractional_quantity_and_unit_price_with_half_up_rounding(): void
    {
        // Standard CleanWash laundry calculation: 2.50 kg * Rp 7.500,00
        $this->assertSame('18750.00', DecimalMoney::multiplyQuantity('2.50', '7500.00'));

        // Float trap: in IEEE-754 float, 100.10 * 1.05 = 105.10499999999999 (rounds wrong to 105.10)
        $this->assertSame('105.11', DecimalMoney::multiplyQuantity('1.05', '100.10'));

        // Half-up rounding boundary checks
        $this->assertSame('41.66', DecimalMoney::multiplyQuantity('1.25', '33.33')); // 41.6625 -> 41.66
        $this->assertSame('41.68', DecimalMoney::multiplyQuantity('1.25', '33.34')); // 41.6750 -> 41.68
        $this->assertSame('0.01', DecimalMoney::multiplyQuantity('0.05', '0.10')); // 0.0050 -> 0.01
        $this->assertSame('0.00', DecimalMoney::multiplyQuantity('0.04', '0.10')); // 0.0040 -> 0.00

        // Large quantity * large unit price within DECIMAL(8,2) * DECIMAL(12,2) without overflow
        $this->assertSame('99999989999000.00', DecimalMoney::multiplyQuantity('99999.99', '999999999.99'));
    }

    public function test_max_zero_clamps_negative_values_to_zero(): void
    {
        $this->assertSame('0.00', DecimalMoney::maxZero('-5000.00'));
        $this->assertSame('0.00', DecimalMoney::maxZero('-0.01'));
        $this->assertSame('0.00', DecimalMoney::maxZero('0.00'));
        $this->assertSame('12500.50', DecimalMoney::maxZero('12500.5'));
    }

    public function test_comparison_helpers_work_accurately(): void
    {
        $this->assertSame(0, DecimalMoney::compare('15000', '15000.00'));
        $this->assertSame(1, DecimalMoney::compare('15000.01', '15000.00'));
        $this->assertSame(-1, DecimalMoney::compare('14999.99', '15000.00'));

        $this->assertTrue(DecimalMoney::eq('5000.5', '5000.50'));
        $this->assertFalse(DecimalMoney::eq('5000.51', '5000.50'));

        $this->assertTrue(DecimalMoney::gt('5000.01', '5000.00'));
        $this->assertFalse(DecimalMoney::gt('5000.00', '5000.00'));

        $this->assertTrue(DecimalMoney::lt('4999.99', '5000.00'));
        $this->assertFalse(DecimalMoney::lt('5000.00', '5000.00'));
    }

    public function test_rejects_invalid_and_more_than_two_decimal_strings(): void
    {
        foreach (['', '   ', 'abc', '1e5', '12.345', '1,000.00', '12.3.4', '--10.00'] as $invalid) {
            try {
                DecimalMoney::fromString($invalid);
                $this->fail("Expected InvalidArgumentException for input [{$invalid}]");
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_calculates_percentage_with_half_up_rounding_and_validation(): void
    {
        $this->assertSame('10000.00', DecimalMoney::percentage('20000.00', 50));
        $this->assertSame('0.00', DecimalMoney::percentage('15000.00', 0));
        $this->assertSame('0.00', DecimalMoney::percentage('0.00', 50));

        // Half-up rounding boundaries: 1001 cents * 50% = 500.50 -> 501 cents (5.01)
        $this->assertSame('5.01', DecimalMoney::percentage('10.01', 50));
        // 1001 cents * 49% = 490.49 -> 490 cents (4.90)
        $this->assertSame('4.90', DecimalMoney::percentage('10.01', 49));
        // 1001 cents * 51% = 510.51 -> 511 cents (5.11)
        $this->assertSame('5.11', DecimalMoney::percentage('10.01', 51));
        $this->assertSame('-5.01', DecimalMoney::percentage('-10.01', 50));

        $this->expectException(InvalidArgumentException::class);
        DecimalMoney::percentage('1000.00', -1);
    }

    public function test_percentage_guards_against_integer_overflow(): void
    {
        $maxDecimal = DecimalMoney::toDecimalString(PHP_INT_MAX);

        $this->expectException(InvalidArgumentException::class);
        DecimalMoney::percentage($maxDecimal, 2);
    }

    public function test_prorates_and_multiplies_with_half_up_rounding_and_guards(): void
    {
        // CleanWash compensation basis: subtotal 25000.00, 2 of 5 pcs, 5x RUSAK / 10x HILANG
        $this->assertSame('10000.00', DecimalMoney::prorateAndMultiply('25000.00', 2, 5, 1));
        $this->assertSame('50000.00', DecimalMoney::prorateAndMultiply('25000.00', 2, 5, 5));
        $this->assertSame('100000.00', DecimalMoney::prorateAndMultiply('25000.00', 2, 5, 10));

        // Half-up rounding checks on basis per unit
        $this->assertSame('0.33', DecimalMoney::prorateAndMultiply('1.00', 1, 3, 1));
        $this->assertSame('0.67', DecimalMoney::prorateAndMultiply('1.00', 2, 3, 1));
        $this->assertSame('0.02', DecimalMoney::prorateAndMultiply('0.03', 1, 2, 1));
        $this->assertSame('0.10', DecimalMoney::prorateAndMultiply('0.03', 1, 2, 5));
        $this->assertSame('0.00', DecimalMoney::prorateAndMultiply('25000.00', 0, 5, 5));
        $this->assertSame('0.00', DecimalMoney::prorateAndMultiply('25000.00', 2, 5, 0));

        foreach ([
            ['100.00', 1, 0, 1],
            ['100.00', 1, -2, 1],
            ['100.00', -1, 2, 1],
            ['100.00', 1, 2, -1],
            ['invalid', 1, 2, 1],
        ] as [$amount, $numerator, $denominator, $multiplier]) {
            try {
                DecimalMoney::prorateAndMultiply($amount, $numerator, $denominator, $multiplier);
                $this->fail('Expected InvalidArgumentException for invalid proration input.');
            } catch (InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
    }
}
