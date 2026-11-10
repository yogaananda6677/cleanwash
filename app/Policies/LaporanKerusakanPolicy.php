<?php

namespace App\Policies;

use App\Models\LaporanKerusakanKehilangan;
use App\Models\User;
use App\Policies\Concerns\ChecksPegawaiRole;
use App\Policies\Concerns\ChecksPetugasRole;

class LaporanKerusakanPolicy
{
    use ChecksPegawaiRole;
    use ChecksPetugasRole;

    public function viewAny(User $user): bool
    {
        return $this->isActivePetugas($user) || $this->isActivePegawai($user);
    }

    public function create(User $user): bool
    {
        return $this->isActivePetugas($user) || $this->isActivePegawai($user);
    }

    public function konfirmasi(User $user, LaporanKerusakanKehilangan $laporan): bool
    {
        return $this->isActivePetugas($user);
    }
}
