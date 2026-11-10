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
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $role = $user->role;
        $actorId = $user->actorId();

        $summary = match ($role) {
            UserRole::PETUGAS => [
                'role' => UserRole::PETUGAS->value,
                'total_pelanggan' => Pelanggan::count(),
                'total_layanan_aktif' => JenisLayanan::where('is_active', true)->count(),
                'total_voucher_tersedia' => Voucher::where('status_penggunaan', VoucherStatus::TERSEDIA)
                    ->whereDate('masa_berlaku', '>=', now()->toDateString())
                    ->count(),
                'transaksi_aktif' => Transaksi::where('status_transaksi', StatusTransaksi::AKTIF)->count(),
                'transaksi_belum_lunas' => Transaksi::whereIn('status_pembayaran', [
                    StatusPembayaran::BELUM_BAYAR,
                    StatusPembayaran::DP,
                    StatusPembayaran::BELUM_LUNAS,
                ])->where('status_transaksi', '!=', StatusTransaksi::DIBATALKAN)->count(),
            ],
            UserRole::PEGAWAI => [
                'role' => UserRole::PEGAWAI->value,
                'antrean_aktif' => Transaksi::where('status_transaksi', StatusTransaksi::AKTIF)->count(),
                'laporan_insiden_saya' => $actorId !== null
                    ? LaporanKerusakanKehilangan::where('id_pegawai_pelapor', $actorId)->count()
                    : 0,
            ],
            UserRole::PENGANTAR => [
                'role' => UserRole::PENGANTAR->value,
                'jadwal_pengantaran_aktif' => $actorId !== null
                    ? Pengantaran::where('id_petugas_antar', $actorId)
                        ->whereIn('status_pengantaran', [
                            StatusPengantaran::DIJADWALKAN,
                            StatusPengantaran::BERJALAN,
                        ])->count()
                    : 0,
                'item_pengantaran_aktif' => $actorId !== null
                    ? ItemPengantaran::whereHas('pengantaran', fn ($query) => $query->where('id_petugas_antar', $actorId))
                        ->whereIn('status_terima_pelanggan', [
                            StatusItemPengantaran::MENUNGGU,
                            StatusItemPengantaran::DIAMBIL,
                            StatusItemPengantaran::DALAM_PERJALANAN,
                        ])->count()
                    : 0,
            ],
        };

        return Inertia::render('Dashboard/Index', [
            'summary' => $summary,
        ]);
    }
}
