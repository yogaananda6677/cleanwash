<?php

namespace App\Http\Requests\Master;

class StorePelangganRequest extends BasePelangganRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return $this->pelangganRules();
    }
}
