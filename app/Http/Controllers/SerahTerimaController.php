<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\HandlesPetugasTransaksiAction;
use App\Http\Requests\Transaksi\SerahTerimaRequest;
use App\Models\Transaksi;
use App\Services\SerahTerimaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SerahTerimaController extends Controller
{
    use HandlesPetugasTransaksiAction;

    public function __construct(
        private readonly SerahTerimaService $serahTerimaService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('serahTerima.viewAny');

        $search = trim((string) $request->query('search', ''));
        $rawMode = strtoupper(trim((string) $request->query('mode', 'SIAP_AMBIL')));
        $mode = in_array($rawMode, ['SIAP_AMBIL', 'PIUTANG', 'RIWAYAT_DIAMBIL'], true)
            ? $rawMode
            : 'SIAP_AMBIL';

        $filters = [
            'search' => $search,
            'mode' => $mode,
        ];

        return Inertia::render('SerahTerima/Index', [
            'transaksi' => $this->serahTerimaService->paginateQueue($filters),
            'filters' => $filters,
            'summary' => $this->serahTerimaService->getSummary(),
        ]);
    }

    public function store(SerahTerimaRequest $request, string $nota): RedirectResponse
    {
        $transaksi = Transaksi::findOrFail($nota);
        $this->authorize('serahTerima', $transaksi);

        $petugas = $this->resolvePetugasProfile($request);
        $validated = $request->validated();
        $redirect = $this->resolveTransaksiRedirectTarget($validated['redirect_to'] ?? null, $transaksi->nomor_nota);

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($transaksi, $petugas, $validated, $request): void {
                $this->serahTerimaService->serahkanPakaian(
                    $transaksi->nomor_nota,
                    $petugas,
                    $validated['catatan'] ?? null,
                    $request->user()
                );
            },
            $redirect['route'],
            "Pakaian untuk nota {$transaksi->nomor_nota} berhasil diserahkan kepada pelanggan.",
            $redirect['params']
        );
    }
}
