<?php

namespace App\Policies;

use App\Models\Pengantaran;
use App\Models\User;
use App\Policies\Concerns\ChecksPengantarRole;
use App\Policies\Concerns\ChecksPetugasRole;

class PengantaranPolicy
{
    use ChecksPengantarRole;
    use ChecksPetugasRole;

    public function viewAny(User $user): bool
    {
        return $this->isActivePetugas($user) || $this->isActivePengantar($user);
    }

    public function view(User $user, Pengantaran $pengantaran): bool
    {
        return $this->isActivePetugas($user) || $this->ownsPengantaran($user, $pengantaran);
    }

    public function create(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function mulai(User $user, Pengantaran $pengantaran): bool
    {
        return $this->ownsPengantaran($user, $pengantaran);
    }

    public function updateItemStatus(User $user, Pengantaran $pengantaran): bool
    {
        return $this->ownsPengantaran($user, $pengantaran);
    }

    public function jadwalkanUlang(User $user, Pengantaran $pengantaran): bool
    {
        return $this->isActivePetugas($user) || $this->ownsPengantaran($user, $pengantaran);
    }

    private function ownsPengantaran(User $user, Pengantaran $pengantaran): bool
    {
        if (! $this->isActivePengantar($user)) {
            return false;
        }

        $actorId = $user->actorId();

        return $actorId !== null && $pengantaran->id_petugas_antar === $actorId;
    }
}
