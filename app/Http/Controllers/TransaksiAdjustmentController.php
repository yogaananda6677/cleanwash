<?php

namespace App\Http\Controllers;

use App\Http\Requests\Transaksi\BatalkanTransaksiRequest;
use App\Http\Requests\Transaksi\UbahLayananRequest;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Services\TransaksiAdjustmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TransaksiAdjustmentController extends Controller
{
    public function __construct(
        private readonly TransaksiAdjustmentService $adjustmentService
    ) {}

    public function ubahLayanan(UbahLayananRequest $request, string $nota): RedirectResponse
    {
        $transaksi = Transaksi::findOrFail($nota);
        $this->authorize('ubahLayanan', $transaksi);

        $petugas = $this->resolvePetugasProfile($request);

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($transaksi, $petugas, $request): void {
                $this->adjustmentService->ubahLayanan(
                    $transaksi->nomor_nota,
                    $petugas,
                    $request->validated(),
                    $request->user()
                );
            },
            'transaksi.show',
            "Layanan transaksi {$transaksi->nomor_nota} berhasil diperbarui.",
            ['nota' => $transaksi->nomor_nota]
        );
    }

    public function batalkan(BatalkanTransaksiRequest $request, string $nota): RedirectResponse
    {
        $transaksi = Transaksi::findOrFail($nota);
        $this->authorize('batalkan', $transaksi);

        $petugas = $this->resolvePetugasProfile($request);

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($transaksi, $petugas, $request): void {
                $this->adjustmentService->batalkanTransaksi(
                    $transaksi->nomor_nota,
                    $petugas,
                    $request->validated(),
                    $request->user()
                );
            },
            'transaksi.show',
            "Transaksi {$transaksi->nomor_nota} berhasil dibatalkan.",
            ['nota' => $transaksi->nomor_nota]
        );
    }

    private function resolvePetugasProfile(Request $request): Petugas
    {
        $petugas = $request->user()?->petugas;

        if ($petugas === null) {
            abort(403, 'Profil petugas tidak ditemukan untuk akun ini.');
        }

        return $petugas;
    }
}
