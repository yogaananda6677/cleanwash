<?php

namespace App\Http\Controllers;

use App\Enums\StatusPengantaran;
use App\Enums\UserRole;
use App\Http\Requests\Pengantaran\JadwalkanUlangRequest;
use App\Http\Requests\Pengantaran\StorePengantaranRequest;
use App\Http\Requests\Pengantaran\UpdateItemPengantaranStatusRequest;
use App\Models\ItemPengantaran;
use App\Models\Pengantaran;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Services\PengantaranService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PengantaranController extends Controller
{
    public function __construct(
        private readonly PengantaranService $pengantaranService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Pengantaran::class);

        $user = $request->user();
        if ($user->role === UserRole::PENGANTAR) {
            $this->resolvePengantarProfile($request);
        }

        $search = trim((string) $request->query('search', ''));
        $rawStatus = strtoupper(trim((string) $request->query('status_pengantaran', '')));
        $statusPengantaran = in_array($rawStatus, StatusPengantaran::values(), true) ? $rawStatus : '';
        $tanggalPengantaran = $this->sanitizeDateFilter((string) $request->query('tanggal_pengantaran', ''));

        $rawKurir = trim((string) $request->query('id_petugas_antar', ''));
        $idPetugasAntar = ($user->role === UserRole::PETUGAS && ctype_digit($rawKurir) && (int) $rawKurir > 0)
            ? $rawKurir
            : '';

        $filters = [
            'search' => $search,
            'status_pengantaran' => $statusPengantaran,
            'tanggal_pengantaran' => $tanggalPengantaran,
            'id_petugas_antar' => $idPetugasAntar,
        ];

        return Inertia::render('Pengantaran/Index', [
            'pengantaran' => $this->pengantaranService->paginatePengantaran($filters, $user),
            'filters' => $filters,
            'kurirOptions' => $this->pengantaranService->getKurirOptions(),
            'eligibleTransaksiOptions' => $user->role === UserRole::PETUGAS
                ? $this->pengantaranService->getEligibleTransaksiOptions()
                : [],
            'statusCounts' => $this->pengantaranService->getStatusCounts($user),
        ]);
    }

    public function store(StorePengantaranRequest $request): RedirectResponse
    {
        $this->authorize('create', Pengantaran::class);

        $petugas = $this->resolvePetugasProfile($request);

        try {
            $pengantaran = $this->pengantaranService->buatJadwal(
                $petugas,
                $request->validated(),
                $request->user()
            );
        } catch (ValidationException $exception) {
            if ($request->expectsJson()) {
                throw $exception;
            }

            $firstMessage = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

            return redirect()
                ->back(fallback: route('pengantaran.index'))
                ->withInput()
                ->with('error', $firstMessage)
                ->withErrors($exception->errors());
        }

        return redirect()
            ->route('pengantaran.show', ['pengantaran' => $pengantaran->id_pengantaran])
            ->with('success', "Jadwal pengantaran #{$pengantaran->id_pengantaran} berhasil dibuat.");
    }

    public function show(int|string $pengantaran): Response
    {
        $pengantaranModel = $this->pengantaranService->findForDetail($pengantaran);
        $this->authorize('view', $pengantaranModel);

        return Inertia::render('Pengantaran/Show', [
            'pengantaran' => $this->pengantaranService->formatPengantaranDetail($pengantaranModel),
            'kurirOptions' => $this->pengantaranService->getKurirOptions(),
        ]);
    }

    public function mulai(Request $request, int|string $pengantaran): RedirectResponse
    {
        $pengantaranModel = Pengantaran::findOrFail($pengantaran);
        $this->authorize('mulai', $pengantaranModel);

        $kurir = $this->resolvePengantarProfile($request);

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($pengantaranModel, $kurir, $request): void {
                $this->pengantaranService->mulaiPengantaran(
                    $pengantaranModel,
                    $kurir,
                    $request->user()
                );
            },
            'pengantaran.show',
            "Pengantaran #{$pengantaranModel->id_pengantaran} telah dimulai.",
            ['pengantaran' => $pengantaranModel->id_pengantaran]
        );
    }

    public function updateItemStatus(UpdateItemPengantaranStatusRequest $request, int|string $item): RedirectResponse
    {
        $itemModel = ItemPengantaran::with('pengantaran')->findOrFail($item);
        $this->authorize('updateItemStatus', $itemModel->pengantaran);

        $kurir = $this->resolvePengantarProfile($request);
        $validated = $request->validated();

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($itemModel, $kurir, $validated, $request): void {
                $this->pengantaranService->updateStatusItem(
                    $itemModel,
                    $kurir,
                    $validated,
                    $request->user()
                );
            },
            'pengantaran.show',
            "Status pengantaran nota {$itemModel->nomor_nota} berhasil diperbarui ke {$validated['status_terima_pelanggan']}.",
            ['pengantaran' => $itemModel->id_pengantaran]
        );
    }

    public function jadwalkanUlang(JadwalkanUlangRequest $request, int|string $item): RedirectResponse
    {
        $itemModel = ItemPengantaran::with('pengantaran')->findOrFail($item);
        $this->authorize('jadwalkanUlang', $itemModel->pengantaran);

        $user = $request->user();
        if ($user->role === UserRole::PETUGAS) {
            $this->resolvePetugasProfile($request);
        } elseif ($user->role === UserRole::PENGANTAR) {
            $this->resolvePengantarProfile($request);
        }

        try {
            $pengantaranBaru = $this->pengantaranService->jadwalkanUlang(
                $itemModel,
                $user,
                $request->validated()
            );
        } catch (ValidationException $exception) {
            if ($request->expectsJson()) {
                throw $exception;
            }

            $firstMessage = collect($exception->errors())->flatten()->first() ?? $exception->getMessage();

            return redirect()
                ->back(fallback: route('pengantaran.show', ['pengantaran' => $itemModel->id_pengantaran]))
                ->withInput()
                ->with('error', $firstMessage)
                ->withErrors($exception->errors());
        }

        return redirect()
            ->route('pengantaran.show', ['pengantaran' => $pengantaranBaru->id_pengantaran])
            ->with('success', "Pengantaran ulang nota {$itemModel->nomor_nota} berhasil dijadwalkan pada sesi #{$pengantaranBaru->id_pengantaran}.");
    }

    private function resolvePetugasProfile(Request $request): Petugas
    {
        $petugas = $request->user()?->petugas;

        if ($petugas === null) {
            abort(403, 'Profil petugas tidak ditemukan untuk akun ini.');
        }

        return $petugas;
    }

    private function resolvePengantarProfile(Request $request): PetugasPengantaran
    {
        $kurir = $request->user()?->petugasPengantaran;

        if ($kurir === null) {
            abort(403, 'Profil kurir pengantaran tidak ditemukan untuk akun ini.');
        }

        return $kurir;
    }

    private function sanitizeDateFilter(string $rawDate): string
    {
        $trimmed = trim($rawDate);

        if ($trimmed === '' || preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed) !== 1) {
            return '';
        }

        try {
            return Carbon::createFromFormat('Y-m-d', $trimmed, 'Asia/Jakarta')->toDateString();
        } catch (Throwable) {
            return '';
        }
    }
}
