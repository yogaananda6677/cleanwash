<?php

namespace App\Http\Controllers;

use App\Enums\StatusTransaksi;
use App\Enums\VoucherStatus;
use App\Models\JenisLayanan;
use App\Models\Pelanggan;
use App\Models\Transaksi;
use App\Models\Voucher;
use App\Services\TransaksiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    /**
     * Display the CleanWash Web Profile / Landing Page.
     */
    public function index(Request $request): Response
    {
        $services = JenisLayanan::query()
            ->where('is_active', true)
            ->with(['tahapLayanan' => fn ($q) => $q->orderBy('urutan')])
            ->orderBy('id_layanan')
            ->get();

        $activeVouchers = Voucher::query()
            ->where('status_penggunaan', VoucherStatus::TERSEDIA)
            ->whereDate('masa_berlaku', '>=', now()->toDateString())
            ->orderBy('nilai', 'desc')
            ->take(3)
            ->get();

        $stats = [
            'total_transaksi' => Transaksi::count(),
            'selesai_transaksi' => Transaksi::where('status_transaksi', StatusTransaksi::SELESAI)->count(),
            'total_pelanggan' => Pelanggan::count(),
            'total_layanan' => $services->count(),
        ];

        $trackingResult = null;
        $searchQuery = trim((string) $request->input('lacak', ''));

        if ($searchQuery !== '') {
            $trackingResult = $this->lookupReceipt($searchQuery);
        }

        return Inertia::render('Welcome', [
            'services' => $services,
            'activeVouchers' => $activeVouchers,
            'stats' => $stats,
            'trackingQuery' => $searchQuery,
            'trackingResult' => $trackingResult,
        ]);
    }

    /**
     * Public JSON endpoint to track laundry status by receipt number.
     */
    public function track(string $nota): JsonResponse
    {
        $result = $this->lookupReceipt(trim($nota));

        if (! $result) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor nota tidak ditemukan dalam sistem CleanWash.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Public endpoint to view and print official laundry receipt by receipt number.
     */
    public function publicNota(string $nota, TransaksiService $transaksiService): Response
    {
        $transaksi = $transaksiService->findForDetail(trim($nota));

        return Inertia::render('Transaksi/Nota', [
            'transaksi' => $transaksiService->formatTransaksiDetail($transaksi),
            'isPublicView' => true,
        ]);
    }

    /**
     * Sanitize and format tracking info with clothes breakdown and financial summary.
     *
     * @return array<string, mixed>|null
     */
    private function lookupReceipt(string $nota): ?array
    {
        $transaksi = Transaksi::query()
            ->where('nomor_nota', $nota)
            ->with([
                'pelanggan',
                'layanan.tahapLayanan' => fn ($q) => $q->orderBy('urutan'),
                'riwayatStatusProduksi' => fn ($q) => $q->orderBy('waktu_update'),
                'detailPakaian',
            ])
            ->first();

        if (! $transaksi) {
            return null;
        }

        $latestHistory = $transaksi->riwayatStatusProduksi->last();
        $latestStage = $latestHistory ? $latestHistory->tahap_status->value : 'DITERIMA';

        $stages = $transaksi->layanan->tahapLayanan
            ->filter(fn ($t) => $transaksi->layanan->perlu_setrika || $t->nama_tahap->value !== 'DISETRIKA')
            ->values()
            ->map(function ($t) use ($transaksi) {
                $history = $transaksi->riwayatStatusProduksi->firstWhere('tahap_status', $t->nama_tahap);

                return [
                    'nama_tahap' => $t->nama_tahap->value,
                    'is_completed' => $history !== null,
                    'waktu_update' => $history ? $history->waktu_update->toIso8601String() : null,
                ];
            });

        return [
            'nomor_nota' => $transaksi->nomor_nota,
            'nama_pelanggan' => $transaksi->pelanggan->nama,
            'status_transaksi' => $transaksi->status_transaksi->value,
            'status_pembayaran' => $transaksi->status_pembayaran->value,
            'total_harga' => (string) $transaksi->total_harga,
            'diskon_voucher' => (string) $transaksi->diskon_voucher,
            'total_dibayar' => (string) $transaksi->total_dibayar,
            'sisa_tagihan' => (string) $transaksi->sisa_tagihan,
            'layanan' => [
                'nama' => $transaksi->layanan->nama_layanan,
                'kecepatan' => $transaksi->layanan->tingkat_kecepatan->value,
                'metode_hitung' => $transaksi->layanan->metode_hitung->value,
            ],
            'berat_atau_jumlah' => (string) $transaksi->berat_atau_jumlah,
            'total_potong' => $transaksi->detailPakaian->sum('jumlah_potong'),
            'detail_pakaian' => $transaksi->detailPakaian->map(fn ($dp) => [
                'id_detail' => $dp->id_detail,
                'jenis_pakaian' => $dp->jenis_pakaian,
                'nama_pakaian' => $dp->jenis_pakaian,
                'jumlah_potong' => (int) $dp->jumlah_potong,
                'kondisi_pakaian' => $dp->kondisi_pakaian,
                'kondisi_khusus' => $dp->kondisi_pakaian,
            ])->all(),
            'tanggal_penerimaan' => $transaksi->tanggal_penerimaan->toIso8601String(),
            'tahap_terakhir' => $latestStage,
            'stages' => $stages,
            'siap_diambil' => $transaksi->status_transaksi === StatusTransaksi::SELESAI,
        ];
    }
}
