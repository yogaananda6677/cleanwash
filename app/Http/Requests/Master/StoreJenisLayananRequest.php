<?php

namespace App\Http\Requests\Master;

class StoreJenisLayananRequest extends BaseJenisLayananRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return $this->layananRules();
    }
}
