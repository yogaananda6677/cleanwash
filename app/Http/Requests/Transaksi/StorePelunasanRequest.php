<?php

namespace App\Http\Requests\Transaksi;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePelunasanRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('nominal_bayar') && is_string($this->input('nominal_bayar'))) {
            $trimmed = trim($this->input('nominal_bayar'));
            $updates['nominal_bayar'] = $trimmed === '' ? null : $trimmed;
        }

        if ($this->has('redirect_to') && is_string($this->input('redirect_to'))) {
            $trimmedRedirect = trim($this->input('redirect_to'));
            $updates['redirect_to'] = $trimmedRedirect === '' ? null : $trimmedRedirect;
        }

        if ($updates !== []) {
            $this->merge($updates);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nominal_bayar' => ['required', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2'],
            'redirect_to' => ['nullable', 'string', Rule::in(['transaksi.show', 'serah-terima'])],
        ];
    }
}
