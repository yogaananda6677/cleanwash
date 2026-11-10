<?php

namespace App\Policies\Concerns;

use App\Enums\UserRole;
use App\Models\User;

trait ChecksPengantarRole
{
    protected function isActivePengantar(User $user): bool
    {
        return $user->is_active && $user->role === UserRole::PENGANTAR;
    }
}
