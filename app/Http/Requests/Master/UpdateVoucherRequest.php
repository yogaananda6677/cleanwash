<?php

namespace App\Http\Requests\Master;

use App\Enums\VoucherStatus;
use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use App\Models\Voucher;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateVoucherRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nilai' => ['required', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2'],
            'masa_berlaku' => ['required', 'date'],
            'status_penggunaan' => [
                'sometimes',
                'string',
                Rule::in([VoucherStatus::TERSEDIA->value, VoucherStatus::KEDALUWARSA->value]),
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $voucher = $this->route('voucher');

                if ($voucher instanceof Voucher && $voucher->status_penggunaan === VoucherStatus::SUDAH_DIGUNAKAN) {
                    $validator->errors()->add('voucher', 'Voucher yang sudah digunakan tidak dapat diubah.');
                }
            },
        ];
    }
}
