<?php

namespace App\Http\Requests\Concerns;

use App\Enums\UserRole;

trait AuthorizesPetugasRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->is_active
            && $user->role === UserRole::PETUGAS;
    }
}
