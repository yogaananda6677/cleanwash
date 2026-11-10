<?php

namespace App\Http\Controllers;

use App\Http\Requests\Master\StorePelangganRequest;
use App\Http\Requests\Master\UpdatePelangganRequest;
use App\Models\Pelanggan;
use App\Services\PelangganService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PelangganController extends Controller
{
    public function __construct(
        private readonly PelangganService $pelangganService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Pelanggan::class);

        $search = trim((string) $request->query('search', ''));

        return Inertia::render('Pelanggan/Index', [
            'pelanggan' => $this->pelangganService->paginate($search),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(StorePelangganRequest $request): RedirectResponse
    {
        $this->authorize('create', Pelanggan::class);

        $this->pelangganService->create($request->validated());

        return redirect()
            ->route('pelanggan.index')
            ->with('success', 'Pelanggan berhasil ditambahkan.');
    }

    public function update(UpdatePelangganRequest $request, Pelanggan $pelanggan): RedirectResponse
    {
        $this->authorize('update', $pelanggan);

        $this->pelangganService->update($pelanggan, $request->validated());

        return redirect()
            ->route('pelanggan.index')
            ->with('success', 'Data pelanggan berhasil diperbarui.');
    }

    public function destroy(Request $request, Pelanggan $pelanggan): RedirectResponse
    {
        $this->authorize('delete', $pelanggan);

        return $this->executeWithFlashRedirect(
            $request,
            fn () => $this->pelangganService->delete($pelanggan),
            'pelanggan.index',
            'Pelanggan berhasil dihapus.'
        );
    }
}
