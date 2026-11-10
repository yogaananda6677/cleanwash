<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Voucher;
use App\Policies\Concerns\ChecksPetugasRole;

class VoucherPolicy
{
    use ChecksPetugasRole;

    public function viewAny(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function view(User $user, Voucher $voucher): bool
    {
        return $this->isActivePetugas($user);
    }

    public function create(User $user): bool
    {
        return $this->isActivePetugas($user);
    }

    public function update(User $user, Voucher $voucher): bool
    {
        return $this->isActivePetugas($user);
    }

    public function delete(User $user, Voucher $voucher): bool
    {
        return $this->isActivePetugas($user);
    }

    public function validate(User $user): bool
    {
        return $this->isActivePetugas($user);
    }
}
