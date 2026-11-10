<?php

namespace App\Services;

use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\ItemPengantaran;
use App\Models\Pengantaran;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Models\User;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use BackedEnum;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SerahTerimaService
{
    public function __construct(
        private readonly PembayaranService $pembayaranService,
        private readonly TransaksiService $transaksiService
    ) {}

    /**
     * Evaluate customer handover eligibility under KK-06 (single source of truth for loket & courier).
     *
     * @return array{
     *     allowed: bool,
     *     wajib_pelunasan: bool,
     *     boleh_bayar_akhir: bool,
     *     sisa_tagihan: string,
     *     alasan: ?string
     * }
     */
    public function cekHakBayarAkhir(Transaksi $transaksi): array
    {
        $transaksi->loadMissing(['pelanggan', 'pembayaran']);

        $totalDibayar = $this->pembayaranService->hitungTotalDibayar($transaksi);
        $sisaTagihan = DecimalMoney::maxZero(
            DecimalMoney::subtract((string) $transaksi->total_harga, $totalDibayar)
        );

        $hasOutstanding = DecimalMoney::gt($sisaTagihan, '0.00');
        $bolehBayarAkhir = (bool) $transaksi->pelanggan->boleh_bayar_akhir;
        $wajibPelunasan = $hasOutstanding && ! $bolehBayarAkhir;
        $allowed = ! $hasOutstanding || $bolehBayarAkhir;

        $alasan = null;
        if ($wajibPelunasan) {
            $formattedSisa = DecimalMoney::formatRupiah($sisaTagihan);
            $alasan = "Pelanggan belum melunasi sisa tagihan sebesar {$formattedSisa} dan tidak memiliki hak bayar akhir (KK-06).";
        }

        return [
            'allowed' => $allowed,
            'wajib_pelunasan' => $wajibPelunasan,
            'boleh_bayar_akhir' => $bolehBayarAkhir,
            'sisa_tagihan' => $sisaTagihan,
            'alasan' => $alasan,
        ];
    }

    /**
     * Inspect readiness for loket pickup including transaction status, courier conflict, and KK-06 eligibility.
     *
     * @return array{
     *     transaksi: Transaksi,
     *     status_selesai: bool,
     *     sedang_diantar_kurir: bool,
     *     ada_pengantaran_menunggu: bool,
     *     konflik_pengantaran: array{sedang_diantar_kurir: bool, ada_item_menunggu: bool, status_item_aktif: ?string},
     *     hak_bayar_akhir: array{allowed: bool, wajib_pelunasan: bool, boleh_bayar_akhir: bool, sisa_tagihan: string, alasan: ?string},
     *     siap_serah_terima: bool,
     *     alasan_blokir: ?string
     * }
     */
    public function ambilPakaian(string $nomorNota): array
    {
        $transaksi = Transaksi::query()
            ->with(['pelanggan', 'pembayaran', 'itemPengantaran.pengantaran'])
            ->findOrFail($nomorNota);

        $statusSelesai = $transaksi->status_transaksi === StatusTransaksi::SELESAI;

        $activeCourierItem = $transaksi->itemPengantaran->first(
            fn (ItemPengantaran $item): bool => in_array(
                $item->status_terima_pelanggan,
                [StatusItemPengantaran::DIAMBIL, StatusItemPengantaran::DALAM_PERJALANAN],
                true
            )
        );
        $sedangDiantarKurir = $activeCourierItem !== null;
        $adaPengantaranMenunggu = $transaksi->itemPengantaran->contains(
            fn (ItemPengantaran $item): bool => $item->status_terima_pelanggan === StatusItemPengantaran::MENUNGGU
        );

        $hakBayar = $this->cekHakBayarAkhir($transaksi);
        $siapSerahTerima = $statusSelesai && ! $sedangDiantarKurir && $hakBayar['allowed'];

        $alasanBlokir = null;
        if (! $statusSelesai) {
            $statusLabel = $this->enumValue($transaksi->status_transaksi);
            $alasanBlokir = "Serah terima hanya dapat dilakukan untuk transaksi berstatus SELESAI (status saat ini: {$statusLabel}).";
        } elseif ($sedangDiantarKurir) {
            $itemStatus = $this->enumValue($activeCourierItem->status_terima_pelanggan);
            $alasanBlokir = "Pakaian untuk nota {$nomorNota} sedang dibawa kurir pengantaran ({$itemStatus}).";
        } elseif (! $hakBayar['allowed']) {
            $alasanBlokir = $hakBayar['alasan'];
        }

        return [
            'transaksi' => $transaksi,
            'status_selesai' => $statusSelesai,
            'sedang_diantar_kurir' => $sedangDiantarKurir,
            'ada_pengantaran_menunggu' => $adaPengantaranMenunggu,
            'konflik_pengantaran' => [
                'sedang_diantar_kurir' => $sedangDiantarKurir,
                'ada_item_menunggu' => $adaPengantaranMenunggu,
                'status_item_aktif' => $activeCourierItem !== null
                    ? $this->enumValue($activeCourierItem->status_terima_pelanggan)
                    : null,
            ],
            'hak_bayar_akhir' => $hakBayar,
            'siap_serah_terima' => $siapSerahTerima,
            'alasan_blokir' => $alasanBlokir,
        ];
    }

    /**
     * Hand over finished laundry at the cashier counter under KK-06 and resolve any pending courier item cleanly.
     *
     * @throws ValidationException
     */
    public function serahkanPakaian(
        string $nomorNota,
        Petugas $petugas,
        ?string $catatan = null,
        ?User $actor = null
    ): Transaksi {
        $normalizedCatatan = $catatan !== null && trim($catatan) !== '' ? trim($catatan) : null;

        return DB::transaction(function () use ($nomorNota, $petugas, $normalizedCatatan, $actor): Transaksi {
            $now = now('Asia/Jakarta');

            // Lock delivery items and parent sessions before Transaksi to match PengantaranService lock ordering.
            $lockedItems = ItemPengantaran::query()
                ->where('nomor_nota', $nomorNota)
                ->orderBy('id_item_antar')
                ->lockForUpdate()
                ->get();

            $pengantaranIds = $lockedItems->pluck('id_pengantaran')->unique()->sort()->values()->all();
            $lockedPengantaranMap = $pengantaranIds !== []
                ? Pengantaran::query()
                    ->whereIn('id_pengantaran', $pengantaranIds)
                    ->orderBy('id_pengantaran')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id_pengantaran')
                : collect();

            $lockedTransaksi = Transaksi::query()
                ->where('nomor_nota', $nomorNota)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedTransaksi->load(['pelanggan', 'pembayaran', 'itemPengantaran.pengantaran']);

            if ($lockedTransaksi->status_transaksi !== StatusTransaksi::SELESAI) {
                $statusLabel = $this->enumValue($lockedTransaksi->status_transaksi);

                throw ValidationException::withMessages([
                    'status_transaksi' => "Serah terima hanya dapat dilakukan untuk transaksi berstatus SELESAI (status saat ini: {$statusLabel}).",
                ]);
            }

            $inTransitItem = $lockedItems->first(fn (ItemPengantaran $item): bool => in_array(
                $item->status_terima_pelanggan,
                [StatusItemPengantaran::DIAMBIL, StatusItemPengantaran::DALAM_PERJALANAN],
                true
            ));

            if ($inTransitItem !== null) {
                $itemStatus = $this->enumValue($inTransitItem->status_terima_pelanggan);

                throw ValidationException::withMessages([
                    'serah_terima' => "Pakaian untuk nota {$nomorNota} sedang dibawa kurir pengantaran ({$itemStatus}). Selesaikan atau tandai gagal pengantaran terlebih dahulu sebelum serah terima di loket.",
                ]);
            }

            $hakBayar = $this->cekHakBayarAkhir($lockedTransaksi);

            if (! $hakBayar['allowed']) {
                $formattedSisa = DecimalMoney::formatRupiah($hakBayar['sisa_tagihan']);

                throw ValidationException::withMessages([
                    'status_pembayaran' => "Serah terima ditolak (KK-06): sisa tagihan {$formattedSisa} wajib dilunasi terlebih dahulu karena pelanggan tidak memiliki hak bayar akhir.",
                ]);
            }

            $waitingItems = $lockedItems->filter(
                fn (ItemPengantaran $item): bool => $item->status_terima_pelanggan === StatusItemPengantaran::MENUNGGU
            );

            foreach ($waitingItems as $waitingItem) {
                $parentPengantaran = $lockedPengantaranMap->get($waitingItem->id_pengantaran);
                $statusPengantaranSebelum = $parentPengantaran !== null
                    ? $this->enumValue($parentPengantaran->status_pengantaran)
                    : null;

                $waitingItem->update([
                    'status_terima_pelanggan' => StatusItemPengantaran::GAGAL,
                    'alasan_gagal' => 'Diambil langsung oleh pelanggan di loket kasir.',
                    'waktu_update' => $now,
                ]);

                $statusPengantaranSesudah = $parentPengantaran !== null
                    ? PengantaranService::syncSessionStatus($parentPengantaran)
                    : null;

                AuditLog::create([
                    'user_id' => $actor?->id ?? $petugas->user_id,
                    'actor_role' => $actor !== null ? $this->enumValue($actor->role) : UserRole::PETUGAS->value,
                    'action' => 'ITEM_PENGANTARAN_UPDATED',
                    'subject_type' => Transaksi::class,
                    'subject_id' => $lockedTransaksi->nomor_nota,
                    'payload_before' => [
                        'id_pengantaran' => $waitingItem->id_pengantaran,
                        'id_item_antar' => $waitingItem->id_item_antar,
                        'status_terima_pelanggan' => StatusItemPengantaran::MENUNGGU->value,
                        'status_pengantaran' => $statusPengantaranSebelum,
                    ],
                    'payload_after' => [
                        'id_pengantaran' => $waitingItem->id_pengantaran,
                        'id_item_antar' => $waitingItem->id_item_antar,
                        'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                        'status_pengantaran' => $statusPengantaranSesudah?->value,
                        'alasan_gagal' => 'Diambil langsung oleh pelanggan di loket kasir.',
                        'waktu_update' => $now->toIso8601String(),
                        'ditutup_dari' => 'LOKET',
                    ],
                    'created_at' => $now,
                ]);
            }

            $sisaTagihan = $hakBayar['sisa_tagihan'];
            $piutangDicatat = DecimalMoney::gt($sisaTagihan, '0.00');
            $statusPembayaranSesudah = $piutangDicatat
                ? StatusPembayaran::BELUM_LUNAS
                : StatusPembayaran::LUNAS;

            $statusTransaksiSebelum = $this->enumValue($lockedTransaksi->status_transaksi);
            $statusPembayaranSebelum = $this->enumValue($lockedTransaksi->status_pembayaran);

            $lockedTransaksi->update([
                'status_transaksi' => StatusTransaksi::DIAMBIL,
                'diambil_pada' => $now,
                'status_pembayaran' => $statusPembayaranSesudah,
            ]);

            AuditLog::create([
                'user_id' => $actor?->id ?? $petugas->user_id,
                'actor_role' => $actor !== null ? $this->enumValue($actor->role) : UserRole::PETUGAS->value,
                'action' => 'SERAH_TERIMA',
                'subject_type' => Transaksi::class,
                'subject_id' => $lockedTransaksi->nomor_nota,
                'payload_before' => [
                    'status_transaksi' => $statusTransaksiSebelum,
                    'status_pembayaran' => $statusPembayaranSebelum,
                    'diambil_pada' => null,
                ],
                'payload_after' => [
                    'kanal' => 'LOKET',
                    'status_transaksi' => StatusTransaksi::DIAMBIL->value,
                    'status_pembayaran' => $statusPembayaranSesudah->value,
                    'sisa_tagihan' => $sisaTagihan,
                    'boleh_bayar_akhir' => (bool) $hakBayar['boleh_bayar_akhir'],
                    'piutang_dicatat' => $piutangDicatat,
                    'diambil_pada' => $now->toIso8601String(),
                    'catatan' => $normalizedCatatan,
                    'id_petugas' => $petugas->id_petugas,
                ],
                'created_at' => $now,
            ]);

            return $lockedTransaksi->refresh()->load($this->transaksiService->detailRelations());
        });
    }

    /**
     * Paginate loket handover queues without N+1 queries.
     *
     * @param  array{search?: string, mode?: string}  $filters
     */
    public function paginateQueue(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $rawMode = strtoupper(trim((string) ($filters['mode'] ?? 'SIAP_AMBIL')));
        $mode = in_array($rawMode, ['SIAP_AMBIL', 'PIUTANG', 'RIWAYAT_DIAMBIL'], true)
            ? $rawMode
            : 'SIAP_AMBIL';

        $query = Transaksi::query()
            ->with($this->transaksiService->detailRelations());

        match ($mode) {
            'PIUTANG' => $query
                ->where('status_transaksi', StatusTransaksi::DIAMBIL)
                ->where('status_pembayaran', '!=', StatusPembayaran::LUNAS)
                ->orderByDesc('diambil_pada')
                ->orderByDesc('nomor_nota'),
            'RIWAYAT_DIAMBIL' => $query
                ->where('status_transaksi', StatusTransaksi::DIAMBIL)
                ->orderByDesc('diambil_pada')
                ->orderByDesc('nomor_nota'),
            default => $query
                ->where('status_transaksi', StatusTransaksi::SELESAI)
                ->orderByDesc('tanggal_penerimaan')
                ->orderByDesc('nomor_nota'),
        };

        $query->when($search !== '', function ($builder) use ($search): void {
            $pattern = SqlLike::contains($search);

            $builder->where(function ($subQuery) use ($pattern): void {
                $subQuery->where('nomor_nota', 'like', $pattern)
                    ->orWhereHas('pelanggan', function ($pelangganQuery) use ($pattern): void {
                        $pelangganQuery->where('nama', 'like', $pattern)
                            ->orWhere('no_telepon', 'like', $pattern);
                    });
            });
        });

        $paginator = $query->paginate($perPage)->withQueryString();
        $paginator->through(fn (Transaksi $transaksi): array => $this->transaksiService->formatTransaksiDetail($transaksi));

        return $paginator;
    }

    /**
     * Summarize loket handover queue counts and outstanding receivables without N+1 queries.
     *
     * @return array{
     *     siap_ambil_count: int,
     *     sedang_diantar_count: int,
     *     piutang_count: int,
     *     total_piutang_nominal: string
     * }
     */
    public function getSummary(): array
    {
        $siapAmbilCount = Transaksi::query()
            ->where('status_transaksi', StatusTransaksi::SELESAI)
            ->count();

        $sedangDiantarCount = Transaksi::query()
            ->where('status_transaksi', StatusTransaksi::SELESAI)
            ->whereHas('itemPengantaran', function ($query): void {
                $query->whereIn('status_terima_pelanggan', [
                    StatusItemPengantaran::DIAMBIL,
                    StatusItemPengantaran::DALAM_PERJALANAN,
                ]);
            })
            ->count();

        $piutangMetrics = $this->pembayaranService->summarizePiutangMetrics();

        return [
            'siap_ambil_count' => $siapAmbilCount,
            'sedang_diantar_count' => $sedangDiantarCount,
            'piutang_count' => $piutangMetrics['count'],
            'total_piutang_nominal' => $piutangMetrics['total_nominal'],
        ];
    }

    private function enumValue(mixed $value): string
    {
        return $value instanceof BackedEnum ? (string) $value->value : (string) $value;
    }
}
