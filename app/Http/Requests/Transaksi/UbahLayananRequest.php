<?php

namespace App\Http\Requests\Transaksi;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;

class UbahLayananRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('berat_atau_jumlah_baru') && is_string($this->input('berat_atau_jumlah_baru'))) {
            $trimmedQty = trim($this->input('berat_atau_jumlah_baru'));
            $updates['berat_atau_jumlah_baru'] = $trimmedQty === '' ? null : $trimmedQty;
        }

        if ($this->has('alasan_perubahan') && is_string($this->input('alasan_perubahan'))) {
            $updates['alasan_perubahan'] = trim($this->input('alasan_perubahan'));
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
            'id_layanan_baru' => ['required', 'integer', 'exists:jenis_layanan,id_layanan'],
            'berat_atau_jumlah_baru' => ['nullable', 'numeric', 'gt:0', 'max:99999.99', 'decimal:0,2'],
            'alasan_perubahan' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
