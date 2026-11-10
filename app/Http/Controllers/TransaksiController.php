<?php

namespace App\Http\Controllers;

use App\Enums\StatusPembayaran;
use App\Http\Requests\Transaksi\StoreTransaksiRequest;
use App\Models\Transaksi;
use App\Services\TransaksiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TransaksiController extends Controller
{
    public function __construct(
        private readonly TransaksiService $transaksiService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Transaksi::class);

        $search = trim((string) $request->query('search', ''));
        $rawStatus = strtoupper(trim((string) $request->query('status_pembayaran', '')));
        $statusPembayaran = in_array($rawStatus, StatusPembayaran::values(), true) ? $rawStatus : '';

        return Inertia::render('Transaksi/Index', [
            'transaksi' => $this->transaksiService->paginate($search, $statusPembayaran),
            'filters' => [
                'search' => $search,
                'status_pembayaran' => $statusPembayaran,
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Transaksi::class);

        return Inertia::render('Transaksi/Create', $this->transaksiService->getCreateOptions());
    }

    public function store(StoreTransaksiRequest $request): RedirectResponse
    {
        $this->authorize('create', Transaksi::class);

        $user = $request->user();
        $petugas = $user?->petugas;

        if ($petugas === null) {
            abort(403, 'Profil petugas tidak ditemukan untuk akun ini.');
        }

        try {
            $transaksi = $this->transaksiService->buatTransaksi(
                $petugas,
                $request->validated(),
                $user
            );
        } catch (ValidationException $exception) {
            if ($request->expectsJson()) {
                throw $exception;
            }

            $firstMessage = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

            return redirect()
                ->back(fallback: route('transaksi.create'))
                ->withInput()
                ->with('error', $firstMessage)
                ->withErrors($exception->errors());
        }

        return redirect()
            ->route('transaksi.show', $transaksi->nomor_nota)
            ->with('success', "Transaksi {$transaksi->nomor_nota} berhasil dibuat.");
    }

    public function show(string $nota): Response
    {
        return $this->renderDetail($nota, 'Transaksi/Show');
    }

    public function nota(string $nota): Response
    {
        return $this->renderDetail($nota, 'Transaksi/Nota');
    }

    private function renderDetail(string $nota, string $component): Response
    {
        $transaksi = $this->transaksiService->findForDetail($nota);
        $this->authorize('view', $transaksi);

        return Inertia::render($component, [
            'transaksi' => $this->transaksiService->formatTransaksiDetail($transaksi),
        ]);
    }
}
