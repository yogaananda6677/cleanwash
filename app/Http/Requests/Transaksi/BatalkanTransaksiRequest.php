<?php

namespace App\Http\Requests\Transaksi;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;

class BatalkanTransaksiRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('alasan_pembatalan') && is_string($this->input('alasan_pembatalan'))) {
            $updates['alasan_pembatalan'] = trim($this->input('alasan_pembatalan'));
        }

        if ($this->has('biaya_pembatalan') && is_string($this->input('biaya_pembatalan'))) {
            $trimmedFee = trim($this->input('biaya_pembatalan'));
            $updates['biaya_pembatalan'] = $trimmedFee === '' ? null : $trimmedFee;
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
            'alasan_pembatalan' => ['required', 'string', 'min:3', 'max:500'],
            'biaya_pembatalan' => ['nullable', 'numeric', 'gte:0', 'max:999999999.99', 'decimal:0,2'],
        ];
    }
}
