<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Petugas;
use Illuminate\Http\Request;

trait HandlesPetugasTransaksiAction
{
    private function resolvePetugasProfile(Request $request): Petugas
    {
        $petugas = $request->user()?->petugas;

        if ($petugas === null) {
            abort(403, 'Profil petugas tidak ditemukan untuk akun ini.');
        }

        return $petugas;
    }

    /**
     * @return array{route: string, params: array<string, mixed>}
     */
    private function resolveTransaksiRedirectTarget(?string $redirectTo, string $nomorNota): array
    {
        if ($redirectTo === 'serah-terima') {
            return [
                'route' => 'serah-terima.index',
                'params' => [],
            ];
        }

        return [
            'route' => 'transaksi.show',
            'params' => ['nota' => $nomorNota],
        ];
    }
}
