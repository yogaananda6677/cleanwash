<?php

namespace App\Http\Requests\Master;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class BasePelangganRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        $updates = [];

        foreach (['nama', 'no_telepon', 'alamat'] as $field) {
            if (is_string($this->input($field))) {
                $updates[$field] = trim($this->input($field));
            }
        }

        if ($updates !== []) {
            $this->merge($updates);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    protected function pelangganRules(?int $ignorePelangganId = null): array
    {
        $uniquePhoneRule = Rule::unique('pelanggan', 'no_telepon');

        if ($ignorePelangganId !== null) {
            $uniquePhoneRule = $uniquePhoneRule->ignore($ignorePelangganId, 'id_pelanggan');
        }

        return [
            'nama' => ['required', 'string', 'max:120'],
            'no_telepon' => ['required', 'string', 'max:25', $uniquePhoneRule],
            'alamat' => ['required', 'string', 'max:1000'],
            'boleh_bayar_akhir' => ['required', 'boolean'],
        ];
    }
}
