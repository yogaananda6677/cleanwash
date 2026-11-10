<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesPetugasTransaksiAction;
use App\Http\Requests\Transaksi\StorePelunasanRequest;
use App\Models\Transaksi;
use App\Services\PembayaranService;
use App\Support\DecimalMoney;
use Illuminate\Http\RedirectResponse;

class PembayaranController extends Controller
{
    use HandlesPetugasTransaksiAction;

    public function __construct(
        private readonly PembayaranService $pembayaranService
    ) {}

    public function store(StorePelunasanRequest $request, string $nota): RedirectResponse
    {
        $transaksi = Transaksi::findOrFail($nota);
        $this->authorize('pelunasan', $transaksi);

        $petugas = $this->resolvePetugasProfile($request);
        $validated = $request->validated();
        $redirect = $this->resolveTransaksiRedirectTarget($validated['redirect_to'] ?? null, $transaksi->nomor_nota);
        $formattedNominal = DecimalMoney::formatRupiah((string) $validated['nominal_bayar']);

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($transaksi, $petugas, $validated, $request): void {
                $this->pembayaranService->catatPelunasan(
                    $transaksi->nomor_nota,
                    $petugas,
                    $validated,
                    $request->user()
                );
            },
            $redirect['route'],
            "Pelunasan sebesar {$formattedNominal} untuk nota {$transaksi->nomor_nota} berhasil dicatat.",
            $redirect['params']
        );
    }
}
