<?php

namespace App\Http\Controllers;

use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\StatusPengantaran;
use App\Enums\StatusTransaksi;
use App\Enums\UserRole;
use App\Enums\VoucherStatus;
use App\Models\ItemPengantaran;
use App\Models\JenisLayanan;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Pelanggan;
use App\Models\Pengantaran;
use App\Models\Transaksi;
use App\Models\Voucher;
use App\Services\PembayaranService;
use App\Services\ProduksiService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly ProduksiService $produksiService,
        private readonly PembayaranService $pembayaranService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $role = $user->role;
        $actorId = $user->actorId();

        $summary = match ($role) {
            UserRole::PETUGAS => $this->buildPetugasSummary(),
            UserRole::PEGAWAI => [
                'role' => UserRole::PEGAWAI->value,
                'antrean_aktif' => Transaksi::where('status_transaksi', StatusTransaksi::AKTIF)->count(),
                'laporan_insiden_saya' => $actorId !== null
                    ? LaporanKerusakanKehilangan::where('id_pegawai_pelapor', $actorId)->count()
                    : 0,
                ...$this->produksiService->getPegawaiDashboardMetrics(),
            ],
            UserRole::PENGANTAR => $this->buildPengantarSummary($actorId),
        };

        return Inertia::render('Dashboard/Index', [
            'summary' => $summary,
        ]);
    }

    /**
     * @return array<string, int|string>
     */
    private function buildPetugasSummary(): array
    {
        $piutangMetrics = $this->pembayaranService->summarizePiutangMetrics();

        return [
            'role' => UserRole::PETUGAS->value,
            'total_pelanggan' => Pelanggan::count(),
            'total_layanan_aktif' => JenisLayanan::where('is_active', true)->count(),
            'total_voucher_tersedia' => Voucher::where('status_penggunaan', VoucherStatus::TERSEDIA)
                ->whereDate('masa_berlaku', '>=', now('Asia/Jakarta')->toDateString())
                ->count(),
            'transaksi_aktif' => Transaksi::where('status_transaksi', StatusTransaksi::AKTIF)->count(),
            'transaksi_belum_lunas' => Transaksi::whereIn('status_pembayaran', [
                StatusPembayaran::BELUM_BAYAR,
                StatusPembayaran::DP,
                StatusPembayaran::BELUM_LUNAS,
            ])->where('status_transaksi', '!=', StatusTransaksi::DIBATALKAN)->count(),
            'insiden_menunggu_konfirmasi' => LaporanKerusakanKehilangan::whereNull('id_petugas')->count(),
            'transaksi_selesai_siap_ambil' => Transaksi::where('status_transaksi', StatusTransaksi::SELESAI)->count(),
            'pengantaran_aktif' => Pengantaran::whereIn('status_pengantaran', [
                StatusPengantaran::DIJADWALKAN,
                StatusPengantaran::BERJALAN,
            ])->count(),
            'piutang_belum_lunas' => $piutangMetrics['count'],
            'piutang_nominal_total' => $piutangMetrics['total_nominal'],
        ];
    }

    /**
     * @return array<string, int|string>
     */
    private function buildPengantarSummary(?int $actorId): array
    {
        if ($actorId === null) {
            return [
                'role' => UserRole::PENGANTAR->value,
                'jadwal_pengantaran_aktif' => 0,
                'item_pengantaran_aktif' => 0,
                'item_terkirim_hari_ini' => 0,
                'item_gagal_perlu_tindak_lanjut' => 0,
            ];
        }

        $todayStartWib = now('Asia/Jakarta')->startOfDay();
        $tomorrowStartWib = $todayStartWib->copy()->addDay();

        return [
            'role' => UserRole::PENGANTAR->value,
            'jadwal_pengantaran_aktif' => Pengantaran::where('id_petugas_antar', $actorId)
                ->whereIn('status_pengantaran', [
                    StatusPengantaran::DIJADWALKAN,
                    StatusPengantaran::BERJALAN,
                ])->count(),
            'item_pengantaran_aktif' => ItemPengantaran::whereHas('pengantaran', fn ($query) => $query->where('id_petugas_antar', $actorId))
                ->whereIn('status_terima_pelanggan', [
                    StatusItemPengantaran::MENUNGGU,
                    StatusItemPengantaran::DIAMBIL,
                    StatusItemPengantaran::DALAM_PERJALANAN,
                ])->count(),
            'item_terkirim_hari_ini' => ItemPengantaran::whereHas('pengantaran', fn ($query) => $query->where('id_petugas_antar', $actorId))
                ->where('status_terima_pelanggan', StatusItemPengantaran::DITERIMA)
                ->where('waktu_update', '>=', $todayStartWib)
                ->where('waktu_update', '<', $tomorrowStartWib)
                ->count(),
            'item_gagal_perlu_tindak_lanjut' => ItemPengantaran::whereHas('pengantaran', fn ($query) => $query->where('id_petugas_antar', $actorId))
                ->where('status_terima_pelanggan', StatusItemPengantaran::GAGAL)
                ->whereHas('transaksi', fn ($query) => $query->where('status_transaksi', StatusTransaksi::SELESAI))
                ->whereNotExists(function ($subQuery): void {
                    $subQuery->selectRaw('1')
                        ->from('item_pengantaran as ip2')
                        ->whereColumn('ip2.nomor_nota', 'item_pengantaran.nomor_nota')
                        ->whereColumn('ip2.id_item_antar', '>', 'item_pengantaran.id_item_antar');
                })
                ->count(),
        ];
    }
}
