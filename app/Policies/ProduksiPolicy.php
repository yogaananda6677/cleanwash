<?php

namespace App\Policies;

use App\Models\Transaksi;
use App\Models\User;
use App\Policies\Concerns\ChecksPegawaiRole;

class ProduksiPolicy
{
    use ChecksPegawaiRole;

    public function viewAny(User $user): bool
    {
        return $this->isActivePegawai($user);
    }

    public function timbangUlang(User $user, ?Transaksi $transaksi = null): bool
    {
        return $this->isActivePegawai($user);
    }

    public function ubahStatus(User $user, ?Transaksi $transaksi = null): bool
    {
        return $this->isActivePegawai($user);
    }
}
