<?php

namespace App\Policies\Concerns;

use App\Enums\UserRole;
use App\Models\User;

trait ChecksPegawaiRole
{
    protected function isActivePegawai(User $user): bool
    {
        return $user->is_active && $user->role === UserRole::PEGAWAI;
    }
}
