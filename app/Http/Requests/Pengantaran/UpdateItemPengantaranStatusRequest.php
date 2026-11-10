<?php

namespace App\Http\Requests\Pengantaran;

use App\Enums\StatusItemPengantaran;
use App\Http\Requests\Concerns\AuthorizesPengantarRequest;
use App\Models\ItemPengantaran;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateItemPengantaranStatusRequest extends FormRequest
{
    use AuthorizesPengantarRequest {
        authorize as private authorizesActivePengantar;
    }

    public function authorize(): bool
    {
        if (! $this->authorizesActivePengantar()) {
            return false;
        }

        $routeItem = $this->route('item');
        $item = $routeItem instanceof ItemPengantaran
            ? $routeItem->loadMissing('pengantaran')
            : ItemPengantaran::with('pengantaran')->find($routeItem);

        if ($item !== null && $item->pengantaran !== null) {
            return Gate::forUser($this->user())->allows('updateItemStatus', $item->pengantaran);
        }

        return true;
    }

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('status_terima_pelanggan') && is_string($this->input('status_terima_pelanggan'))) {
            $updates['status_terima_pelanggan'] = Str::upper(trim($this->input('status_terima_pelanggan')));
        }

        if ($this->has('alasan_gagal') && is_string($this->input('alasan_gagal'))) {
            $trimmed = trim($this->input('alasan_gagal'));
            $updates['alasan_gagal'] = $trimmed === '' ? null : $trimmed;
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
            'status_terima_pelanggan' => ['required', 'string', Rule::in(StatusItemPengantaran::values())],
            'alasan_gagal' => ['nullable', 'required_if:status_terima_pelanggan,GAGAL', 'string', 'min:5', 'max:1000'],
        ];
    }
}
