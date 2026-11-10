<?php

namespace App\Policies\Concerns;

use App\Enums\UserRole;
use App\Models\User;

trait ChecksPetugasRole
{
    protected function isActivePetugas(User $user): bool
    {
        return $user->is_active && $user->role === UserRole::PETUGAS;
    }
}
