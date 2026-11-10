<?php

namespace App\Http\Requests\Produksi;

use App\Http\Requests\Concerns\AuthorizesPegawaiRequest;
use Illuminate\Foundation\Http\FormRequest;

class TimbangUlangRequest extends FormRequest
{
    use AuthorizesPegawaiRequest;

    protected function prepareForValidation(): void
    {
        if ($this->has('catatan') && is_string($this->input('catatan'))) {
            $trimmed = trim($this->input('catatan'));
            $this->merge([
                'catatan' => $trimmed === '' ? null : $trimmed,
            ]);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'berat_aktual' => ['required', 'numeric', 'gt:0', 'max:99999.99', 'decimal:0,2'],
            'catatan' => ['nullable', 'string', 'max:500'],
        ];
    }
}
