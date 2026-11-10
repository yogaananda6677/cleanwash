<?php

namespace App\Services;

use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\StatusPengantaran;
use App\Enums\StatusTransaksi;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\ItemPengantaran;
use App\Models\Pengantaran;
use App\Models\Petugas;
use App\Models\PetugasPengantaran;
use App\Models\Transaksi;
use App\Models\User;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use BackedEnum;
use Carbon\CarbonInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class PengantaranService
{
    /**
     * @var array<string, list<string>>
     */
    private const ALLOWED_ITEM_TRANSITIONS = [
        StatusItemPengantaran::MENUNGGU->value => [
            StatusItemPengantaran::DIAMBIL->value,
        ],
        StatusItemPengantaran::DIAMBIL->value => [
            StatusItemPengantaran::DALAM_PERJALANAN->value,
        ],
        StatusItemPengantaran::DALAM_PERJALANAN->value => [
            StatusItemPengantaran::DITERIMA->value,
            StatusItemPengantaran::GAGAL->value,
        ],
        StatusItemPengantaran::DITERIMA->value => [],
        StatusItemPengantaran::GAGAL->value => [],
    ];

    /**
     * @var list<string>
     */
    private const BLOCKING_ITEM_STATUSES = [
        StatusItemPengantaran::MENUNGGU->value,
        StatusItemPengantaran::DIAMBIL->value,
        StatusItemPengantaran::DALAM_PERJALANAN->value,
        StatusItemPengantaran::DITERIMA->value,
    ];

    public function __construct(
        private readonly PembayaranService $pembayaranService,
        private readonly SerahTerimaService $serahTerimaService
    ) {}

    /**
     * Create a multi-customer delivery session (DIJADWALKAN) with atomic Transaksi row locks.
     *
     * @param  array{
     *     id_petugas_antar: int|string,
     *     tanggal_pengantaran: string,
     *     nomor_nota_list: list<string>
     * }  $data
     *
     * @throws ValidationException
     */
    public function buatJadwal(Petugas $petugas, array $data, ?User $actor = null): Pengantaran
    {
        $tanggalPengantaran = $this->validateTanggalPengantaran($data['tanggal_pengantaran'] ?? null);
        $notaList = $this->normalizeNotaList($data['nomor_nota_list'] ?? null);
        $idPetugasAntar = $this->parsePositiveId($data['id_petugas_antar'] ?? null, 'id_petugas_antar', 'Kurir pengantaran wajib dipilih.');

        return DB::transaction(function () use ($petugas, $actor, $tanggalPengantaran, $notaList, $idPetugasAntar): Pengantaran {
            $now = now('Asia/Jakarta');

            $kurir = $this->resolveActiveKurir($idPetugasAntar, 'id_petugas_antar', 'Kurir pengantaran yang dipilih sedang tidak aktif.');

            $sortedNotas = $notaList;
            sort($sortedNotas);

            $lockedTransaksi = Transaksi::query()
                ->whereIn('nomor_nota', $sortedNotas)
                ->orderBy('nomor_nota')
                ->lockForUpdate()
                ->get()
                ->keyBy('nomor_nota');

            foreach ($notaList as $nota) {
                $transaksi = $lockedTransaksi->get($nota);

                if ($transaksi === null) {
                    throw ValidationException::withMessages([
                        'nomor_nota_list' => "Transaksi {$nota} tidak ditemukan.",
                    ]);
                }

                if ($transaksi->status_transaksi !== StatusTransaksi::SELESAI) {
                    $statusLabel = $this->enumValue($transaksi->status_transaksi);

                    throw ValidationException::withMessages([
                        'nomor_nota_list' => "Transaksi {$nota} harus berstatus SELESAI untuk dijadwalkan pengantaran (status saat ini: {$statusLabel}).",
                    ]);
                }
            }

            $conflictingNota = ItemPengantaran::query()
                ->whereIn('nomor_nota', $sortedNotas)
                ->whereIn('status_terima_pelanggan', self::BLOCKING_ITEM_STATUSES)
                ->orderBy('nomor_nota')
                ->value('nomor_nota');

            if ($conflictingNota !== null) {
                throw ValidationException::withMessages([
                    'nomor_nota_list' => "Transaksi {$conflictingNota} sudah terdaftar pada pengantaran aktif atau sudah diterima pelanggan.",
                ]);
            }

            $pengantaran = Pengantaran::create([
                'id_petugas_antar' => $kurir->id_petugas_antar,
                'tanggal_pengantaran' => $tanggalPengantaran,
                'status_pengantaran' => StatusPengantaran::DIJADWALKAN,
            ]);

            foreach ($notaList as $nota) {
                ItemPengantaran::create([
                    'id_pengantaran' => $pengantaran->id_pengantaran,
                    'nomor_nota' => $nota,
                    'status_terima_pelanggan' => StatusItemPengantaran::MENUNGGU,
                    'alasan_gagal' => null,
                    'waktu_update' => $now,
                ]);
            }

            AuditLog::create([
                'user_id' => $actor?->id ?? $petugas->user_id,
                'actor_role' => $actor !== null ? $this->enumValue($actor->role) : UserRole::PETUGAS->value,
                'action' => 'PENGANTARAN_CREATED',
                'subject_type' => Pengantaran::class,
                'subject_id' => (string) $pengantaran->id_pengantaran,
                'payload_before' => null,
                'payload_after' => [
                    'id_pengantaran' => $pengantaran->id_pengantaran,
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'tanggal_pengantaran' => $tanggalPengantaran,
                    'status_pengantaran' => StatusPengantaran::DIJADWALKAN->value,
                    'nomor_nota_list' => $notaList,
                ],
                'created_at' => $now,
            ]);

            return $pengantaran->load($this->detailRelations());
        });
    }

    /**
     * Transition a DIJADWALKAN delivery session to BERJALAN by its assigned active courier.
     *
     * @throws AuthorizationException
     * @throws ValidationException
     */
    public function mulaiPengantaran(Pengantaran $pengantaran, PetugasPengantaran $kurir, ?User $actor = null): Pengantaran
    {
        $this->ensureKurirOwnershipAllowed($pengantaran, $kurir);

        return DB::transaction(function () use ($pengantaran, $kurir, $actor): Pengantaran {
            $now = now('Asia/Jakarta');

            $locked = Pengantaran::query()
                ->where('id_pengantaran', $pengantaran->id_pengantaran)
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureKurirOwnershipAllowed($locked, $kurir);

            if ($locked->status_pengantaran !== StatusPengantaran::DIJADWALKAN) {
                throw ValidationException::withMessages([
                    'status_pengantaran' => 'Sesi pengantaran hanya dapat dimulai saat berstatus DIJADWALKAN.',
                ]);
            }

            if ($locked->itemPengantaran()->count() < 1) {
                throw ValidationException::withMessages([
                    'status_pengantaran' => 'Sesi pengantaran tidak memiliki item transaksi untuk dimulai.',
                ]);
            }

            $locked->update([
                'status_pengantaran' => StatusPengantaran::BERJALAN,
            ]);

            AuditLog::create([
                'user_id' => $actor?->id ?? $kurir->user_id,
                'actor_role' => $actor !== null ? $this->enumValue($actor->role) : UserRole::PENGANTAR->value,
                'action' => 'PENGANTARAN_STARTED',
                'subject_type' => Pengantaran::class,
                'subject_id' => (string) $locked->id_pengantaran,
                'payload_before' => [
                    'status_pengantaran' => StatusPengantaran::DIJADWALKAN->value,
                ],
                'payload_after' => [
                    'status_pengantaran' => StatusPengantaran::BERJALAN->value,
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                ],
                'created_at' => $now,
            ]);

            return $locked->refresh()->load($this->detailRelations());
        });
    }

    /**
     * Advance a single ItemPengantaran sequentially with KK-06 handover verification and header sync.
     *
     * @param  array{status_terima_pelanggan: string, alasan_gagal?: string|null}  $data
     *
     * @throws AuthorizationException
     * @throws ValidationException
     */
    public function updateStatusItem(
        ItemPengantaran $item,
        PetugasPengantaran $kurir,
        array $data,
        ?User $actor = null
    ): ItemPengantaran {
        $rawTarget = strtoupper(trim((string) ($data['status_terima_pelanggan'] ?? '')));
        $targetStatus = StatusItemPengantaran::tryFrom($rawTarget);

        if ($targetStatus === null) {
            throw ValidationException::withMessages([
                'status_terima_pelanggan' => 'Status item pengantaran tidak valid.',
            ]);
        }

        $alasanGagal = null;
        if ($targetStatus === StatusItemPengantaran::GAGAL) {
            $trimmedReason = trim((string) ($data['alasan_gagal'] ?? ''));
            $reasonLength = mb_strlen($trimmedReason);

            if ($reasonLength < 5 || $reasonLength > 1000) {
                throw ValidationException::withMessages([
                    'alasan_gagal' => 'Alasan gagal pengantaran wajib diisi antara 5 hingga 1000 karakter.',
                ]);
            }

            $alasanGagal = $trimmedReason;
        }

        return DB::transaction(function () use ($item, $kurir, $targetStatus, $alasanGagal, $actor): ItemPengantaran {
            $now = now('Asia/Jakarta');

            $lockedItem = ItemPengantaran::query()
                ->where('id_item_antar', $item->id_item_antar)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedPengantaran = Pengantaran::query()
                ->where('id_pengantaran', $lockedItem->id_pengantaran)
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureKurirOwnershipAllowed($lockedPengantaran, $kurir);

            $lockedTransaksi = Transaksi::query()
                ->where('nomor_nota', $lockedItem->nomor_nota)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedTransaksi->load(['pelanggan', 'pembayaran']);

            $currentStatus = $lockedItem->status_terima_pelanggan;
            $this->validateItemTransition($currentStatus, $targetStatus);

            if ($targetStatus === StatusItemPengantaran::DITERIMA) {
                $this->processCourierHandover(
                    $lockedTransaksi,
                    $lockedPengantaran,
                    $lockedItem,
                    $kurir,
                    $actor,
                    $now
                );
            }

            $statusPengantaranSebelum = $this->enumValue($lockedPengantaran->status_pengantaran);

            $lockedItem->update([
                'status_terima_pelanggan' => $targetStatus,
                'alasan_gagal' => $alasanGagal,
                'waktu_update' => $now,
            ]);

            $statusPengantaranSesudah = $this->syncStatusPengantaran($lockedPengantaran);

            AuditLog::create([
                'user_id' => $actor?->id ?? $kurir->user_id,
                'actor_role' => $actor !== null ? $this->enumValue($actor->role) : UserRole::PENGANTAR->value,
                'action' => 'ITEM_PENGANTARAN_UPDATED',
                'subject_type' => Transaksi::class,
                'subject_id' => $lockedItem->nomor_nota,
                'payload_before' => [
                    'id_pengantaran' => $lockedPengantaran->id_pengantaran,
                    'id_item_antar' => $lockedItem->id_item_antar,
                    'status_terima_pelanggan' => $currentStatus->value,
                    'status_pengantaran' => $statusPengantaranSebelum,
                ],
                'payload_after' => [
                    'id_pengantaran' => $lockedPengantaran->id_pengantaran,
                    'id_item_antar' => $lockedItem->id_item_antar,
                    'id_petugas_antar' => $kurir->id_petugas_antar,
                    'status_terima_pelanggan' => $targetStatus->value,
                    'status_pengantaran' => $statusPengantaranSesudah->value,
                    'alasan_gagal' => $alasanGagal,
                    'waktu_update' => $now->toIso8601String(),
                ],
                'created_at' => $now,
            ]);

            return $lockedItem->refresh()->load([
                'pengantaran.petugasPengantaran',
                'transaksi.pelanggan',
                'transaksi.layanan',
                'transaksi.pembayaran',
                'transaksi.detailPakaian',
                'transaksi.itemPengantaran',
            ]);
        });
    }

    /**
     * Reschedule a single failed ItemPengantaran into a brand-new Pengantaran without altering sibling items (KK-07).
     *
     * @param  array{tanggal_pengantaran: string, id_petugas_antar?: int|string|null}  $data
     *
     * @throws AuthorizationException
     * @throws ValidationException
     */
    public function jadwalkanUlang(ItemPengantaran $item, User $actor, array $data): Pengantaran
    {
        $actorProfile = $this->resolveRescheduleActor($actor);
        $tanggalBaru = $this->validateTanggalPengantaran($data['tanggal_pengantaran'] ?? null);
        $requestedKurirId = $this->parseOptionalPositiveId($data['id_petugas_antar'] ?? null, 'id_petugas_antar', 'Kurir pengantaran tujuan tidak valid.');

        return DB::transaction(function () use ($item, $actor, $actorProfile, $tanggalBaru, $requestedKurirId): Pengantaran {
            $now = now('Asia/Jakarta');

            $lockedItem = ItemPengantaran::query()
                ->where('id_item_antar', $item->id_item_antar)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedPengantaran = Pengantaran::query()
                ->where('id_pengantaran', $lockedItem->id_pengantaran)
                ->lockForUpdate()
                ->firstOrFail();

            if ($actorProfile['role'] === UserRole::PENGANTAR) {
                $actorKurir = $actorProfile['kurir'];
                if ($lockedPengantaran->id_petugas_antar !== $actorKurir->id_petugas_antar) {
                    throw new AuthorizationException('Anda tidak berhak menjadwalkan ulang pengantaran milik kurir lain.');
                }

                if ($requestedKurirId !== null && $requestedKurirId !== $actorKurir->id_petugas_antar) {
                    throw ValidationException::withMessages([
                        'id_petugas_antar' => 'Kurir hanya dapat menjadwalkan ulang untuk dirinya sendiri; penugasan ke kurir lain dilakukan oleh Petugas.',
                    ]);
                }
            }

            $lockedTransaksi = Transaksi::query()
                ->where('nomor_nota', $lockedItem->nomor_nota)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedItem->status_terima_pelanggan !== StatusItemPengantaran::GAGAL) {
                throw ValidationException::withMessages([
                    'item' => 'Penjadwalan ulang hanya dapat dilakukan untuk item pengantaran berstatus GAGAL.',
                ]);
            }

            if ($lockedTransaksi->status_transaksi !== StatusTransaksi::SELESAI) {
                $statusLabel = $this->enumValue($lockedTransaksi->status_transaksi);

                throw ValidationException::withMessages([
                    'nomor_nota' => "Transaksi {$lockedTransaksi->nomor_nota} harus berstatus SELESAI untuk dijadwalkan ulang (status saat ini: {$statusLabel}).",
                ]);
            }

            $hasBlockingItem = ItemPengantaran::query()
                ->where('nomor_nota', $lockedTransaksi->nomor_nota)
                ->whereIn('status_terima_pelanggan', self::BLOCKING_ITEM_STATUSES)
                ->exists();

            if ($hasBlockingItem) {
                throw ValidationException::withMessages([
                    'item' => "Transaksi {$lockedTransaksi->nomor_nota} sudah memiliki jadwal pengantaran aktif atau sudah diterima pelanggan.",
                ]);
            }

            $hasNewerItem = ItemPengantaran::query()
                ->where('nomor_nota', $lockedTransaksi->nomor_nota)
                ->where('id_item_antar', '>', $lockedItem->id_item_antar)
                ->exists();

            if ($hasNewerItem) {
                throw ValidationException::withMessages([
                    'item' => 'Item pengantaran gagal ini sudah pernah dijadwalkan ulang sebelumnya.',
                ]);
            }

            $targetKurirId = $requestedKurirId ?? $lockedPengantaran->id_petugas_antar;
            $targetKurir = $this->resolveActiveKurir($targetKurirId, 'id_petugas_antar', 'Kurir pengantaran tujuan sedang tidak aktif.');

            // Preserve KK-07 isolation: never mutate $lockedItem or any sibling ItemPengantaran.
            $this->syncStatusPengantaran($lockedPengantaran);

            $pengantaranBaru = Pengantaran::create([
                'id_petugas_antar' => $targetKurir->id_petugas_antar,
                'tanggal_pengantaran' => $tanggalBaru,
                'status_pengantaran' => StatusPengantaran::DIJADWALKAN,
            ]);

            $itemBaru = ItemPengantaran::create([
                'id_pengantaran' => $pengantaranBaru->id_pengantaran,
                'nomor_nota' => $lockedTransaksi->nomor_nota,
                'status_terima_pelanggan' => StatusItemPengantaran::MENUNGGU,
                'alasan_gagal' => null,
                'waktu_update' => $now,
            ]);

            AuditLog::create([
                'user_id' => $actor->id,
                'actor_role' => $this->enumValue($actor->role),
                'action' => 'PENGANTARAN_RESCHEDULED',
                'subject_type' => Transaksi::class,
                'subject_id' => $lockedTransaksi->nomor_nota,
                'payload_before' => [
                    'old_id_pengantaran' => $lockedPengantaran->id_pengantaran,
                    'old_id_item_antar' => $lockedItem->id_item_antar,
                    'status_terima_pelanggan' => StatusItemPengantaran::GAGAL->value,
                    'alasan_gagal' => $lockedItem->alasan_gagal,
                ],
                'payload_after' => [
                    'old_id_pengantaran' => $lockedPengantaran->id_pengantaran,
                    'old_id_item_antar' => $lockedItem->id_item_antar,
                    'new_id_pengantaran' => $pengantaranBaru->id_pengantaran,
                    'new_id_item_antar' => $itemBaru->id_item_antar,
                    'tanggal_pengantaran_baru' => $tanggalBaru,
                    'id_petugas_antar_baru' => $targetKurir->id_petugas_antar,
                ],
                'created_at' => $now,
            ]);

            return $pengantaranBaru->load($this->detailRelations());
        });
    }

    /**
     * Synchronize parent Pengantaran header status from its ItemPengantaran statuses.
     */
    public function syncStatusPengantaran(Pengantaran $pengantaran): StatusPengantaran
    {
        $items = $pengantaran->itemPengantaran()->get(['id_item_antar', 'status_terima_pelanggan']);

        if ($items->isNotEmpty() && $items->every(fn (ItemPengantaran $item): bool => in_array(
            $item->status_terima_pelanggan,
            [StatusItemPengantaran::DITERIMA, StatusItemPengantaran::GAGAL],
            true
        ))) {
            $nextStatus = StatusPengantaran::SELESAI;
        } elseif (
            $pengantaran->status_pengantaran === StatusPengantaran::BERJALAN
            || $items->contains(fn (ItemPengantaran $item): bool => in_array(
                $item->status_terima_pelanggan,
                [
                    StatusItemPengantaran::DIAMBIL,
                    StatusItemPengantaran::DALAM_PERJALANAN,
                    StatusItemPengantaran::DITERIMA,
                    StatusItemPengantaran::GAGAL,
                ],
                true
            ))
        ) {
            $nextStatus = StatusPengantaran::BERJALAN;
        } else {
            $nextStatus = StatusPengantaran::DIJADWALKAN;
        }

        if ($pengantaran->status_pengantaran !== $nextStatus) {
            $pengantaran->update([
                'status_pengantaran' => $nextStatus,
            ]);
        }

        return $nextStatus;
    }

    /**
     * Find a Pengantaran session with eager-loaded relations for detail view.
     */
    public function findForDetail(int|string $id): Pengantaran
    {
        return Pengantaran::query()
            ->with($this->detailRelations())
            ->findOrFail($id);
    }

    /**
     * Paginate delivery sessions without N+1 queries, scoped to the authenticated courier when role is PENGANTAR.
     *
     * @param  array{
     *     search?: string,
     *     status_pengantaran?: string,
     *     tanggal_pengantaran?: string,
     *     id_petugas_antar?: string|int
     * }  $filters
     */
    public function paginatePengantaran(array $filters = [], ?User $actor = null, int $perPage = 10): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $rawStatus = strtoupper(trim((string) ($filters['status_pengantaran'] ?? '')));
        $statusPengantaran = in_array($rawStatus, StatusPengantaran::values(), true) ? $rawStatus : '';
        $tanggalPengantaran = $this->normalizeOptionalDateFilter($filters['tanggal_pengantaran'] ?? '');

        $scopedKurirId = $this->resolveScopedKurirId($actor);
        $filterKurirId = $scopedKurirId !== null
            ? null
            : $this->normalizeOptionalNumericFilter($filters['id_petugas_antar'] ?? '');

        $paginator = Pengantaran::query()
            ->with($this->detailRelations())
            ->when($scopedKurirId !== null, function ($query) use ($scopedKurirId): void {
                $query->where('id_petugas_antar', $scopedKurirId);
            })
            ->when($filterKurirId !== null, function ($query) use ($filterKurirId): void {
                $query->where('id_petugas_antar', $filterKurirId);
            })
            ->when($statusPengantaran !== '', function ($query) use ($statusPengantaran): void {
                $query->where('status_pengantaran', $statusPengantaran);
            })
            ->when($tanggalPengantaran !== '', function ($query) use ($tanggalPengantaran): void {
                $query->whereDate('tanggal_pengantaran', $tanggalPengantaran);
            })
            ->when($search !== '', function ($query) use ($search): void {
                $pattern = SqlLike::contains($search);

                $query->where(function ($subQuery) use ($pattern): void {
                    $subQuery->whereHas('petugasPengantaran', function ($kurirQuery) use ($pattern): void {
                        $kurirQuery->where('nama_petugas_antar', 'like', $pattern);
                    })->orWhereHas('itemPengantaran', function ($itemQuery) use ($pattern): void {
                        $itemQuery->where('nomor_nota', 'like', $pattern)
                            ->orWhereHas('transaksi.pelanggan', function ($pelangganQuery) use ($pattern): void {
                                $pelangganQuery->where('nama', 'like', $pattern)
                                    ->orWhere('no_telepon', 'like', $pattern);
                            });
                    });
                });
            })
            ->orderByDesc('tanggal_pengantaran')
            ->orderByDesc('id_pengantaran')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->through(fn (Pengantaran $pengantaran): array => $this->formatPengantaranDetail($pengantaran));

        return $paginator;
    }

    /**
     * Count delivery sessions by status in one query, scoped to the authenticated courier when role is PENGANTAR.
     *
     * @return array<string, int>
     */
    public function getStatusCounts(?User $actor = null): array
    {
        $scopedKurirId = $this->resolveScopedKurirId($actor);

        $rows = Pengantaran::query()
            ->when($scopedKurirId !== null, function ($query) use ($scopedKurirId): void {
                $query->where('id_petugas_antar', $scopedKurirId);
            })
            ->selectRaw('status_pengantaran, COUNT(*) as aggregate_count')
            ->groupBy('status_pengantaran')
            ->pluck('aggregate_count', 'status_pengantaran');

        $counts = [];
        foreach (StatusPengantaran::cases() as $status) {
            $counts[$status->value] = (int) ($rows[$status->value] ?? 0);
        }

        return $counts;
    }

    /**
     * Retrieve courier dropdown options formatted as KurirOption[].
     *
     * @return list<array{id_petugas_antar: int, nama_petugas_antar: string, is_active: bool}>
     */
    public function getKurirOptions(): array
    {
        return PetugasPengantaran::query()
            ->join('users', 'users.id', '=', 'petugas_pengantaran.user_id')
            ->select([
                'petugas_pengantaran.id_petugas_antar',
                'petugas_pengantaran.nama_petugas_antar',
                'users.is_active',
            ])
            ->orderByDesc('users.is_active')
            ->orderBy('petugas_pengantaran.nama_petugas_antar')
            ->get()
            ->map(fn (PetugasPengantaran $kurir): array => [
                'id_petugas_antar' => (int) $kurir->id_petugas_antar,
                'nama_petugas_antar' => $kurir->nama_petugas_antar,
                'is_active' => (bool) $kurir->getAttribute('is_active'),
            ])
            ->values()
            ->all();
    }

    /**
     * Retrieve SELESAI transactions eligible for delivery scheduling in a single SQL query (no N+1).
     *
     * @return list<array<string, mixed>>
     */
    public function getEligibleTransaksiOptions(): array
    {
        return Transaksi::query()
            ->join('pelanggan', 'pelanggan.id_pelanggan', '=', 'transaksi.id_pelanggan')
            ->join('jenis_layanan', 'jenis_layanan.id_layanan', '=', 'transaksi.id_layanan')
            ->select([
                'transaksi.nomor_nota',
                'transaksi.tanggal_penerimaan',
                'transaksi.total_harga',
                'transaksi.status_pembayaran',
                'transaksi.berat_atau_jumlah',
                'pelanggan.id_pelanggan as pelanggan_id',
                'pelanggan.nama as pelanggan_nama',
                'pelanggan.no_telepon as pelanggan_no_telepon',
                'pelanggan.alamat as pelanggan_alamat',
                'pelanggan.boleh_bayar_akhir as pelanggan_boleh_bayar_akhir',
                'jenis_layanan.id_layanan as layanan_id',
                'jenis_layanan.nama_layanan as layanan_nama',
                'jenis_layanan.tingkat_kecepatan as layanan_tingkat_kecepatan',
                'jenis_layanan.satuan as layanan_satuan',
            ])
            ->withSum('pembayaran as total_dibayar_sum', 'nominal_bayar')
            ->withCount([
                'laporanKerusakanKehilangan as insiden_pending_count' => fn ($query) => $query->whereNull('id_petugas'),
            ])
            ->withExists([
                'itemPengantaran as has_previous_failed_delivery' => fn ($query) => $query->where(
                    'status_terima_pelanggan',
                    StatusItemPengantaran::GAGAL->value
                ),
            ])
            ->where('transaksi.status_transaksi', StatusTransaksi::SELESAI->value)
            ->whereDoesntHave('itemPengantaran', function ($query): void {
                $query->whereIn('status_terima_pelanggan', self::BLOCKING_ITEM_STATUSES);
            })
            ->orderByDesc('transaksi.tanggal_penerimaan')
            ->orderByDesc('transaksi.nomor_nota')
            ->get()
            ->map(function (Transaksi $transaksi): array {
                $totalDibayar = $this->normalizeMoneyOrZero($transaksi->getAttribute('total_dibayar_sum'));
                $sisaTagihan = DecimalMoney::maxZero(
                    DecimalMoney::subtract((string) $transaksi->total_harga, $totalDibayar)
                );

                return [
                    'nomor_nota' => $transaksi->nomor_nota,
                    'tanggal_penerimaan' => $transaksi->tanggal_penerimaan?->toISOString(),
                    'total_harga' => (string) $transaksi->total_harga,
                    'total_dibayar' => $totalDibayar,
                    'sisa_tagihan' => $sisaTagihan,
                    'status_pembayaran' => $this->enumValue($transaksi->status_pembayaran),
                    'insiden_pending_count' => (int) $transaksi->getAttribute('insiden_pending_count'),
                    'has_previous_failed_delivery' => (bool) $transaksi->getAttribute('has_previous_failed_delivery'),
                    'pelanggan' => [
                        'id_pelanggan' => (int) $transaksi->getAttribute('pelanggan_id'),
                        'nama' => (string) $transaksi->getAttribute('pelanggan_nama'),
                        'no_telepon' => (string) $transaksi->getAttribute('pelanggan_no_telepon'),
                        'alamat' => (string) $transaksi->getAttribute('pelanggan_alamat'),
                        'boleh_bayar_akhir' => (bool) $transaksi->getAttribute('pelanggan_boleh_bayar_akhir'),
                    ],
                    'layanan' => [
                        'id_layanan' => (int) $transaksi->getAttribute('layanan_id'),
                        'nama_layanan' => (string) $transaksi->getAttribute('layanan_nama'),
                        'tingkat_kecepatan' => (string) $transaksi->getAttribute('layanan_tingkat_kecepatan'),
                        'satuan' => (string) $transaksi->getAttribute('layanan_satuan'),
                    ],
                    'berat_atau_jumlah' => (string) $transaksi->berat_atau_jumlah,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Format a Pengantaran model into the PengantaranSummary contract.
     * Note: item_selesai_count tracks terminal items (DITERIMA or GAGAL) resolved in this session,
     * while item_gagal_count tracks GAGAL items separately.
     *
     * @return array<string, mixed>
     */
    public function formatPengantaranDetail(Pengantaran $pengantaran): array
    {
        $pengantaran->loadMissing($this->detailRelations());

        $items = $pengantaran->itemPengantaran->sortBy('id_item_antar')->values();
        foreach ($items as $item) {
            $item->setRelation('pengantaran', $pengantaran);
        }

        $itemSelesaiCount = $items->filter(fn (ItemPengantaran $item): bool => in_array(
            $item->status_terima_pelanggan,
            [StatusItemPengantaran::DITERIMA, StatusItemPengantaran::GAGAL],
            true
        ))->count();

        $itemGagalCount = $items->filter(
            fn (ItemPengantaran $item): bool => $item->status_terima_pelanggan === StatusItemPengantaran::GAGAL
        )->count();

        return [
            'id_pengantaran' => $pengantaran->id_pengantaran,
            'id_petugas_antar' => $pengantaran->id_petugas_antar,
            'tanggal_pengantaran' => $pengantaran->tanggal_pengantaran instanceof CarbonInterface
                ? $pengantaran->tanggal_pengantaran->toDateString()
                : (string) $pengantaran->tanggal_pengantaran,
            'status_pengantaran' => $this->enumValue($pengantaran->status_pengantaran),
            'created_at' => $pengantaran->created_at?->toISOString(),
            'updated_at' => $pengantaran->updated_at?->toISOString(),
            'petugas_pengantaran' => [
                'id_petugas_antar' => $pengantaran->petugasPengantaran->id_petugas_antar,
                'nama_petugas_antar' => $pengantaran->petugasPengantaran->nama_petugas_antar,
            ],
            'total_item' => $items->count(),
            'item_selesai_count' => $itemSelesaiCount,
            'item_gagal_count' => $itemGagalCount,
            'items' => $items->map(fn (ItemPengantaran $item): array => $this->formatItemDetail($item))->all(),
        ];
    }

    /**
     * Format an ItemPengantaran model into the ItemPengantaranDetail contract without N+1 queries.
     *
     * @return array<string, mixed>
     */
    public function formatItemDetail(ItemPengantaran $item): array
    {
        $item->loadMissing([
            'pengantaran.petugasPengantaran',
            'transaksi.pelanggan',
            'transaksi.layanan',
            'transaksi.itemPengantaran' => fn ($query) => $query->select([
                'id_item_antar',
                'nomor_nota',
                'status_terima_pelanggan',
            ]),
        ]);

        $transaksi = $item->transaksi;
        $pelanggan = $transaksi->pelanggan;
        $layanan = $transaksi->layanan;

        $totalDibayar = array_key_exists('total_dibayar_sum', $transaksi->getAttributes())
            ? $this->normalizeMoneyOrZero($transaksi->getAttribute('total_dibayar_sum'))
            : $this->pembayaranService->hitungTotalDibayar($transaksi);

        $sisaTagihan = DecimalMoney::maxZero(
            DecimalMoney::subtract((string) $transaksi->total_harga, $totalDibayar)
        );

        $detailPakaianCount = array_key_exists('detail_pakaian_count', $transaksi->getAttributes())
            ? (int) $transaksi->getAttribute('detail_pakaian_count')
            : ($transaksi->relationLoaded('detailPakaian')
                ? $transaksi->detailPakaian->count()
                : $transaksi->detailPakaian()->count());

        $statusItem = $item->status_terima_pelanggan;
        $statusBerikutnya = self::ALLOWED_ITEM_TRANSITIONS[$statusItem->value] ?? [];

        $allTrxItems = $transaksi->itemPengantaran;
        $hasBlockingItem = $allTrxItems->contains(fn (ItemPengantaran $other): bool => in_array(
            $other->status_terima_pelanggan->value,
            self::BLOCKING_ITEM_STATUSES,
            true
        ));
        $hasNewerItem = $allTrxItems->contains(
            fn (ItemPengantaran $other): bool => $other->id_item_antar > $item->id_item_antar
        );

        $bisaJadwalkanUlang = $statusItem === StatusItemPengantaran::GAGAL
            && $transaksi->status_transaksi === StatusTransaksi::SELESAI
            && ! $hasBlockingItem
            && ! $hasNewerItem;

        $pengantaran = $item->pengantaran;

        return [
            'id_item_antar' => $item->id_item_antar,
            'id_pengantaran' => $item->id_pengantaran,
            'nomor_nota' => $item->nomor_nota,
            'status_terima_pelanggan' => $this->enumValue($statusItem),
            'alasan_gagal' => $item->alasan_gagal,
            'waktu_update' => $item->waktu_update?->toISOString(),
            'pengantaran' => $pengantaran !== null ? [
                'id_pengantaran' => $pengantaran->id_pengantaran,
                'id_petugas_antar' => $pengantaran->id_petugas_antar,
                'tanggal_pengantaran' => $pengantaran->tanggal_pengantaran instanceof CarbonInterface
                    ? $pengantaran->tanggal_pengantaran->toDateString()
                    : (string) $pengantaran->tanggal_pengantaran,
                'status_pengantaran' => $this->enumValue($pengantaran->status_pengantaran),
                'nama_petugas_antar' => $pengantaran->petugasPengantaran->nama_petugas_antar,
            ] : null,
            'bisa_jadwalkan_ulang' => $bisaJadwalkanUlang,
            'status_berikutnya' => $statusBerikutnya,
            'transaksi' => [
                'nomor_nota' => $transaksi->nomor_nota,
                'status_transaksi' => $this->enumValue($transaksi->status_transaksi),
                'status_pembayaran' => $this->enumValue($transaksi->status_pembayaran),
                'total_harga' => (string) $transaksi->total_harga,
                'total_dibayar' => $totalDibayar,
                'sisa_tagihan' => $sisaTagihan,
                'diambil_pada' => $transaksi->diambil_pada?->toISOString(),
                'pelanggan' => [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'nama' => $pelanggan->nama,
                    'no_telepon' => $pelanggan->no_telepon,
                    'alamat' => $pelanggan->alamat,
                    'boleh_bayar_akhir' => (bool) $pelanggan->boleh_bayar_akhir,
                ],
                'layanan' => [
                    'id_layanan' => $layanan->id_layanan,
                    'nama_layanan' => $layanan->nama_layanan,
                    'tingkat_kecepatan' => $this->enumValue($layanan->tingkat_kecepatan),
                    'satuan' => $this->enumValue($layanan->satuan),
                ],
                'berat_atau_jumlah' => (string) $transaksi->berat_atau_jumlah,
                'detail_pakaian_count' => $detailPakaianCount,
            ],
        ];
    }

    /**
     * @return array<int|string, mixed>
     */
    public function detailRelations(): array
    {
        return [
            'petugasPengantaran',
            'itemPengantaran' => fn ($query) => $query->orderBy('id_item_antar'),
            'itemPengantaran.transaksi' => fn ($query) => $query
                ->withCount('detailPakaian')
                ->withSum('pembayaran as total_dibayar_sum', 'nominal_bayar'),
            'itemPengantaran.transaksi.pelanggan',
            'itemPengantaran.transaksi.layanan',
            'itemPengantaran.transaksi.itemPengantaran' => fn ($query) => $query->select([
                'id_item_antar',
                'nomor_nota',
                'status_terima_pelanggan',
            ]),
        ];
    }

    /**
     * @throws ValidationException
     */
    private function processCourierHandover(
        Transaksi $lockedTransaksi,
        Pengantaran $lockedPengantaran,
        ItemPengantaran $lockedItem,
        PetugasPengantaran $kurir,
        ?User $actor,
        CarbonInterface $now
    ): void {
        if ($lockedTransaksi->status_transaksi !== StatusTransaksi::SELESAI) {
            throw ValidationException::withMessages([
                'status_terima_pelanggan' => 'Serah terima pengantaran hanya dapat dilakukan untuk transaksi berstatus SELESAI.',
            ]);
        }

        $hakBayar = $this->serahTerimaService->cekHakBayarAkhir($lockedTransaksi);

        if (! $hakBayar['allowed']) {
            $nama = $lockedTransaksi->pelanggan->nama;
            $formattedSisa = DecimalMoney::formatRupiah($hakBayar['sisa_tagihan']);

            throw ValidationException::withMessages([
                'status_terima_pelanggan' => "Pelanggan {$nama} belum melunasi sisa tagihan sebesar {$formattedSisa} dan tidak memiliki hak bayar akhir (KK-06). Arahkan pelanggan melunasi di kasir terlebih dahulu atau tandai pengantaran sebagai GAGAL.",
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
            'user_id' => $actor?->id ?? $kurir->user_id,
            'actor_role' => $actor !== null ? $this->enumValue($actor->role) : UserRole::PENGANTAR->value,
            'action' => 'SERAH_TERIMA',
            'subject_type' => Transaksi::class,
            'subject_id' => $lockedTransaksi->nomor_nota,
            'payload_before' => [
                'status_transaksi' => $statusTransaksiSebelum,
                'status_pembayaran' => $statusPembayaranSebelum,
                'diambil_pada' => null,
            ],
            'payload_after' => [
                'kanal' => 'KURIR',
                'id_pengantaran' => $lockedPengantaran->id_pengantaran,
                'id_item_antar' => $lockedItem->id_item_antar,
                'id_petugas_antar' => $kurir->id_petugas_antar,
                'status_transaksi' => StatusTransaksi::DIAMBIL->value,
                'status_pembayaran' => $statusPembayaranSesudah->value,
                'sisa_tagihan' => $sisaTagihan,
                'boleh_bayar_akhir' => (bool) $hakBayar['boleh_bayar_akhir'],
                'piutang_dicatat' => $piutangDicatat,
                'diambil_pada' => $now->toIso8601String(),
            ],
            'created_at' => $now,
        ]);
    }

    /**
     * @throws ValidationException
     */
    private function validateItemTransition(StatusItemPengantaran $currentStatus, StatusItemPengantaran $targetStatus): void
    {
        if ($currentStatus === $targetStatus) {
            throw ValidationException::withMessages([
                'status_terima_pelanggan' => "Status item pengantaran tidak dapat diulang ({$currentStatus->value}).",
            ]);
        }

        if (in_array($currentStatus, [StatusItemPengantaran::DITERIMA, StatusItemPengantaran::GAGAL], true)) {
            throw ValidationException::withMessages([
                'status_terima_pelanggan' => "Item pengantaran sudah berstatus final ({$currentStatus->value}) dan tidak dapat diubah lagi.",
            ]);
        }

        $allowedTargets = self::ALLOWED_ITEM_TRANSITIONS[$currentStatus->value] ?? [];

        if (! in_array($targetStatus->value, $allowedTargets, true)) {
            $allowedLabel = implode(', ', $allowedTargets);

            throw ValidationException::withMessages([
                'status_terima_pelanggan' => "Transisi status item pengantaran wajib berurutan; dari {$currentStatus->value} hanya boleh ke [{$allowedLabel}].",
            ]);
        }
    }

    /**
     * @throws AuthorizationException
     */
    private function ensureKurirOwnershipAllowed(Pengantaran $pengantaran, PetugasPengantaran $kurir): void
    {
        $kurir->loadMissing('user');

        if (! $kurir->user || ! $kurir->user->is_active || $kurir->user->role !== UserRole::PENGANTAR) {
            throw new AuthorizationException('Akun kurir pengantaran tidak aktif.');
        }

        if ($pengantaran->id_petugas_antar !== $kurir->id_petugas_antar) {
            throw new AuthorizationException('Anda tidak berhak mengakses atau mengubah sesi pengantaran milik kurir lain.');
        }
    }

    /**
     * @return array{role: UserRole, kurir: ?PetugasPengantaran}
     *
     * @throws AuthorizationException
     */
    private function resolveRescheduleActor(User $actor): array
    {
        if (! $actor->is_active) {
            throw new AuthorizationException('Akun pengguna tidak aktif.');
        }

        if ($actor->role === UserRole::PETUGAS) {
            if ($actor->petugas === null) {
                throw new AuthorizationException('Profil petugas tidak ditemukan untuk akun ini.');
            }

            return [
                'role' => UserRole::PETUGAS,
                'kurir' => null,
            ];
        }

        if ($actor->role === UserRole::PENGANTAR) {
            $kurir = $actor->petugasPengantaran;
            if ($kurir === null) {
                throw new AuthorizationException('Profil kurir tidak ditemukan untuk akun ini.');
            }

            return [
                'role' => UserRole::PENGANTAR,
                'kurir' => $kurir,
            ];
        }

        throw new AuthorizationException('Anda tidak memiliki hak akses untuk menjadwalkan ulang pengantaran.');
    }

    /**
     * @throws ValidationException
     */
    private function resolveActiveKurir(int $idPetugasAntar, string $field, string $inactiveMessage): PetugasPengantaran
    {
        $kurir = PetugasPengantaran::with('user')->find($idPetugasAntar);

        if ($kurir === null) {
            throw ValidationException::withMessages([
                $field => 'Kurir pengantaran tidak ditemukan.',
            ]);
        }

        if (! $kurir->user || ! $kurir->user->is_active || $kurir->user->role !== UserRole::PENGANTAR) {
            throw ValidationException::withMessages([
                $field => $inactiveMessage,
            ]);
        }

        return $kurir;
    }

    /**
     * @throws ValidationException
     */
    private function validateTanggalPengantaran(mixed $rawTanggal): string
    {
        if (! is_string($rawTanggal) || trim($rawTanggal) === '') {
            throw ValidationException::withMessages([
                'tanggal_pengantaran' => 'Tanggal pengantaran wajib diisi.',
            ]);
        }

        try {
            $parsed = Carbon::parse(trim($rawTanggal), 'Asia/Jakarta');
        } catch (Throwable) {
            throw ValidationException::withMessages([
                'tanggal_pengantaran' => 'Format tanggal pengantaran tidak valid.',
            ]);
        }

        $dateString = $parsed->copy()->timezone('Asia/Jakarta')->toDateString();
        $todayWib = now('Asia/Jakarta')->toDateString();

        if ($dateString < $todayWib) {
            throw ValidationException::withMessages([
                'tanggal_pengantaran' => 'Tanggal pengantaran minimal hari ini.',
            ]);
        }

        return $dateString;
    }

    /**
     * @return list<string>
     *
     * @throws ValidationException
     */
    private function normalizeNotaList(mixed $rawNotas): array
    {
        if (! is_array($rawNotas) || count($rawNotas) < 1) {
            throw ValidationException::withMessages([
                'nomor_nota_list' => 'Minimal pilih 1 nomor nota transaksi untuk dijadwalkan.',
            ]);
        }

        $normalized = [];
        foreach ($rawNotas as $rawNota) {
            $nota = is_string($rawNota) ? trim($rawNota) : '';

            if ($nota === '') {
                throw ValidationException::withMessages([
                    'nomor_nota_list' => 'Setiap nomor nota pada jadwal pengantaran wajib valid.',
                ]);
            }

            $normalized[] = $nota;
        }

        if (count($normalized) !== count(array_unique($normalized))) {
            throw ValidationException::withMessages([
                'nomor_nota_list' => 'Daftar nomor nota tidak boleh mengandung duplikat.',
            ]);
        }

        return $normalized;
    }

    /**
     * @throws ValidationException
     */
    private function parsePositiveId(mixed $rawId, string $field, string $errorMessage): int
    {
        $parsed = filter_var($rawId, FILTER_VALIDATE_INT);

        if ($parsed === false || $parsed <= 0) {
            throw ValidationException::withMessages([
                $field => $errorMessage,
            ]);
        }

        return $parsed;
    }

    /**
     * @throws ValidationException
     */
    private function parseOptionalPositiveId(mixed $rawId, string $field, string $errorMessage): ?int
    {
        if ($rawId === null || (is_string($rawId) && trim($rawId) === '')) {
            return null;
        }

        return $this->parsePositiveId($rawId, $field, $errorMessage);
    }

    private function resolveScopedKurirId(?User $actor): ?int
    {
        if ($actor === null || $actor->role !== UserRole::PENGANTAR) {
            return null;
        }

        return $actor->actorId() ?? 0;
    }

    private function normalizeOptionalDateFilter(mixed $rawDate): string
    {
        $trimmed = trim((string) $rawDate);

        if ($trimmed === '' || preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed) !== 1) {
            return '';
        }

        try {
            return Carbon::createFromFormat('Y-m-d', $trimmed, 'Asia/Jakarta')->toDateString();
        } catch (Throwable) {
            return '';
        }
    }

    private function normalizeOptionalNumericFilter(mixed $rawValue): ?int
    {
        $trimmed = trim((string) $rawValue);

        if ($trimmed === '' || ! ctype_digit($trimmed) || (int) $trimmed <= 0) {
            return null;
        }

        return (int) $trimmed;
    }

    private function normalizeMoneyOrZero(mixed $rawAmount): string
    {
        if ($rawAmount === null || trim((string) $rawAmount) === '') {
            return '0.00';
        }

        return DecimalMoney::toDecimalString(DecimalMoney::toCents((string) $rawAmount));
    }

    private function enumValue(mixed $value): string
    {
        return $value instanceof BackedEnum ? (string) $value->value : (string) $value;
    }
}
