<?php

namespace App\Http\Requests\Insiden;

use App\Enums\JenisInsiden;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreInsidenRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->is_active
            && in_array($user->role, [UserRole::PETUGAS, UserRole::PEGAWAI], true);
    }

    protected function prepareForValidation(): void
    {
        $updates = [];

        $routeNota = $this->route('nota');
        $rawNomorNota = $this->input('nomor_nota');

        if (is_string($rawNomorNota)) {
            $trimmedNota = trim($rawNomorNota);
            $updates['nomor_nota'] = $trimmedNota;
        }

        if (is_string($routeNota) && trim($routeNota) !== '') {
            $normalizedRouteNota = trim($routeNota);
            if (! $this->has('nomor_nota') || trim((string) $rawNomorNota) === '') {
                $updates['nomor_nota'] = $normalizedRouteNota;
            }
        }

        if ($this->has('jenis_insiden') && is_string($this->input('jenis_insiden'))) {
            $updates['jenis_insiden'] = Str::upper(trim($this->input('jenis_insiden')));
        }

        if ($this->has('keterangan') && is_string($this->input('keterangan'))) {
            $updates['keterangan'] = trim($this->input('keterangan'));
        }

        if ($this->has('nilai_kompensasi') && is_string($this->input('nilai_kompensasi'))) {
            $trimmedNilai = trim($this->input('nilai_kompensasi'));
            $updates['nilai_kompensasi'] = $trimmedNilai === '' ? null : $trimmedNilai;
        }

        if ($this->has('id_pegawai_pelapor') && is_string($this->input('id_pegawai_pelapor'))) {
            $trimmedPegawai = trim($this->input('id_pegawai_pelapor'));
            $updates['id_pegawai_pelapor'] = $trimmedPegawai === '' ? null : $trimmedPegawai;
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
            'nomor_nota' => ['required', 'string', 'exists:transaksi,nomor_nota'],
            'id_detail' => ['required', 'integer', 'exists:detail_pakaian,id_detail'],
            'jenis_insiden' => ['required', 'string', Rule::in(JenisInsiden::values())],
            'keterangan' => ['required', 'string', 'min:5', 'max:1000'],
            'nilai_kompensasi' => ['nullable', 'numeric', 'gt:0', 'max:999999999.99', 'decimal:0,2'],
            'id_pegawai_pelapor' => ['nullable', 'integer', 'exists:pegawai,id_pegawai'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $routeNota = $this->route('nota');
                if (! is_string($routeNota) || trim($routeNota) === '') {
                    return;
                }

                $inputNota = trim((string) $this->input('nomor_nota', ''));
                if ($inputNota !== '' && $inputNota !== trim($routeNota)) {
                    $validator->errors()->add(
                        'nomor_nota',
                        'Nomor nota pada payload harus sesuai dengan parameter transaksi pada URL.'
                    );
                }
            },
        ];
    }
}
