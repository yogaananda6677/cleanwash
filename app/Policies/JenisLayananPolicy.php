<?php

namespace App\Policies;

use App\Models\JenisLayanan;
use App\Models\User;
use App\Policies\Concerns\ChecksPetugasRole;

class JenisLayananPolicy
{
    use ChecksPetugasRole;

    public function viewAny(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function view(User $user, JenisLayanan $layanan): bool
    {
        return $this->isActivePetugas($user);
    }

    public function create(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function update(User $user, JenisLayanan $layanan): bool
    {
        return $this->isActivePetugas($user);
    }

    public function delete(User $user, JenisLayanan $layanan): bool
    {
        return $this->isActivePetugas($user);
    }
}
