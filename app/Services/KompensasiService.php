<?php

namespace App\Services;

use App\Enums\JenisInsiden;
use App\Enums\StatusTransaksi;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Pegawai;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Models\User;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use BackedEnum;
use Carbon\CarbonInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class KompensasiService
{
    public function __construct(
        private readonly TransaksiService $transaksiService,
        private readonly PembayaranService $pembayaranService
    ) {}

    /**
     * Single source-of-truth compensation formula (KK-04: 5x item basis, KK-05: 10x item basis).
     */
    public static function estimateCompensation(
        string $subtotalLayanan,
        int $totalPotongNota,
        ?DetailPakaian $detail,
        JenisInsiden $jenisInsiden
    ): string {
        $itemPotong = $detail !== null ? max(0, (int) $detail->jumlah_potong) : 1;
        $prorated = DecimalMoney::prorateAndMultiply(
            $subtotalLayanan,
            $itemPotong,
            max(1, $totalPotongNota),
            1
        );
        $basisCents = max(100, DecimalMoney::toCents($prorated));
        $multiplier = $jenisInsiden === JenisInsiden::HILANG ? 10 : 5;

        if ($basisCents > intdiv(PHP_INT_MAX, $multiplier)) {
            throw new InvalidArgumentException('Incident compensation calculation exceeds integer bounds.');
        }

        return DecimalMoney::toDecimalString($basisCents * $multiplier);
    }

    /**
     * Calculate deterministic compensation based on prorated clothing item share and tariff snapshot.
     */
    public function hitungKompensasi(Transaksi $transaksi, DetailPakaian $detail, JenisInsiden $jenisInsiden): string
    {
        $transaksi->loadMissing('detailPakaian');

        $subtotalLayanan = DecimalMoney::multiplyQuantity(
            (string) $transaksi->berat_atau_jumlah,
            (string) $transaksi->harga_satuan_snapshot
        );
        $totalPotongNota = max(1, (int) $transaksi->detailPakaian->sum('jumlah_potong'));

        return self::estimateCompensation($subtotalLayanan, $totalPotongNota, $detail, $jenisInsiden);
    }

    /**
     * Submit an incident report in two actor modes:
     * - Mode 1 (PEGAWAI): creates MENUNGGU_KONFIRMASI report without deducting transaction balance.
     * - Mode 2 (PETUGAS): creates and immediately confirms compensation via potongKompensasi().
     *
     * @param  array{
     *     nomor_nota: string,
     *     id_detail: int|string,
     *     jenis_insiden: string,
     *     keterangan: string,
     *     nilai_kompensasi?: string|int|float|null,
     *     id_pegawai_pelapor?: int|string|null
     * }  $data
     *
     * @throws AuthorizationException
     * @throws ValidationException
     */
    public function laporInsiden(User $actor, array $data): LaporanKerusakanKehilangan
    {
        $actorContext = $this->resolveAuthorizedActor($actor);

        $nomorNota = trim((string) ($data['nomor_nota'] ?? ''));
        if ($nomorNota === '') {
            throw ValidationException::withMessages([
                'nomor_nota' => 'Nomor nota wajib diisi.',
            ]);
        }

        $rawDetailId = $data['id_detail'] ?? null;
        if (! is_numeric($rawDetailId) || (int) $rawDetailId <= 0) {
            throw ValidationException::withMessages([
                'id_detail' => 'Detail pakaian wajib dipilih.',
            ]);
        }
        $idDetail = (int) $rawDetailId;

        $jenisInsiden = $this->parseJenisInsiden($data['jenis_insiden'] ?? '');
        $keterangan = $this->validateKeterangan($data['keterangan'] ?? '');

        $isPetugasMode = $actorContext['role'] === UserRole::PETUGAS;
        $pegawaiPelaporOverride = $isPetugasMode
            ? $this->resolveOptionalPegawaiPelapor($data['id_pegawai_pelapor'] ?? null)
            : null;
        $nilaiKompensasiInput = $isPetugasMode
            ? $this->parseOptionalPositiveMoney($data['nilai_kompensasi'] ?? null, 'nilai_kompensasi')
            : null;

        return DB::transaction(function () use (
            $actor,
            $actorContext,
            $nomorNota,
            $idDetail,
            $jenisInsiden,
            $keterangan,
            $isPetugasMode,
            $pegawaiPelaporOverride,
            $nilaiKompensasiInput
        ): LaporanKerusakanKehilangan {
            $now = now('Asia/Jakarta');

            $transaksi = Transaksi::query()
                ->where('nomor_nota', $nomorNota)
                ->lockForUpdate()
                ->first();

            if ($transaksi === null) {
                throw ValidationException::withMessages([
                    'nomor_nota' => 'Transaksi tidak ditemukan.',
                ]);
            }

            $transaksi->load(['detailPakaian', 'pembayaran']);

            $this->ensureTransaksiEligible($transaksi, 'nomor_nota');

            $detail = DetailPakaian::query()
                ->where('id_detail', $idDetail)
                ->first();

            if ($detail === null || $detail->nomor_nota !== $transaksi->nomor_nota) {
                throw ValidationException::withMessages([
                    'id_detail' => 'Detail pakaian tidak ditemukan atau bukan milik nomor nota transaksi ini.',
                ]);
            }

            if (! $isPetugasMode) {
                return $this->createPegawaiPendingReport(
                    $transaksi,
                    $detail,
                    $actor,
                    $actorContext['pegawai'],
                    $jenisInsiden,
                    $keterangan,
                    $now
                );
            }

            return $this->createPetugasConfirmedReport(
                $transaksi,
                $detail,
                $actor,
                $actorContext['petugas'],
                $pegawaiPelaporOverride,
                $jenisInsiden,
                $keterangan,
                $nilaiKompensasiInput,
                $now
            );
        });
    }

    /**
     * Confirm a pending incident report as Petugas and deduct compensation from transaction balance.
     *
     * @param  array{
     *     nilai_kompensasi?: string|int|float|null,
     *     keterangan_konfirmasi?: string|null
     * }  $data
     *
     * @throws ValidationException
     */
    public function konfirmasiKompensasi(
        Petugas $petugas,
        LaporanKerusakanKehilangan $laporan,
        array $data = [],
        ?User $actor = null
    ): LaporanKerusakanKehilangan {
        $nilaiKompensasiInput = $this->parseOptionalPositiveMoney(
            $data['nilai_kompensasi'] ?? null,
            'nilai_kompensasi'
        );
        $keteranganKonfirmasi = $this->parseOptionalConfirmationNote($data['keterangan_konfirmasi'] ?? null);

        return DB::transaction(function () use (
            $petugas,
            $laporan,
            $actor,
            $nilaiKompensasiInput,
            $keteranganKonfirmasi
        ): LaporanKerusakanKehilangan {
            $now = now('Asia/Jakarta');

            $lockedLaporan = LaporanKerusakanKehilangan::query()
                ->where('id_laporan', $laporan->id_laporan)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedLaporan->id_petugas !== null) {
                throw ValidationException::withMessages([
                    'laporan' => 'Laporan insiden sudah dikonfirmasi.',
                ]);
            }

            $transaksi = Transaksi::query()
                ->where('nomor_nota', $lockedLaporan->nomor_nota)
                ->lockForUpdate()
                ->firstOrFail();

            $transaksi->load(['detailPakaian', 'pembayaran']);
            $this->ensureTransaksiEligible($transaksi, 'laporan');

            $detail = $transaksi->detailPakaian->firstWhere('id_detail', $lockedLaporan->id_detail)
                ?? DetailPakaian::findOrFail($lockedLaporan->id_detail);

            $jenisInsiden = $lockedLaporan->jenis_insiden instanceof JenisInsiden
                ? $lockedLaporan->jenis_insiden
                : JenisInsiden::from((string) $lockedLaporan->jenis_insiden);

            $nilaiKompensasi = $nilaiKompensasiInput ?? $this->hitungKompensasi($transaksi, $detail, $jenisInsiden);
            $settlement = $this->potongKompensasi($transaksi, $nilaiKompensasi);

            $lockedLaporan->update([
                'id_petugas' => $petugas->id_petugas,
                'nilai_kompensasi' => $nilaiKompensasi,
                'kelebihan_ganti_rugi' => $settlement['kelebihan_ganti_rugi'],
            ]);

            $this->recordCompensationConfirmedAudit(
                $transaksi,
                $lockedLaporan,
                $detail,
                $petugas,
                $actor,
                $settlement,
                $keteranganKonfirmasi,
                $now
            );

            return $lockedLaporan->refresh()->load($this->detailRelations());
        });
    }

    private function createPegawaiPendingReport(
        Transaksi $transaksi,
        DetailPakaian $detail,
        User $actor,
        Pegawai $pegawai,
        JenisInsiden $jenisInsiden,
        string $keterangan,
        CarbonInterface $now
    ): LaporanKerusakanKehilangan {
        $laporan = LaporanKerusakanKehilangan::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_detail' => $detail->id_detail,
            'id_petugas' => null,
            'id_pegawai_pelapor' => $pegawai->id_pegawai,
            'jenis_insiden' => $jenisInsiden,
            'keterangan' => $keterangan,
            'nilai_kompensasi' => '0.00',
            'kelebihan_ganti_rugi' => '0.00',
        ]);

        $this->recordAuditLog(
            $transaksi,
            $actor,
            UserRole::PEGAWAI,
            'INSIDEN_REPORTED',
            null,
            [
                'id_laporan' => $laporan->id_laporan,
                'id_detail' => $detail->id_detail,
                'jenis_pakaian' => $detail->jenis_pakaian,
                'jenis_insiden' => $jenisInsiden->value,
                'keterangan' => $keterangan,
                'id_pegawai_pelapor' => $pegawai->id_pegawai,
                'id_petugas' => null,
                'status_konfirmasi' => 'MENUNGGU_KONFIRMASI',
                'nilai_kompensasi' => '0.00',
                'kelebihan_ganti_rugi' => '0.00',
            ],
            $now
        );

        return $laporan->refresh()->load($this->detailRelations());
    }

    private function createPetugasConfirmedReport(
        Transaksi $transaksi,
        DetailPakaian $detail,
        User $actor,
        Petugas $petugas,
        ?Pegawai $pegawaiPelaporOverride,
        JenisInsiden $jenisInsiden,
        string $keterangan,
        ?string $nilaiKompensasiInput,
        CarbonInterface $now
    ): LaporanKerusakanKehilangan {
        $nilaiKompensasi = $nilaiKompensasiInput ?? $this->hitungKompensasi($transaksi, $detail, $jenisInsiden);
        $settlement = $this->potongKompensasi($transaksi, $nilaiKompensasi);

        $laporan = LaporanKerusakanKehilangan::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_detail' => $detail->id_detail,
            'id_petugas' => $petugas->id_petugas,
            'id_pegawai_pelapor' => $pegawaiPelaporOverride?->id_pegawai,
            'jenis_insiden' => $jenisInsiden,
            'keterangan' => $keterangan,
            'nilai_kompensasi' => $nilaiKompensasi,
            'kelebihan_ganti_rugi' => $settlement['kelebihan_ganti_rugi'],
        ]);

        $this->recordAuditLog(
            $transaksi,
            $actor,
            UserRole::PETUGAS,
            'INSIDEN_REPORTED',
            null,
            [
                'id_laporan' => $laporan->id_laporan,
                'id_detail' => $detail->id_detail,
                'jenis_pakaian' => $detail->jenis_pakaian,
                'jenis_insiden' => $jenisInsiden->value,
                'keterangan' => $keterangan,
                'id_pegawai_pelapor' => $pegawaiPelaporOverride?->id_pegawai,
                'id_petugas' => $petugas->id_petugas,
                'status_konfirmasi' => 'TERKONFIRMASI',
            ],
            $now
        );

        $this->recordCompensationConfirmedAudit(
            $transaksi,
            $laporan,
            $detail,
            $petugas,
            $actor,
            $settlement,
            null,
            $now
        );

        return $laporan->refresh()->load($this->detailRelations());
    }

    /**
     * Deduct compensation against remaining balance and track cash refund excess without double-counting.
     *
     * @return array{
     *     nilai_kompensasi: string,
     *     kelebihan_ganti_rugi: string,
     *     sisa_tagihan_sebelum: string,
     *     sisa_tagihan_sesudah: string,
     *     total_dibayar: string,
     *     total_kompensasi_sebelum: string,
     *     total_kompensasi: string,
     *     total_harga_sebelum: string,
     *     total_harga: string,
     *     status_pembayaran_sebelum: string,
     *     status_pembayaran: string
     * }
     *
     * @throws ValidationException
     */
    public function potongKompensasi(Transaksi $transaksi, string $nilaiKompensasi): array
    {
        $normalizedNilai = $this->normalizePositiveMoney($nilaiKompensasi, 'nilai_kompensasi');

        return DB::transaction(function () use ($transaksi, $normalizedNilai): array {
            $lockedTransaksi = Transaksi::query()
                ->where('nomor_nota', $transaksi->nomor_nota)
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureTransaksiEligible($lockedTransaksi, 'nomor_nota');

            $lockedTransaksi->loadMissing('pembayaran');

            $totalDibayar = $this->pembayaranService->hitungTotalDibayar($lockedTransaksi);
            $totalHargaSebelum = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $lockedTransaksi->total_harga)
            );
            $totalKompensasiSebelum = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $lockedTransaksi->total_kompensasi)
            );
            $statusPembayaranSebelum = $lockedTransaksi->status_pembayaran;

            $sisaTagihanSebelum = DecimalMoney::maxZero(
                DecimalMoney::subtract($totalHargaSebelum, $totalDibayar)
            );
            $kelebihanGantiRugi = DecimalMoney::maxZero(
                DecimalMoney::subtract($normalizedNilai, $sisaTagihanSebelum)
            );

            $totalKompensasiBaru = DecimalMoney::add($totalKompensasiSebelum, $normalizedNilai);
            $subtotalLayanan = DecimalMoney::multiplyQuantity(
                (string) $lockedTransaksi->berat_atau_jumlah,
                (string) $lockedTransaksi->harga_satuan_snapshot
            );
            $tagihanDasar = DecimalMoney::maxZero(
                DecimalMoney::subtract($subtotalLayanan, (string) $lockedTransaksi->nilai_voucher_snapshot)
            );
            $totalHargaBaru = DecimalMoney::maxZero(
                DecimalMoney::subtract($tagihanDasar, $totalKompensasiBaru)
            );

            $statusPembayaranBaru = $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                $statusPembayaranSebelum,
                $totalHargaBaru,
                $totalDibayar
            );

            $lockedTransaksi->update([
                'total_kompensasi' => $totalKompensasiBaru,
                'total_harga' => $totalHargaBaru,
                'status_pembayaran' => $statusPembayaranBaru,
            ]);

            $transaksi->refresh();

            $sisaTagihanSesudah = DecimalMoney::maxZero(
                DecimalMoney::subtract($totalHargaBaru, $totalDibayar)
            );

            return [
                'nilai_kompensasi' => $normalizedNilai,
                'kelebihan_ganti_rugi' => $kelebihanGantiRugi,
                'sisa_tagihan_sebelum' => $sisaTagihanSebelum,
                'sisa_tagihan_sesudah' => $sisaTagihanSesudah,
                'total_dibayar' => $totalDibayar,
                'total_kompensasi_sebelum' => $totalKompensasiSebelum,
                'total_kompensasi' => $totalKompensasiBaru,
                'total_harga_sebelum' => $totalHargaSebelum,
                'total_harga' => $totalHargaBaru,
                'status_pembayaran_sebelum' => $this->enumValue($statusPembayaranSebelum),
                'status_pembayaran' => $statusPembayaranBaru->value,
            ];
        });
    }

    /**
     * Paginate incident reports with search and enum filters without N+1 queries.
     *
     * @param  array{search?: string, jenis_insiden?: string, status_konfirmasi?: string}  $filters
     */
    public function paginateLaporan(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $rawJenis = strtoupper(trim((string) ($filters['jenis_insiden'] ?? '')));
        $jenisInsiden = in_array($rawJenis, JenisInsiden::values(), true) ? $rawJenis : '';
        $rawStatus = strtoupper(trim((string) ($filters['status_konfirmasi'] ?? '')));
        $statusKonfirmasi = in_array($rawStatus, ['MENUNGGU_KONFIRMASI', 'TERKONFIRMASI'], true) ? $rawStatus : '';

        $paginator = LaporanKerusakanKehilangan::query()
            ->with($this->detailRelations())
            ->when($search !== '', function ($query) use ($search): void {
                $pattern = SqlLike::contains($search);

                $query->where(function ($subQuery) use ($pattern): void {
                    $subQuery->where('nomor_nota', 'like', $pattern)
                        ->orWhere('keterangan', 'like', $pattern)
                        ->orWhereHas('transaksi.pelanggan', function ($pelangganQuery) use ($pattern): void {
                            $pelangganQuery->where('nama', 'like', $pattern);
                        })
                        ->orWhereHas('detailPakaian', function ($detailQuery) use ($pattern): void {
                            $detailQuery->where('jenis_pakaian', 'like', $pattern);
                        });
                });
            })
            ->when($jenisInsiden !== '', function ($query) use ($jenisInsiden): void {
                $query->where('jenis_insiden', $jenisInsiden);
            })
            ->when($statusKonfirmasi === 'MENUNGGU_KONFIRMASI', function ($query): void {
                $query->whereNull('id_petugas');
            })
            ->when($statusKonfirmasi === 'TERKONFIRMASI', function ($query): void {
                $query->whereNotNull('id_petugas');
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id_laporan')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->through(fn (LaporanKerusakanKehilangan $laporan): array => $this->formatLaporanDetail($laporan));

        return $paginator;
    }

    /**
     * Count incident reports awaiting Petugas confirmation.
     */
    public function countPending(): int
    {
        return LaporanKerusakanKehilangan::query()
            ->whereNull('id_petugas')
            ->count();
    }

    /**
     * Retrieve AKTIF and SELESAI transactions formatted as EligibleInsidenTransaksiOption.
     *
     * @return list<array<string, mixed>>
     */
    public function getEligibleTransaksiOptions(): array
    {
        return Transaksi::query()
            ->with([
                'pelanggan:id_pelanggan,nama',
                'layanan:id_layanan,nama_layanan',
                'detailPakaian' => fn ($query) => $query->orderBy('id_detail'),
            ])
            ->whereIn('status_transaksi', [
                StatusTransaksi::AKTIF->value,
                StatusTransaksi::SELESAI->value,
            ])
            ->orderByDesc('tanggal_penerimaan')
            ->orderByDesc('nomor_nota')
            ->get()
            ->map(function (Transaksi $transaksi): array {
                $subtotalLayanan = DecimalMoney::multiplyQuantity(
                    (string) $transaksi->berat_atau_jumlah,
                    (string) $transaksi->harga_satuan_snapshot
                );

                return [
                    'nomor_nota' => $transaksi->nomor_nota,
                    'status_transaksi' => $this->enumValue($transaksi->status_transaksi),
                    'pelanggan_nama' => $transaksi->pelanggan->nama,
                    'layanan_nama' => $transaksi->layanan->nama_layanan,
                    'subtotal_layanan' => $subtotalLayanan,
                    'total_potong' => max(1, (int) $transaksi->detailPakaian->sum('jumlah_potong')),
                    'detail_pakaian' => $transaksi->detailPakaian
                        ->values()
                        ->map(fn (DetailPakaian $detail): array => [
                            'id_detail' => $detail->id_detail,
                            'nomor_nota' => $detail->nomor_nota,
                            'jenis_pakaian' => $detail->jenis_pakaian,
                            'jumlah_potong' => (int) $detail->jumlah_potong,
                            'kondisi_pakaian' => $detail->kondisi_pakaian,
                        ])
                        ->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Format a LaporanKerusakanKehilangan model into the LaporanInsidenDetailItem contract.
     *
     * @return array<string, mixed>
     */
    public function formatLaporanDetail(LaporanKerusakanKehilangan $laporan): array
    {
        $laporan->loadMissing($this->detailRelations());

        $transaksi = $laporan->transaksi;
        $pelanggan = $transaksi->pelanggan;
        $layanan = $transaksi->layanan;

        $subtotalLayanan = DecimalMoney::multiplyQuantity(
            (string) $transaksi->berat_atau_jumlah,
            (string) $transaksi->harga_satuan_snapshot
        );
        $totalPotongNota = max(1, (int) $transaksi->detailPakaian->sum('jumlah_potong'));
        $totalDibayar = $this->pembayaranService->hitungTotalDibayar($transaksi);
        $sisaTagihan = DecimalMoney::maxZero(
            DecimalMoney::subtract((string) $transaksi->total_harga, $totalDibayar)
        );

        $base = $this->transaksiService->formatLaporanInsiden($laporan, $subtotalLayanan, $totalPotongNota);

        return array_merge($base, [
            'transaksi' => [
                'nomor_nota' => $transaksi->nomor_nota,
                'status_transaksi' => $this->enumValue($transaksi->status_transaksi),
                'status_pembayaran' => $this->enumValue($transaksi->status_pembayaran),
                'subtotal_layanan' => $subtotalLayanan,
                'total_harga' => (string) $transaksi->total_harga,
                'total_dibayar' => $totalDibayar,
                'sisa_tagihan' => $sisaTagihan,
                'pelanggan' => [
                    'id_pelanggan' => $pelanggan->id_pelanggan,
                    'nama' => $pelanggan->nama,
                    'no_telepon' => $pelanggan->no_telepon,
                ],
                'layanan' => [
                    'id_layanan' => $layanan->id_layanan,
                    'nama_layanan' => $layanan->nama_layanan,
                    'tingkat_kecepatan' => $this->enumValue($layanan->tingkat_kecepatan),
                    'metode_hitung' => $this->enumValue($layanan->metode_hitung),
                    'satuan' => $this->enumValue($layanan->satuan),
                ],
            ],
        ]);
    }

    /**
     * @return list<string>
     */
    private function detailRelations(): array
    {
        return [
            'detailPakaian',
            'petugas',
            'pegawaiPelapor',
            'transaksi.pelanggan',
            'transaksi.layanan',
            'transaksi.detailPakaian',
            'transaksi.pembayaran',
        ];
    }

    /**
     * @return array{role: UserRole, pegawai: ?Pegawai, petugas: ?Petugas}
     *
     * @throws AuthorizationException
     */
    private function resolveAuthorizedActor(User $actor): array
    {
        if (! $actor->is_active) {
            throw new AuthorizationException('Akun pengguna tidak aktif.');
        }

        if ($actor->role === UserRole::PEGAWAI) {
            $pegawai = $actor->pegawai;
            if ($pegawai === null) {
                throw new AuthorizationException('Profil pegawai tidak ditemukan untuk akun ini.');
            }

            return [
                'role' => UserRole::PEGAWAI,
                'pegawai' => $pegawai,
                'petugas' => null,
            ];
        }

        if ($actor->role === UserRole::PETUGAS) {
            $petugas = $actor->petugas;
            if ($petugas === null) {
                throw new AuthorizationException('Profil petugas tidak ditemukan untuk akun ini.');
            }

            return [
                'role' => UserRole::PETUGAS,
                'pegawai' => null,
                'petugas' => $petugas,
            ];
        }

        throw new AuthorizationException('Anda tidak memiliki hak akses untuk melaporkan insiden.');
    }

    /**
     * @throws ValidationException
     */
    private function ensureTransaksiEligible(Transaksi $transaksi, string $field): void
    {
        if (! in_array($transaksi->status_transaksi, [StatusTransaksi::AKTIF, StatusTransaksi::SELESAI], true)) {
            throw ValidationException::withMessages([
                $field => 'Laporan insiden hanya dapat diproses pada transaksi berstatus AKTIF atau SELESAI.',
            ]);
        }
    }

    /**
     * @throws ValidationException
     */
    private function parseJenisInsiden(mixed $rawJenis): JenisInsiden
    {
        $jenis = JenisInsiden::tryFrom(strtoupper(trim((string) $rawJenis)));

        if ($jenis === null) {
            throw ValidationException::withMessages([
                'jenis_insiden' => 'Jenis insiden harus berupa RUSAK atau HILANG.',
            ]);
        }

        return $jenis;
    }

    /**
     * @throws ValidationException
     */
    private function validateKeterangan(mixed $rawKeterangan): string
    {
        $keterangan = trim((string) $rawKeterangan);
        $length = mb_strlen($keterangan);

        if ($length < 5 || $length > 1000) {
            throw ValidationException::withMessages([
                'keterangan' => 'Keterangan insiden wajib diisi antara 5 hingga 1000 karakter.',
            ]);
        }

        return $keterangan;
    }

    /**
     * @throws ValidationException
     */
    private function resolveOptionalPegawaiPelapor(mixed $rawId): ?Pegawai
    {
        if ($rawId === null || trim((string) $rawId) === '') {
            return null;
        }

        if (! is_numeric($rawId) || (int) $rawId <= 0) {
            throw ValidationException::withMessages([
                'id_pegawai_pelapor' => 'Pegawai pelapor tidak valid.',
            ]);
        }

        $pegawai = Pegawai::find((int) $rawId);
        if ($pegawai === null) {
            throw ValidationException::withMessages([
                'id_pegawai_pelapor' => 'Pegawai pelapor tidak ditemukan.',
            ]);
        }

        return $pegawai;
    }

    /**
     * @throws ValidationException
     */
    private function parseOptionalPositiveMoney(mixed $rawAmount, string $field): ?string
    {
        if ($rawAmount === null || trim((string) $rawAmount) === '') {
            return null;
        }

        return $this->normalizePositiveMoney((string) $rawAmount, $field);
    }

    /**
     * @throws ValidationException
     */
    private function normalizePositiveMoney(string $amount, string $field): string
    {
        try {
            $normalized = DecimalMoney::toDecimalString(DecimalMoney::toCents($amount));
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages([
                $field => 'Format nominal kompensasi tidak valid.',
            ]);
        }

        if (DecimalMoney::lte($normalized, '0.00')) {
            throw ValidationException::withMessages([
                $field => 'Nominal kompensasi harus lebih besar dari 0.',
            ]);
        }

        return $normalized;
    }

    /**
     * @throws ValidationException
     */
    private function parseOptionalConfirmationNote(mixed $rawNote): ?string
    {
        if ($rawNote === null) {
            return null;
        }

        $trimmed = trim((string) $rawNote);
        if ($trimmed === '') {
            return null;
        }

        if (mb_strlen($trimmed) > 500) {
            throw ValidationException::withMessages([
                'keterangan_konfirmasi' => 'Keterangan konfirmasi maksimal 500 karakter.',
            ]);
        }

        return $trimmed;
    }

    /**
     * @param  array<string, string>  $settlement
     */
    private function recordCompensationConfirmedAudit(
        Transaksi $transaksi,
        LaporanKerusakanKehilangan $laporan,
        DetailPakaian $detail,
        Petugas $petugas,
        ?User $actor,
        array $settlement,
        ?string $keteranganKonfirmasi,
        CarbonInterface $now
    ): void {
        $after = [
            'id_laporan' => $laporan->id_laporan,
            'id_detail' => $detail->id_detail,
            'jenis_pakaian' => $detail->jenis_pakaian,
            'jenis_insiden' => $this->enumValue($laporan->jenis_insiden),
            'nilai_kompensasi' => $settlement['nilai_kompensasi'],
            'kelebihan_ganti_rugi' => $settlement['kelebihan_ganti_rugi'],
            'sisa_tagihan_sebelum' => $settlement['sisa_tagihan_sebelum'],
            'sisa_tagihan_sesudah' => $settlement['sisa_tagihan_sesudah'],
            'total_dibayar' => $settlement['total_dibayar'],
            'total_kompensasi' => $settlement['total_kompensasi'],
            'total_harga' => $settlement['total_harga'],
            'status_pembayaran' => $settlement['status_pembayaran'],
            'status_konfirmasi' => 'TERKONFIRMASI',
            'id_petugas' => $petugas->id_petugas,
        ];

        if ($keteranganKonfirmasi !== null) {
            $after['keterangan_konfirmasi'] = $keteranganKonfirmasi;
        }

        $this->recordAuditLog(
            $transaksi,
            $actor,
            UserRole::PETUGAS,
            'KOMPENSASI_CONFIRMED',
            [
                'total_kompensasi' => $settlement['total_kompensasi_sebelum'],
                'total_harga' => $settlement['total_harga_sebelum'],
                'status_pembayaran' => $settlement['status_pembayaran_sebelum'],
                'sisa_tagihan_sebelum' => $settlement['sisa_tagihan_sebelum'],
            ],
            $after,
            $now,
            $petugas->user_id
        );
    }

    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>  $after
     */
    private function recordAuditLog(
        Transaksi $transaksi,
        ?User $actor,
        UserRole $fallbackRole,
        string $action,
        ?array $before,
        array $after,
        CarbonInterface $now,
        ?int $fallbackUserId = null
    ): void {
        AuditLog::create([
            'user_id' => $actor?->id ?? $fallbackUserId,
            'actor_role' => $actor !== null
                ? $this->enumValue($actor->role)
                : $fallbackRole->value,
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
