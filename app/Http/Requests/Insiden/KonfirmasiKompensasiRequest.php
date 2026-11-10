<?php

namespace App\Http\Requests\Insiden;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;

class KonfirmasiKompensasiRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('nilai_kompensasi') && is_string($this->input('nilai_kompensasi'))) {
            $trimmedNilai = trim($this->input('nilai_kompensasi'));
            $updates['nilai_kompensasi'] = $trimmedNilai === '' ? null : $trimmedNilai;
        }

        if ($this->has('keterangan_konfirmasi') && is_string($this->input('keterangan_konfirmasi'))) {
            $trimmedNote = trim($this->input('keterangan_konfirmasi'));
            $updates['keterangan_konfirmasi'] = $trimmedNote === '' ? null : $trimmedNote;
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
            'nilai_kompensasi' => ['nullable', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2'],
            'keterangan_konfirmasi' => ['nullable', 'string', 'max:500'],
        ];
    }
}
