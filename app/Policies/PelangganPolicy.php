<?php

namespace App\Policies;

use App\Models\Pelanggan;
use App\Models\User;
use App\Policies\Concerns\ChecksPetugasRole;

class PelangganPolicy
{
    use ChecksPetugasRole;

    public function viewAny(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function view(User $user, Pelanggan $pelanggan): bool
    {
        return $this->isActivePetugas($user);
    }

    public function create(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function update(User $user, Pelanggan $pelanggan): bool
    {
        return $this->isActivePetugas($user);
    }

    public function delete(User $user, Pelanggan $pelanggan): bool
    {
        return $this->isActivePetugas($user);
    }
}
