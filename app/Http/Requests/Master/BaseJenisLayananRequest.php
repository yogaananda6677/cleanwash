<?php

namespace App\Http\Requests\Master;

use App\Enums\MetodeHitung;
use App\Enums\SatuanLayanan;
use App\Enums\TahapProduksi;
use App\Enums\TingkatKecepatan;
use App\Http\Requests\Concerns\AuthorizesPetugasRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class BaseJenisLayananRequest extends FormRequest
{
    use AuthorizesPetugasRequest;

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('nama_layanan'))) {
            $this->merge([
                'nama_layanan' => trim($this->input('nama_layanan')),
            ]);
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    protected function layananRules(?int $ignoreLayananId = null): array
    {
        $uniqueServiceRule = Rule::unique('jenis_layanan', 'nama_layanan')
            ->where(fn ($query) => $query->where('tingkat_kecepatan', $this->input('tingkat_kecepatan')));

        if ($ignoreLayananId !== null) {
            $uniqueServiceRule = $uniqueServiceRule->ignore($ignoreLayananId, 'id_layanan');
        }

        return [
            'nama_layanan' => ['required', 'string', 'max:100', $uniqueServiceRule],
            'tingkat_kecepatan' => ['required', 'string', Rule::in(TingkatKecepatan::values())],
            'metode_hitung' => ['required', 'string', Rule::in(MetodeHitung::values())],
            'satuan' => ['required', 'string', Rule::in(SatuanLayanan::values())],
            'harga_satuan' => ['required', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2'],
            'perlu_setrika' => ['required', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'tahap_layanan' => ['nullable', 'array', 'min:2'],
            'tahap_layanan.*' => ['required', 'string', 'distinct', Rule::in(TahapProduksi::values())],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $this->validateMetodeSatuanPairing($validator);
                $this->validateTahapLayanan($validator);
            },
        ];
    }

    private function validateMetodeSatuanPairing(Validator $validator): void
    {
        $metode = $this->input('metode_hitung');
        $satuan = $this->input('satuan');

        if (! in_array($metode, MetodeHitung::values(), true) || ! in_array($satuan, SatuanLayanan::values(), true)) {
            return;
        }

        if ($metode === MetodeHitung::BERAT->value && $satuan !== SatuanLayanan::KG->value) {
            $validator->errors()->add('satuan', 'Metode hitung BERAT wajib menggunakan satuan kg.');
        }

        if ($metode === MetodeHitung::JUMLAH->value && $satuan !== SatuanLayanan::PCS->value) {
            $validator->errors()->add('satuan', 'Metode hitung JUMLAH wajib menggunakan satuan pcs.');
        }
    }

    private function validateTahapLayanan(Validator $validator): void
    {
        $stages = $this->input('tahap_layanan');

        if (! is_array($stages) || count($stages) < 2) {
            return;
        }

        $orderedStages = array_values($stages);
        $first = $orderedStages[0] ?? null;
        $last = $orderedStages[count($orderedStages) - 1] ?? null;

        if ($first !== TahapProduksi::DITERIMA->value) {
            $validator->errors()->add('tahap_layanan', 'Tahap layanan wajib diawali dengan DITERIMA.');
        }

        if ($last !== TahapProduksi::SELESAI->value) {
            $validator->errors()->add('tahap_layanan', 'Tahap layanan wajib diakhiri dengan SELESAI.');
        }

        $perluSetrika = filter_var($this->input('perlu_setrika'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        if ($perluSetrika === false && in_array(TahapProduksi::DISETRIKA->value, $orderedStages, true)) {
            $validator->errors()->add('tahap_layanan', 'Layanan tanpa setrika (perlu_setrika = false) dilarang memiliki tahap DISETRIKA.');
        }
    }
}
