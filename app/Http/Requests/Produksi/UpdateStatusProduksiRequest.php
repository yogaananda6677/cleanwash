<?php

namespace App\Http\Requests\Produksi;

use App\Enums\TahapProduksi;
use App\Http\Requests\Concerns\AuthorizesPegawaiRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateStatusProduksiRequest extends FormRequest
{
    use AuthorizesPegawaiRequest;

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('tahap_status') && is_string($this->input('tahap_status'))) {
            $updates['tahap_status'] = Str::upper(trim($this->input('tahap_status')));
        }

        if ($this->has('catatan') && is_string($this->input('catatan'))) {
            $trimmed = trim($this->input('catatan'));
            $updates['catatan'] = $trimmed === '' ? null : $trimmed;
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
            'tahap_status' => ['required', 'string', Rule::in(TahapProduksi::values())],
            'catatan' => ['nullable', 'string', 'max:500'],
        ];
    }
}
