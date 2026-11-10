<?php

namespace App\Http\Requests\Master;

use App\Models\Pelanggan;

class UpdatePelangganRequest extends BasePelangganRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $pelanggan = $this->route('pelanggan');
        $pelangganId = $pelanggan instanceof Pelanggan
            ? $pelanggan->id_pelanggan
            : (is_numeric($pelanggan) ? (int) $pelanggan : null);

        return $this->pelangganRules($pelangganId);
    }
}
