<?php

namespace App\Services;

use App\Enums\MetodeHitung;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Pegawai;
use App\Models\RiwayatStatusProduksi;
use App\Models\Transaksi;
use App\Models\User;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use BackedEnum;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ProduksiService
{
    public function __construct(
        private readonly TransaksiService $transaksiService,
        private readonly PembayaranService $pembayaranService
    ) {}

    /**
     * Paginate the production queue formatted as TransaksiDetail without N+1 queries.
     */
    public function paginateQueue(
        string $search = '',
        string $tahapStatus = '',
        string $statusTransaksi = 'AKTIF',
        int $perPage = 10
    ): LengthAwarePaginator {
        $trimmedSearch = trim($search);
        $normalizedTahap = strtoupper(trim($tahapStatus));
        $validTahap = in_array($normalizedTahap, TahapProduksi::values(), true) ? $normalizedTahap : '';

        $allowedStatuses = $this->resolveQueueStatuses($statusTransaksi);

        $paginator = Transaksi::query()
            ->with($this->transaksiService->detailRelations())
            ->whereIn('status_transaksi', $allowedStatuses)
            ->when($trimmedSearch !== '', function ($query) use ($trimmedSearch): void {
                $pattern = SqlLike::contains($trimmedSearch);

                $query->where(function ($subQuery) use ($pattern): void {
                    $subQuery->where('nomor_nota', 'like', $pattern)
                        ->orWhereHas('pelanggan', function ($pelangganQuery) use ($pattern): void {
                            $pelangganQuery->where('nama', 'like', $pattern)
                                ->orWhere('no_telepon', 'like', $pattern);
                        });
                });
            })
            ->when($validTahap !== '', function ($query) use ($validTahap): void {
                $query->whereRaw(
                    '(SELECT r.tahap_status FROM riwayat_status_produksi r WHERE r.nomor_nota = transaksi.nomor_nota ORDER BY r.waktu_update DESC, r.id_status_produksi DESC LIMIT 1) = ?',
                    [$validTahap]
                );
            })
            ->orderByDesc('tanggal_penerimaan')
            ->orderByDesc('nomor_nota')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->through(fn (Transaksi $transaksi): array => $this->transaksiService->formatTransaksiDetail($transaksi));

        return $paginator;
    }

    /**
     * Count production transactions grouped by their latest production stage in one SQL query.
     *
     * @return array<string, int>
     */
    public function getStageCounts(?string $statusTransaksi = null): array
    {
        $allowedStatuses = $statusTransaksi === null
            ? [StatusTransaksi::AKTIF->value, StatusTransaksi::SELESAI->value]
            : $this->resolveQueueStatuses($statusTransaksi);

        $snapshotQuery = DB::table('transaksi')
            ->selectRaw('(SELECT r.tahap_status FROM riwayat_status_produksi r WHERE r.nomor_nota = transaksi.nomor_nota ORDER BY r.waktu_update DESC, r.id_status_produksi DESC LIMIT 1) as latest_stage')
            ->whereIn('status_transaksi', $allowedStatuses);

        $rows = DB::query()
            ->fromSub($snapshotQuery, 'stage_snapshot')
            ->selectRaw('latest_stage, COUNT(*) as aggregate_count')
            ->whereNotNull('latest_stage')
            ->groupBy('latest_stage')
            ->pluck('aggregate_count', 'latest_stage');

        $counts = [];
        foreach (TahapProduksi::cases() as $stage) {
            $counts[$stage->value] = (int) ($rows[$stage->value] ?? 0);
        }

        return $counts;
    }

    /**
     * Re-weigh a BERAT transaction at stage DITERIMA, preserving KK-09 tariff snapshot and reconciling payment status (KK-01).
     *
     * @param  array{berat_aktual: string|int|float, catatan?: string|null}  $data
     *
     * @throws ValidationException
     */
    public function timbangUlang(
        string $nomorNota,
        Pegawai $pegawai,
        array $data,
        ?User $actor = null
    ): Transaksi {
        return DB::transaction(function () use ($nomorNota, $pegawai, $data, $actor): Transaksi {
            $now = now('Asia/Jakarta');
            $transaksi = $this->lockTransaksiWithProduksiRelations($nomorNota);

            if ($transaksi->status_transaksi !== StatusTransaksi::AKTIF) {
                throw ValidationException::withMessages([
                    'berat_aktual' => 'Penimbangan ulang hanya dapat dilakukan pada transaksi berstatus AKTIF.',
                ]);
            }

            if ($transaksi->layanan->metode_hitung !== MetodeHitung::BERAT) {
                throw ValidationException::withMessages([
                    'berat_aktual' => 'Penimbangan ulang hanya berlaku untuk layanan dengan metode hitung BERAT (kg).',
                ]);
            }

            $latestRiwayat = $this->transaksiService->resolveLatestRiwayatStatus($transaksi);
            if ($latestRiwayat?->tahap_status !== TahapProduksi::DITERIMA) {
                throw ValidationException::withMessages([
                    'berat_aktual' => 'Penimbangan ulang hanya diizinkan saat tahap produksi masih DITERIMA sebelum pencucian dimulai.',
                ]);
            }

            $beratAktual = $this->validateBeratAktual($data['berat_aktual'] ?? '');
            $beratSebelum = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $transaksi->berat_atau_jumlah)
            );
            $hargaSnapshot = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $transaksi->harga_satuan_snapshot)
            );

            $subtotalSebelum = DecimalMoney::multiplyQuantity($beratSebelum, $hargaSnapshot);
            $subtotalBaru = DecimalMoney::multiplyQuantity($beratAktual, $hargaSnapshot);

            $tagihanDasarBaru = DecimalMoney::maxZero(
                DecimalMoney::subtract($subtotalBaru, (string) $transaksi->nilai_voucher_snapshot)
            );
            $totalHargaBaru = DecimalMoney::maxZero(
                DecimalMoney::subtract($tagihanDasarBaru, (string) $transaksi->total_kompensasi)
            );

            $totalDibayar = $this->pembayaranService->hitungTotalDibayar($transaksi);
            $statusPembayaranBaru = $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                $transaksi->status_pembayaran,
                $totalHargaBaru,
                $totalDibayar
            );

            $before = [
                'berat_atau_jumlah' => $beratSebelum,
                'harga_satuan_snapshot' => $hargaSnapshot,
                'subtotal_layanan' => $subtotalSebelum,
                'total_harga' => (string) $transaksi->total_harga,
                'status_pembayaran' => $this->enumValue($transaksi->status_pembayaran),
            ];

            $transaksi->update([
                'berat_atau_jumlah' => $beratAktual,
                'total_harga' => $totalHargaBaru,
                'status_pembayaran' => $statusPembayaranBaru,
            ]);

            $catatan = isset($data['catatan']) && trim((string) $data['catatan']) !== ''
                ? trim((string) $data['catatan'])
                : null;
            $weightChanged = ! DecimalMoney::eq($beratSebelum, $beratAktual);

            $this->recordAuditLog(
                $transaksi,
                $pegawai,
                $actor,
                'TIMBANG_ULANG',
                $before,
                [
                    'berat_atau_jumlah' => $beratAktual,
                    'harga_satuan_snapshot' => $hargaSnapshot,
                    'subtotal_layanan' => $subtotalBaru,
                    'total_harga' => $totalHargaBaru,
                    'total_dibayar' => $totalDibayar,
                    'status_pembayaran' => $statusPembayaranBaru->value,
                    'weight_changed' => $weightChanged,
                    'catatan' => $catatan,
                    'id_pegawai' => $pegawai->id_pegawai,
                ],
                $now
            );

            return $transaksi->refresh()->load($this->transaksiService->detailRelations());
        });
    }

    /**
     * Advance RiwayatStatusProduksi sequentially according to the service's TahapLayanan pipeline.
     *
     * @param  array{tahap_status: string, catatan?: string|null}  $data
     *
     * @throws ValidationException
     */
    public function ubahStatusProduksi(
        string $nomorNota,
        Pegawai $pegawai,
        array $data,
        ?User $actor = null
    ): Transaksi {
        return DB::transaction(function () use ($nomorNota, $pegawai, $data, $actor): Transaksi {
            $now = now('Asia/Jakarta');
            $transaksi = $this->lockTransaksiWithProduksiRelations($nomorNota);

            if ($transaksi->status_transaksi !== StatusTransaksi::AKTIF) {
                throw ValidationException::withMessages([
                    'tahap_status' => 'Status produksi hanya dapat diperbarui pada transaksi berstatus AKTIF.',
                ]);
            }

            $rawTarget = strtoupper(trim((string) ($data['tahap_status'] ?? '')));
            $targetTahap = TahapProduksi::tryFrom($rawTarget);

            if ($targetTahap === null) {
                throw ValidationException::withMessages([
                    'tahap_status' => 'Tahap produksi tidak valid.',
                ]);
            }

            if (! $transaksi->layanan->perlu_setrika && $targetTahap === TahapProduksi::DISETRIKA) {
                throw ValidationException::withMessages([
                    'tahap_status' => 'Layanan ini tidak memerlukan tahap DISETRIKA.',
                ]);
            }

            $orderedStages = $this->transaksiService->resolveOrderedTahapStages($transaksi->layanan);
            $targetIndex = array_search($targetTahap, $orderedStages, true);

            if ($targetIndex === false) {
                throw ValidationException::withMessages([
                    'tahap_status' => "Tahap {$targetTahap->value} tidak terdaftar pada layanan transaksi ini.",
                ]);
            }

            $latestRiwayat = $this->transaksiService->resolveLatestRiwayatStatus($transaksi);
            $currentIndex = $latestRiwayat !== null
                ? array_search($latestRiwayat->tahap_status, $orderedStages, true)
                : -1;

            if ($currentIndex === false) {
                throw ValidationException::withMessages([
                    'tahap_status' => 'Tahap produksi terakhir transaksi tidak selaras dengan konfigurasi layanan.',
                ]);
            }

            if ($targetIndex <= $currentIndex) {
                throw ValidationException::withMessages([
                    'tahap_status' => 'Tahap produksi tidak dapat diulang atau dimundurkan.',
                ]);
            }

            if ($targetIndex !== $currentIndex + 1) {
                $expectedNext = $orderedStages[$currentIndex + 1]->value;

                throw ValidationException::withMessages([
                    'tahap_status' => "Transisi tahap produksi wajib berurutan; tahap berikutnya yang sah adalah [{$expectedNext}].",
                ]);
            }

            $catatan = isset($data['catatan']) && trim((string) $data['catatan']) !== ''
                ? trim((string) $data['catatan'])
                : null;

            RiwayatStatusProduksi::create([
                'nomor_nota' => $transaksi->nomor_nota,
                'id_pegawai' => $pegawai->id_pegawai,
                'tahap_status' => $targetTahap,
                'waktu_update' => $now,
                'catatan' => $catatan,
            ]);

            $statusTransaksiSebelum = $this->enumValue($transaksi->status_transaksi);
            $statusTransaksiSesudah = $statusTransaksiSebelum;

            if ($targetTahap === TahapProduksi::SELESAI) {
                $transaksi->update([
                    'status_transaksi' => StatusTransaksi::SELESAI,
                ]);
                $statusTransaksiSesudah = StatusTransaksi::SELESAI->value;
            }

            $this->recordAuditLog(
                $transaksi,
                $pegawai,
                $actor,
                'PRODUKSI_STATUS_UPDATED',
                [
                    'tahap_status' => $latestRiwayat?->tahap_status?->value,
                    'status_transaksi' => $statusTransaksiSebelum,
                ],
                [
                    'tahap_status' => $targetTahap->value,
                    'status_transaksi' => $statusTransaksiSesudah,
                    'id_pegawai' => $pegawai->id_pegawai,
                    'waktu_update' => $now->toIso8601String(),
                    'catatan' => $catatan,
                ],
                $now
            );

            return $transaksi->refresh()->load($this->transaksiService->detailRelations());
        });
    }

    /**
     * @return list<string>
     */
    private function resolveQueueStatuses(string $statusTransaksi): array
    {
        return match (strtoupper(trim($statusTransaksi))) {
            'SELESAI' => [StatusTransaksi::SELESAI->value],
            'ALL' => [StatusTransaksi::AKTIF->value, StatusTransaksi::SELESAI->value],
            default => [StatusTransaksi::AKTIF->value],
        };
    }

    private function lockTransaksiWithProduksiRelations(string $nomorNota): Transaksi
    {
        $transaksi = Transaksi::query()
            ->where('nomor_nota', $nomorNota)
            ->lockForUpdate()
            ->firstOrFail();

        $transaksi->load([
            'layanan.tahapLayanan' => fn ($query) => $query->orderBy('urutan'),
            'riwayatStatusProduksi',
            'pembayaran',
        ]);

        return $transaksi;
    }

    /**
     * @throws ValidationException
     */
    private function validateBeratAktual(mixed $rawWeight): string
    {
        try {
            $normalized = DecimalMoney::toDecimalString(DecimalMoney::toCents((string) $rawWeight));
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages([
                'berat_aktual' => 'Format berat aktual tidak valid.',
            ]);
        }

        if (DecimalMoney::lte($normalized, '0.00')) {
            throw ValidationException::withMessages([
                'berat_aktual' => 'Berat aktual harus lebih besar dari 0.',
            ]);
        }

        if (DecimalMoney::gt($normalized, '99999.99')) {
            throw ValidationException::withMessages([
                'berat_aktual' => 'Berat aktual maksimal 99999.99 kg.',
            ]);
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    private function recordAuditLog(
        Transaksi $transaksi,
        Pegawai $pegawai,
        ?User $actor,
        string $action,
        array $before,
        array $after,
        CarbonInterface $now
    ): void {
        AuditLog::create([
            'user_id' => $actor?->id ?? $pegawai->user_id,
            'actor_role' => $actor !== null
                ? $this->enumValue($actor->role)
                : UserRole::PEGAWAI->value,
            'action' => $action,
            'subject_type' => Transaksi::class,
            'subject_id' => $transaksi->nomor_nota,
            'payload_before' => $before,
            'payload_after' => $after,
            'created_at' => $now,
        ]);
    }

    private function enumValue(mixed $value): string
    {
        return $value instanceof BackedEnum ? (string) $value->value : (string) $value;
    }
}
