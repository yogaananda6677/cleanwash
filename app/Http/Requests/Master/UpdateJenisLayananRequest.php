<?php

namespace App\Http\Requests\Master;

use App\Models\JenisLayanan;

class UpdateJenisLayananRequest extends BaseJenisLayananRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $layanan = $this->route('layanan');
        $layananId = $layanan instanceof JenisLayanan
            ? $layanan->id_layanan
            : (is_numeric($layanan) ? (int) $layanan : null);

        return $this->layananRules($layananId);
    }
}
