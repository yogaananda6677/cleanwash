<?php

namespace App\Http\Controllers;

use App\Http\Requests\Master\StoreJenisLayananRequest;
use App\Http\Requests\Master\UpdateJenisLayananRequest;
use App\Models\JenisLayanan;
use App\Services\JenisLayananService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JenisLayananController extends Controller
{
    public function __construct(
        private readonly JenisLayananService $jenisLayananService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', JenisLayanan::class);

        $search = trim((string) $request->query('search', ''));

        return Inertia::render('Layanan/Index', [
            'layanan' => $this->jenisLayananService->paginate($search),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(StoreJenisLayananRequest $request): RedirectResponse
    {
        $this->authorize('create', JenisLayanan::class);

        $this->jenisLayananService->create($request->validated());

        return redirect()
            ->route('layanan.index')
            ->with('success', 'Jenis layanan berhasil ditambahkan.');
    }

    public function update(UpdateJenisLayananRequest $request, JenisLayanan $layanan): RedirectResponse
    {
        $this->authorize('update', $layanan);

        return $this->executeWithFlashRedirect(
            $request,
            fn () => $this->jenisLayananService->update($layanan, $request->validated()),
            'layanan.index',
            'Jenis layanan berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, JenisLayanan $layanan): RedirectResponse
    {
        $this->authorize('delete', $layanan);

        return $this->executeWithFlashRedirect(
            $request,
            fn () => $this->jenisLayananService->delete($layanan),
            'layanan.index',
            'Jenis layanan berhasil dihapus.'
        );
    }
}
