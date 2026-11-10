<?php

namespace App\Http\Controllers;

use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
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
        $rawStatusTransaksi = strtoupper(trim((string) $request->query('status_transaksi', '')));
        $statusTransaksi = in_array($rawStatusTransaksi, StatusTransaksi::values(), true)
            ? $rawStatusTransaksi
            : '';

        return Inertia::render('Transaksi/Index', [
            'transaksi' => $this->transaksiService->paginate($search, $statusPembayaran, $statusTransaksi),
            'filters' => [
                'search' => $search,
                'status_pembayaran' => $statusPembayaran,
                'status_transaksi' => $statusTransaksi,
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
        $transaksi = $this->transaksiService->findForDetail($nota);
        $this->authorize('view', $transaksi);

        return Inertia::render('Transaksi/Show', [
            'transaksi' => $this->transaksiService->formatTransaksiDetail($transaksi),
            'layananOptions' => $this->transaksiService->getActiveLayananOptions(),
            'auditLogs' => $this->transaksiService->getAuditLogs($transaksi->nomor_nota),
        ]);
    }

    public function nota(string $nota): Response
    {
        $transaksi = $this->transaksiService->findForDetail($nota);
        $this->authorize('view', $transaksi);

        return Inertia::render('Transaksi/Nota', [
            'transaksi' => $this->transaksiService->formatTransaksiDetail($transaksi),
        ]);
    }
}
