<?php

namespace App\Http\Controllers;

use App\Enums\JenisInsiden;
use App\Enums\UserRole;
use App\Http\Requests\Insiden\KonfirmasiKompensasiRequest;
use App\Http\Requests\Insiden\StoreInsidenRequest;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Petugas;
use App\Models\User;
use App\Services\KompensasiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InsidenController extends Controller
{
    public function __construct(
        private readonly KompensasiService $kompensasiService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', LaporanKerusakanKehilangan::class);

        $search = trim((string) $request->query('search', ''));
        $rawJenis = strtoupper(trim((string) $request->query('jenis_insiden', '')));
        $jenisInsiden = in_array($rawJenis, JenisInsiden::values(), true) ? $rawJenis : '';
        $rawStatus = strtoupper(trim((string) $request->query('status_konfirmasi', '')));
        $statusKonfirmasi = in_array($rawStatus, ['MENUNGGU_KONFIRMASI', 'TERKONFIRMASI'], true) ? $rawStatus : '';

        $filters = [
            'search' => $search,
            'jenis_insiden' => $jenisInsiden,
            'status_konfirmasi' => $statusKonfirmasi,
        ];

        return Inertia::render('Insiden/Index', [
            'laporan' => $this->kompensasiService->paginateLaporan($filters),
            'filters' => $filters,
            'pendingCount' => $this->kompensasiService->countPending(),
            'eligibleTransaksiOptions' => $this->kompensasiService->getEligibleTransaksiOptions(),
        ]);
    }

    public function store(StoreInsidenRequest $request): RedirectResponse
    {
        $this->authorize('create', LaporanKerusakanKehilangan::class);

        $actor = $this->resolveAuthorizedIncidentActor($request);
        $validated = $request->validated();

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($actor, $validated): void {
                $this->kompensasiService->laporInsiden($actor, $validated);
            },
            'insiden.index',
            $this->buildStoreSuccessMessage($actor, $validated['nomor_nota'])
        );
    }

    public function storeForTransaksi(StoreInsidenRequest $request, string $nota): RedirectResponse
    {
        $this->authorize('create', LaporanKerusakanKehilangan::class);

        $actor = $this->resolveAuthorizedIncidentActor($request);
        $validated = $request->validated();

        $fallbackRoute = $actor->role === UserRole::PETUGAS ? 'transaksi.show' : 'produksi.index';
        $routeParams = $actor->role === UserRole::PETUGAS ? ['nota' => $validated['nomor_nota']] : [];

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($actor, $validated): void {
                $this->kompensasiService->laporInsiden($actor, $validated);
            },
            $fallbackRoute,
            $this->buildStoreSuccessMessage($actor, $validated['nomor_nota']),
            $routeParams
        );
    }

    public function konfirmasi(KonfirmasiKompensasiRequest $request, int|string $laporan): RedirectResponse
    {
        $laporanModel = LaporanKerusakanKehilangan::findOrFail($laporan);
        $this->authorize('konfirmasi', $laporanModel);

        $petugas = $this->resolvePetugasProfile($request);

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($petugas, $laporanModel, $request): void {
                $this->kompensasiService->konfirmasiKompensasi(
                    $petugas,
                    $laporanModel,
                    $request->validated(),
                    $request->user()
                );
            },
            'insiden.index',
            "Kompensasi laporan insiden #{$laporanModel->id_laporan} berhasil dikonfirmasi."
        );
    }

    private function resolveAuthorizedIncidentActor(Request $request): User
    {
        $user = $request->user();

        if ($user === null || ! $user->is_active) {
            abort(403, 'Akun pengguna tidak aktif atau tidak memiliki akses.');
        }

        if ($user->role === UserRole::PETUGAS && $user->petugas === null) {
            abort(403, 'Profil petugas tidak ditemukan untuk akun ini.');
        }

        if ($user->role === UserRole::PEGAWAI && $user->pegawai === null) {
            abort(403, 'Profil pegawai tidak ditemukan untuk akun ini.');
        }

        if (! in_array($user->role, [UserRole::PETUGAS, UserRole::PEGAWAI], true)) {
            abort(403, 'Anda tidak memiliki hak akses untuk melaporkan insiden.');
        }

        return $user;
    }

    private function resolvePetugasProfile(Request $request): Petugas
    {
        $petugas = $request->user()?->petugas;

        if ($petugas === null) {
            abort(403, 'Profil petugas tidak ditemukan untuk akun ini.');
        }

        return $petugas;
    }

    private function buildStoreSuccessMessage(User $actor, string $nomorNota): string
    {
        if ($actor->role === UserRole::PETUGAS) {
            return "Laporan insiden nota {$nomorNota} berhasil dicatat dan kompensasi telah dipotong.";
        }

        return "Laporan insiden nota {$nomorNota} berhasil diajukan untuk konfirmasi petugas.";
    }
}
