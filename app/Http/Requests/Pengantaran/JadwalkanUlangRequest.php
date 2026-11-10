<?php

namespace App\Http\Requests\Pengantaran;

use App\Enums\UserRole;
use App\Models\ItemPengantaran;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class JadwalkanUlangRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null || ! $user->is_active || ! in_array($user->role, [UserRole::PETUGAS, UserRole::PENGANTAR], true)) {
            return false;
        }

        if ($user->role === UserRole::PENGANTAR) {
            $routeItem = $this->route('item');
            $item = $routeItem instanceof ItemPengantaran
                ? $routeItem->loadMissing('pengantaran')
                : ItemPengantaran::with('pengantaran')->find($routeItem);

            if ($item !== null && $item->pengantaran !== null) {
                return Gate::forUser($user)->allows('jadwalkanUlang', $item->pengantaran);
            }
        }

        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('id_petugas_antar') && is_string($this->input('id_petugas_antar'))) {
            $trimmed = trim($this->input('id_petugas_antar'));
            if ($trimmed === '') {
                $this->merge([
                    'id_petugas_antar' => null,
                ]);
            }
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'tanggal_pengantaran' => ['required', 'date', 'after_or_equal:today'],
            'id_petugas_antar' => ['nullable', 'integer', 'exists:petugas_pengantaran,id_petugas_antar'],
        ];
    }
}
