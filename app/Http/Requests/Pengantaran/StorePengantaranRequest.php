<?php

namespace App\Http\Requests\Pengantaran;

use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;

class StorePengantaranRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        if ($this->has('nomor_nota_list') && is_array($this->input('nomor_nota_list'))) {
            $normalized = array_map(
                static fn (mixed $nota): mixed => is_string($nota) ? trim($nota) : $nota,
                $this->input('nomor_nota_list')
            );

            $this->merge([
                'nomor_nota_list' => $normalized,
            ]);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'id_petugas_antar' => ['required', 'integer', 'exists:petugas_pengantaran,id_petugas_antar'],
            'tanggal_pengantaran' => ['required', 'date', 'after_or_equal:today'],
            'nomor_nota_list' => ['required', 'array', 'min:1'],
            'nomor_nota_list.*' => ['required', 'string', 'distinct', 'exists:transaksi,nomor_nota'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nomor_nota_list.*.distinct' => 'Daftar nomor nota tidak boleh mengandung duplikat.',
        ];
    }
}
