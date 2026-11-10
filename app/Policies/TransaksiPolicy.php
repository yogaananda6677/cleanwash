<?php

namespace App\Policies;

use App\Models\Transaksi;
use App\Models\User;
use App\Policies\Concerns\ChecksPetugasRole;

class TransaksiPolicy
{
    use ChecksPetugasRole;

    public function viewAny(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function view(User $user, Transaksi $transaksi): bool
    {
        return $this->isActivePetugas($user);
    }

    public function create(User $user): bool
    {
        return $this->isActivePetugas($user);
    }
}
