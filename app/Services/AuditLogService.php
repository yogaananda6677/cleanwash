<?php

namespace App\Services;

use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Transaksi;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use BackedEnum;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AuditLogService
{
    /**
     * @var list<string>
     */
    public const AVAILABLE_ACTIONS = [
        'TRANSAKSI_CREATED',
        'TIMBANG_ULANG',
        'PRODUKSI_STATUS_UPDATED',
        'LAYANAN_CHANGED',
        'TRANSAKSI_CANCELLED',
        'INSIDEN_REPORTED',
        'KOMPENSASI_CONFIRMED',
        'PELUNASAN_RECORDED',
        'SERAH_TERIMA',
        'PENGANTARAN_CREATED',
        'PENGANTARAN_STARTED',
        'ITEM_PENGANTARAN_UPDATED',
        'PENGANTARAN_RESCHEDULED',
    ];

    public function __construct(
        private readonly PembayaranService $pembayaranService
    ) {}

    /**
     * Paginate audit trail logs with user identity and sanitized filters (no N+1).
     *
     * @param  array{search?: string, action?: string, actor_role?: string}  $filters
     */
    public function paginateLogs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $rawAction = strtoupper(trim((string) ($filters['action'] ?? '')));
        $action = in_array($rawAction, self::AVAILABLE_ACTIONS, true) ? $rawAction : '';
        $rawRole = strtoupper(trim((string) ($filters['actor_role'] ?? '')));
        $actorRole = in_array($rawRole, UserRole::values(), true) ? $rawRole : '';

        $paginator = AuditLog::query()
            ->with(['user:id,name'])
            ->when($action !== '', function ($query) use ($action): void {
                $query->where('action', $action);
            })
            ->when($actorRole !== '', function ($query) use ($actorRole): void {
                $query->where('actor_role', $actorRole);
            })
            ->when($search !== '', function ($query) use ($search): void {
                $pattern = SqlLike::contains($search);

                $query->where(function ($subQuery) use ($pattern): void {
                    $subQuery->where('subject_id', 'like', $pattern)
                        ->orWhere('action', 'like', $pattern)
                        ->orWhereHas('user', function ($userQuery) use ($pattern): void {
                            $userQuery->where('name', 'like', $pattern);
                        });
                });
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->through(fn (AuditLog $log): array => [
            'id' => $log->id,
            'user_id' => $log->user_id,
            'actor_role' => (string) $log->actor_role,
            'action' => $log->action,
            'subject_type' => $log->subject_type,
            'subject_id' => $log->subject_id,
            'payload_before' => $log->payload_before,
            'payload_after' => $log->payload_after,
            'created_at' => $log->created_at?->toISOString(),
            'user' => $log->user !== null ? [
                'id' => $log->user->id,
                'name' => $log->user->name,
            ] : null,
        ]);

        return $paginator;
    }

    /**
     * List all domain audit action codes across Phase 1-3.
     *
     * @return list<string>
     */
    public function getAvailableActions(): array
    {
        return self::AVAILABLE_ACTIONS;
    }

    /**
     * Summarize outstanding pay-later receivables (DIAMBIL & != LUNAS) without N+1 queries.
     *
     * @return array{
     *     total_nota_piutang: int,
     *     total_nominal_piutang: string,
     *     items: list<array<string, mixed>>
     * }
     */
    public function getPiutangSummary(): array
    {
        $rows = Transaksi::query()
            ->with(['pelanggan', 'layanan', 'pembayaran'])
            ->where('status_transaksi', StatusTransaksi::DIAMBIL)
            ->where('status_pembayaran', '!=', StatusPembayaran::LUNAS)
            ->orderByDesc('diambil_pada')
            ->orderByDesc('nomor_nota')
            ->get();

        $totalNominalPiutang = '0.00';
        $items = [];

        foreach ($rows as $transaksi) {
            $totalDibayar = $this->pembayaranService->hitungTotalDibayar($transaksi);
            $sisaTagihan = DecimalMoney::maxZero(
                DecimalMoney::subtract((string) $transaksi->total_harga, $totalDibayar)
            );
            $totalNominalPiutang = DecimalMoney::add($totalNominalPiutang, $sisaTagihan);

            $items[] = [
                'nomor_nota' => $transaksi->nomor_nota,
                'diambil_pada' => $transaksi->diambil_pada?->toISOString(),
                'total_harga' => (string) $transaksi->total_harga,
                'total_dibayar' => $totalDibayar,
                'sisa_tagihan' => $sisaTagihan,
                'status_pembayaran' => $this->enumValue($transaksi->status_pembayaran),
                'pelanggan' => [
                    'id_pelanggan' => $transaksi->pelanggan->id_pelanggan,
                    'nama' => $transaksi->pelanggan->nama,
                    'no_telepon' => $transaksi->pelanggan->no_telepon,
                    'boleh_bayar_akhir' => (bool) $transaksi->pelanggan->boleh_bayar_akhir,
                ],
                'layanan' => [
                    'id_layanan' => $transaksi->layanan->id_layanan,
                    'nama_layanan' => $transaksi->layanan->nama_layanan,
                    'tingkat_kecepatan' => $this->enumValue($transaksi->layanan->tingkat_kecepatan),
                ],
            ];
        }

        return [
            'total_nota_piutang' => count($items),
            'total_nominal_piutang' => $totalNominalPiutang,
            'items' => $items,
        ];
    }

    private function enumValue(mixed $value): string
    {
        return $value instanceof BackedEnum ? (string) $value->value : (string) $value;
    }
}
