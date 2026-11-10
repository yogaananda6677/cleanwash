<?php

namespace App\Http\Requests\Master;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreVoucherRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('nomor_voucher'))) {
            $this->merge([
                'nomor_voucher' => Str::upper(trim($this->input('nomor_voucher'))),
            ]);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nomor_voucher' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('voucher', 'nomor_voucher')],
            'nilai' => ['required', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2'],
            'masa_berlaku' => ['required', 'date', 'after_or_equal:today'],
        ];
    }
}
