<?php

namespace App\Http\Requests\Master;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class ValidateVoucherRequest extends FormRequest
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
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'nomor_voucher' => ['required', 'string', 'max:50'],
            'tanggal_transaksi' => ['nullable', 'date'],
        ];
    }
}
