<?php

namespace App\Http\Controllers;

use App\Enums\TahapProduksi;
use App\Http\Requests\Produksi\TimbangUlangRequest;
use App\Http\Requests\Produksi\UpdateStatusProduksiRequest;
use App\Models\Pegawai;
use App\Models\Transaksi;
use App\Services\ProduksiService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProduksiController extends Controller
{
    public function __construct(
        private readonly ProduksiService $produksiService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('produksi.viewAny');

        $search = trim((string) $request->query('search', ''));
        $rawTahap = strtoupper(trim((string) $request->query('tahap_status', '')));
        $tahapStatus = in_array($rawTahap, TahapProduksi::values(), true) ? $rawTahap : '';

        $rawStatusTransaksi = strtoupper(trim((string) $request->query('status_transaksi', '')));
        $statusTransaksi = match (true) {
            in_array($rawStatusTransaksi, ['AKTIF', 'SELESAI', 'ALL'], true) => $rawStatusTransaksi,
            $tahapStatus === TahapProduksi::SELESAI->value => 'SELESAI',
            default => 'AKTIF',
        };

        return Inertia::render('Produksi/Index', [
            'transaksi' => $this->produksiService->paginateQueue($search, $tahapStatus, $statusTransaksi),
            'filters' => [
                'search' => $search,
                'tahap_status' => $tahapStatus,
                'status_transaksi' => $statusTransaksi,
            ],
            'stageCounts' => $this->produksiService->getStageCounts(),
        ]);
    }

    public function timbangUlang(TimbangUlangRequest $request, string $nota): RedirectResponse
    {
        $transaksi = Transaksi::findOrFail($nota);
        $this->authorize('produksi.timbangUlang', $transaksi);

        $pegawai = $this->resolvePegawaiProfile($request);

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($transaksi, $pegawai, $request): void {
                $this->produksiService->timbangUlang(
                    $transaksi->nomor_nota,
                    $pegawai,
                    $request->validated(),
                    $request->user()
                );
            },
            'produksi.index',
            "Penimbangan ulang nota {$transaksi->nomor_nota} berhasil disimpan."
        );
    }

    public function ubahStatus(UpdateStatusProduksiRequest $request, string $nota): RedirectResponse
    {
        $transaksi = Transaksi::findOrFail($nota);
        $this->authorize('produksi.ubahStatus', $transaksi);

        $pegawai = $this->resolvePegawaiProfile($request);
        $validated = $request->validated();

        return $this->executeWithFlashRedirect(
            $request,
            function () use ($transaksi, $pegawai, $validated, $request): void {
                $this->produksiService->ubahStatusProduksi(
                    $transaksi->nomor_nota,
                    $pegawai,
                    $validated,
                    $request->user()
                );
            },
            'produksi.index',
            "Status produksi nota {$transaksi->nomor_nota} berhasil diperbarui ke {$validated['tahap_status']}."
        );
    }

    private function resolvePegawaiProfile(Request $request): Pegawai
    {
        $pegawai = $request->user()?->pegawai;

        if ($pegawai === null) {
            abort(403, 'Profil pegawai tidak ditemukan untuk akun ini.');
        }

        return $pegawai;
    }
}
