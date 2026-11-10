<?php

namespace App\Services;

use App\Enums\JenisInsiden;
use App\Enums\MetodeHitung;
use App\Enums\StatusItemPengantaran;
use App\Enums\StatusPembayaran;
use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\DetailPakaian;
use App\Models\ItemPengantaran;
use App\Models\JenisLayanan;
use App\Models\LaporanKerusakanKehilangan;
use App\Models\Pelanggan;
use App\Models\Pembayaran;
use App\Models\Petugas;
use App\Models\RiwayatStatusProduksi;
use App\Models\TahapLayanan;
use App\Models\Transaksi;
use App\Models\User;
use App\Support\DecimalMoney;
use App\Support\SqlLike;
use BackedEnum;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class TransaksiService
{
    public function __construct(
        private readonly VoucherService $voucherService,
        private readonly PembayaranService $pembayaranService
    ) {}

    /**
     * Paginate transactions formatted to TransaksiDetail with eager-loaded relations (no N+1).
     */
    public function paginate(
        string $search = '',
        string $statusPembayaran = '',
        string $statusTransaksi = '',
        int $perPage = 10
    ): LengthAwarePaginator {
        $trimmedSearch = trim($search);
        $normalizedStatus = strtoupper(trim($statusPembayaran));
        $validStatus = in_array($normalizedStatus, StatusPembayaran::values(), true) ? $normalizedStatus : '';

        $normalizedStatusTransaksi = strtoupper(trim($statusTransaksi));
        $validStatusTransaksi = in_array($normalizedStatusTransaksi, StatusTransaksi::values(), true)
            ? $normalizedStatusTransaksi
            : '';

        $paginator = Transaksi::query()
            ->with($this->detailRelations())
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
            ->when($validStatus !== '', function ($query) use ($validStatus): void {
                $query->where('status_pembayaran', $validStatus);
            })
            ->when($validStatusTransaksi !== '', function ($query) use ($validStatusTransaksi): void {
                $query->where('status_transaksi', $validStatusTransaksi);
            })
            ->orderByDesc('tanggal_penerimaan')
            ->orderByDesc('nomor_nota')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->through(fn (Transaksi $transaksi): array => $this->formatTransaksiDetail($transaksi));

        return $paginator;
    }

    /**
     * Retrieve option lists for the reception creation screen (Transaksi/Create).
     *
     * @return array{
     *     pelangganOptions: Collection<int, Pelanggan>,
     *     layananOptions: Collection<int, JenisLayanan>
     * }
     */
    public function getCreateOptions(): array
    {
        return [
            'pelangganOptions' => Pelanggan::query()
                ->select(['id_pelanggan', 'nama', 'no_telepon', 'boleh_bayar_akhir'])
                ->orderBy('nama')
                ->get(),
            'layananOptions' => $this->getActiveLayananOptions(),
        ];
    }

    /**
     * Retrieve active service options with ordered TahapLayanan stages.
     *
     * @return Collection<int, JenisLayanan>
     */
    public function getActiveLayananOptions(): Collection
    {
        return JenisLayanan::query()
            ->where('is_active', true)
            ->with(['tahapLayanan' => fn ($query) => $query->orderBy('urutan')])
            ->orderBy('nama_layanan')
            ->orderBy('tingkat_kecepatan')
            ->get();
    }

    /**
     * Retrieve formatted audit trail entries for a transaction with actor user identity.
     *
     * @return list<array<string, mixed>>
     */
    public function getAuditLogs(string $nomorNota): array
    {
        return AuditLog::query()
            ->with(['user:id,name'])
            ->where('subject_type', Transaksi::class)
            ->where('subject_id', $nomorNota)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (AuditLog $log): array => [
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
            ])
            ->values()
            ->all();
    }

    /**
     * Find a transaction by nomor_nota with all relations needed for detail/nota display.
     */
    public function findForDetail(string $nomorNota): Transaksi
    {
        return Transaksi::query()
            ->with($this->detailRelations())
            ->findOrFail($nomorNota);
    }

    /**
     * Generate a sequential daily receipt number (CW-YYYYMMDD-XXXX).
     */
    public function generateNomorNota(CarbonInterface|string|null $tanggalPenerimaan = null): string
    {
        $date = match (true) {
            $tanggalPenerimaan instanceof CarbonInterface => $tanggalPenerimaan->copy()->timezone('Asia/Jakarta'),
            is_string($tanggalPenerimaan) && trim($tanggalPenerimaan) !== '' => Carbon::parse($tanggalPenerimaan, 'Asia/Jakarta'),
            default => now('Asia/Jakarta'),
        };

        $prefix = 'CW-'.$date->format('Ymd').'-';

        $latest = Transaksi::query()
            ->where('nomor_nota', 'like', SqlLike::prefix($prefix))
            ->orderByRaw('LENGTH(nomor_nota) DESC')
            ->orderByDesc('nomor_nota')
            ->lockForUpdate()
            ->value('nomor_nota');

        $nextNumber = $latest !== null
            ? ((int) substr($latest, strlen($prefix))) + 1
            : 1;

        return sprintf('%s%04d', $prefix, $nextNumber);
    }

    /**
     * Create a transaction atomically with tariff snapshot (KK-09), voucher row lock (KK-03),
     * clothing item breakdown, initial production status, DP ledger entry, and audit log.
     *
     * @param  array{
     *     id_pelanggan: int|string,
     *     id_layanan: int|string,
     *     berat_atau_jumlah: string|int|float,
     *     nomor_voucher?: string|null,
     *     nominal_dp?: string|int|float|null,
     *     catatan_khusus?: string|null,
     *     detail_pakaian: list<array{jenis_pakaian: string, jumlah_potong: int|string, kondisi_pakaian: string}>
     * }  $data
     *
     * @throws ValidationException
     */
    public function buatTransaksi(Petugas $petugas, array $data, ?User $actor = null): Transaksi
    {
        return DB::transaction(function () use ($petugas, $data, $actor): Transaksi {
            $now = now('Asia/Jakarta');

            $pelanggan = $this->resolvePelanggan($data['id_pelanggan'] ?? null);
            $layanan = $this->resolveActiveLayanan($data['id_layanan'] ?? null);
            $detailItems = $this->validateDetailItems($data['detail_pakaian'] ?? null);
            $beratAtauJumlah = $this->validateQuantityForLayanan($data['berat_atau_jumlah'] ?? '', $layanan);

            // Lock voucher before nota sequence generation so concurrent claims on the same voucher
            // serialize on the voucher row and the loser rolls back cleanly without contention.
            $rawVoucher = isset($data['nomor_voucher']) ? trim((string) $data['nomor_voucher']) : '';
            $lockedVoucher = $rawVoucher !== ''
                ? $this->voucherService->validasiDanKunci($rawVoucher, $now->toDateString())
                : null;
            $nilaiVoucherSnapshot = $lockedVoucher !== null ? (string) $lockedVoucher->nilai : '0.00';

            $hargaSatuanSnapshot = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $layanan->harga_satuan)
            );
            $subtotalLayanan = DecimalMoney::multiplyQuantity($beratAtauJumlah, $hargaSatuanSnapshot);
            $totalHarga = DecimalMoney::maxZero(
                DecimalMoney::subtract($subtotalLayanan, $nilaiVoucherSnapshot)
            );

            $rawDp = $data['nominal_dp'] ?? null;
            $nominalDp = ($rawDp === null || trim((string) $rawDp) === '')
                ? '0.00'
                : $this->normalizeDecimal($rawDp, 'nominal_dp');

            $statusPembayaran = $this->pembayaranService->resolveStatusPembayaranAwal($nominalDp, $totalHarga);

            $catatanKhusus = isset($data['catatan_khusus']) && trim((string) $data['catatan_khusus']) !== ''
                ? trim((string) $data['catatan_khusus'])
                : null;

            $transaksi = Transaksi::create([
                'nomor_nota' => $this->generateNomorNota($now),
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'id_petugas' => $petugas->id_petugas,
                'id_layanan' => $layanan->id_layanan,
                'nomor_voucher' => $lockedVoucher?->nomor_voucher,
                'tanggal_penerimaan' => $now,
                'berat_atau_jumlah' => $beratAtauJumlah,
                'catatan_khusus' => $catatanKhusus,
                'harga_satuan_snapshot' => $hargaSatuanSnapshot,
                'nilai_voucher_snapshot' => $nilaiVoucherSnapshot,
                'total_kompensasi' => '0.00',
                'biaya_pembatalan' => '0.00',
                'total_harga' => $totalHarga,
                'status_pembayaran' => $statusPembayaran,
                'status_transaksi' => StatusTransaksi::AKTIF,
                'diambil_pada' => null,
            ]);

            $this->persistDetailAndInitialHistory($transaksi, $detailItems, $now);

            $this->pembayaranService->catatPembayaranAwal(
                $transaksi,
                $petugas,
                $nominalDp,
                $totalHarga,
                $now
            );

            $this->recordCreatedAuditLog(
                $transaksi,
                $petugas,
                $actor,
                $subtotalLayanan,
                $nominalDp,
                count($detailItems),
                $now
            );

            return $transaksi->load($this->detailRelations());
        });
    }

    /**
     * Serialize a Transaksi model into the TransaksiDetail contract shape (Phase 1 + Phase 2).
     *
     * @return array<string, mixed>
     */
    public function formatTransaksiDetail(Transaksi $transaksi): array
    {
        $transaksi->loadMissing($this->detailRelations());

        $subtotalLayanan = DecimalMoney::multiplyQuantity(
            (string) $transaksi->berat_atau_jumlah,
            (string) $transaksi->harga_satuan_snapshot
        );

        $totalDibayar = $this->pembayaranService->hitungTotalDibayar($transaksi);

        $sisaTagihan = DecimalMoney::maxZero(
            DecimalMoney::subtract((string) $transaksi->total_harga, $totalDibayar)
        );

        $tagihanDasar = $transaksi->status_transaksi === StatusTransaksi::DIBATALKAN
            ? (string) $transaksi->biaya_pembatalan
            : DecimalMoney::maxZero(
                DecimalMoney::subtract($subtotalLayanan, (string) $transaksi->nilai_voucher_snapshot)
            );

        $kelebihanBayarTunai = DecimalMoney::maxZero(
            DecimalMoney::subtract($totalDibayar, $tagihanDasar)
        );

        $totalKelebihanGantiRugi = '0.00';
        foreach ($transaksi->laporanKerusakanKehilangan as $laporan) {
            $totalKelebihanGantiRugi = DecimalMoney::add(
                $totalKelebihanGantiRugi,
                (string) $laporan->kelebihan_ganti_rugi
            );
        }

        $totalPengembalianPelanggan = DecimalMoney::add($kelebihanBayarTunai, $totalKelebihanGantiRugi);

        $pelanggan = $transaksi->pelanggan;
        $petugas = $transaksi->petugas;
        $layanan = $transaksi->layanan;
        $voucher = $transaksi->voucher;

        $latestRiwayat = $this->resolveLatestRiwayatStatus($transaksi);
        $tahapTerakhir = $latestRiwayat !== null
            ? $this->enumValue($latestRiwayat->tahap_status)
            : null;
        $tahapBerikutnya = $this->resolveNextProductionStage($transaksi, $layanan, $latestRiwayat);

        $isAktif = $transaksi->status_transaksi === StatusTransaksi::AKTIF;
        $bisaTimbangUlang = $isAktif
            && $layanan->metode_hitung === MetodeHitung::BERAT
            && $tahapTerakhir === TahapProduksi::DITERIMA->value;
        $bisaUbahLayanan = $isAktif
            && in_array($tahapTerakhir, [TahapProduksi::DITERIMA->value, TahapProduksi::DICUCI->value], true);
        $bisaBatalkan = $isAktif && $tahapTerakhir !== TahapProduksi::SELESAI->value;
        $perluBiayaPembatalan = $bisaBatalkan && in_array($tahapTerakhir, [
            TahapProduksi::DICUCI->value,
            TahapProduksi::DIKERINGKAN->value,
            TahapProduksi::DISETRIKA->value,
        ], true);
        $estimasiBiayaPembatalan = $perluBiayaPembatalan
            ? DecimalMoney::percentage($subtotalLayanan, 50)
            : '0.00';

        $totalPotongNota = max(1, (int) $transaksi->detailPakaian->sum('jumlah_potong'));
        $insidenPendingCount = $transaksi->laporanKerusakanKehilangan
            ->filter(fn (LaporanKerusakanKehilangan $laporan): bool => $laporan->id_petugas === null)
            ->count();

        $riwayatPengantaranItems = $transaksi->itemPengantaran
            ->sortBy('id_item_antar')
            ->values();

        $sedangDiantarKurir = $riwayatPengantaranItems->contains(
            fn (ItemPengantaran $item): bool => in_array(
                $item->status_terima_pelanggan,
                [StatusItemPengantaran::DIAMBIL, StatusItemPengantaran::DALAM_PERJALANAN],
                true
            )
        );

        $bisaPelunasan = DecimalMoney::gt($sisaTagihan, '0.00')
            && in_array($transaksi->status_transaksi, [
                StatusTransaksi::AKTIF,
                StatusTransaksi::SELESAI,
                StatusTransaksi::DIAMBIL,
                StatusTransaksi::DIBATALKAN,
            ], true);

        $hakBayarAkhir = DecimalMoney::eq($sisaTagihan, '0.00') || (bool) $pelanggan->boleh_bayar_akhir;
        $bisaSerahTerimaLoket = $transaksi->status_transaksi === StatusTransaksi::SELESAI
            && ! $sedangDiantarKurir
            && $hakBayarAkhir;

        $pengantaranAktifItem = $riwayatPengantaranItems->last(
            fn (ItemPengantaran $item): bool => in_array(
                $item->status_terima_pelanggan,
                [
                    StatusItemPengantaran::MENUNGGU,
                    StatusItemPengantaran::DIAMBIL,
                    StatusItemPengantaran::DALAM_PERJALANAN,
                ],
                true
            )
        );

        return [
            'nomor_nota' => $transaksi->nomor_nota,
            'tanggal_penerimaan' => $transaksi->tanggal_penerimaan?->toISOString(),
            'berat_atau_jumlah' => (string) $transaksi->berat_atau_jumlah,
            'catatan_khusus' => $transaksi->catatan_khusus,
            'harga_satuan_snapshot' => (string) $transaksi->harga_satuan_snapshot,
            'nilai_voucher_snapshot' => (string) $transaksi->nilai_voucher_snapshot,
            'total_kompensasi' => (string) $transaksi->total_kompensasi,
            'biaya_pembatalan' => (string) $transaksi->biaya_pembatalan,
            'subtotal_layanan' => $subtotalLayanan,
            'total_harga' => (string) $transaksi->total_harga,
            'total_dibayar' => $totalDibayar,
            'sisa_tagihan' => $sisaTagihan,
            'kelebihan_bayar_tunai' => $kelebihanBayarTunai,
            'total_kelebihan_ganti_rugi' => $totalKelebihanGantiRugi,
            'total_pengembalian_pelanggan' => $totalPengembalianPelanggan,
            'status_pembayaran' => $this->enumValue($transaksi->status_pembayaran),
            'status_transaksi' => $this->enumValue($transaksi->status_transaksi),
            'diambil_pada' => $transaksi->diambil_pada?->toISOString(),
            'tahap_produksi_terakhir' => $tahapTerakhir,
            'tahap_produksi_berikutnya' => $tahapBerikutnya,
            'bisa_timbang_ulang' => $bisaTimbangUlang,
            'bisa_ubah_layanan' => $bisaUbahLayanan,
            'bisa_batalkan' => $bisaBatalkan,
            'perlu_biaya_pembatalan' => $perluBiayaPembatalan,
            'estimasi_biaya_pembatalan' => $estimasiBiayaPembatalan,
            'insiden_pending_count' => $insidenPendingCount,
            'bisa_pelunasan' => $bisaPelunasan,
            'bisa_serah_terima_loket' => $bisaSerahTerimaLoket,
            'sedang_diantar_kurir' => $sedangDiantarKurir,
            'pengantaran_aktif' => $pengantaranAktifItem !== null
                ? $this->formatItemPengantaranSummary($pengantaranAktifItem)
                : null,
            'riwayat_pengantaran' => $riwayatPengantaranItems
                ->map(fn (ItemPengantaran $item): array => $this->formatItemPengantaranSummary($item))
                ->all(),
            'pelanggan' => [
                'id_pelanggan' => $pelanggan->id_pelanggan,
                'nama' => $pelanggan->nama,
                'no_telepon' => $pelanggan->no_telepon,
                'alamat' => $pelanggan->alamat,
                'boleh_bayar_akhir' => (bool) $pelanggan->boleh_bayar_akhir,
                'created_at' => $pelanggan->created_at?->toISOString(),
                'updated_at' => $pelanggan->updated_at?->toISOString(),
            ],
            'petugas' => [
                'id_petugas' => $petugas->id_petugas,
                'nama_petugas' => $petugas->nama_petugas,
            ],
            'layanan' => [
                'id_layanan' => $layanan->id_layanan,
                'nama_layanan' => $layanan->nama_layanan,
                'tingkat_kecepatan' => $this->enumValue($layanan->tingkat_kecepatan),
                'metode_hitung' => $this->enumValue($layanan->metode_hitung),
                'satuan' => $this->enumValue($layanan->satuan),
                'harga_satuan' => (string) $layanan->harga_satuan,
                'perlu_setrika' => (bool) $layanan->perlu_setrika,
                'is_active' => (bool) $layanan->is_active,
                'tahap_layanan' => $layanan->tahapLayanan
                    ->values()
                    ->map(fn (TahapLayanan $tahap): array => [
                        'id_tahap' => $tahap->id_tahap,
                        'id_layanan' => $tahap->id_layanan,
                        'nama_tahap' => $this->enumValue($tahap->nama_tahap),
                        'urutan' => (int) $tahap->urutan,
                    ])
                    ->all(),
            ],
            'voucher' => $voucher !== null ? [
                'nomor_voucher' => $voucher->nomor_voucher,
                'nilai' => (string) $voucher->nilai,
                'masa_berlaku' => $voucher->masa_berlaku->toDateString(),
                'status_penggunaan' => $this->enumValue($voucher->status_penggunaan),
                'effective_status' => (string) $voucher->effective_status,
                'digunakan_pada' => $voucher->digunakan_pada?->toISOString(),
            ] : null,
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
            'pembayaran' => $transaksi->pembayaran
                ->values()
                ->map(fn (Pembayaran $pembayaran): array => [
                    'id_pembayaran' => $pembayaran->id_pembayaran,
                    'nomor_nota' => $pembayaran->nomor_nota,
                    'id_petugas' => $pembayaran->id_petugas,
                    'tanggal_bayar' => $pembayaran->tanggal_bayar?->toISOString(),
                    'jenis_bayar' => $this->enumValue($pembayaran->jenis_bayar),
                    'nominal_bayar' => (string) $pembayaran->nominal_bayar,
                    'petugas' => $pembayaran->petugas !== null ? [
                        'id_petugas' => $pembayaran->petugas->id_petugas,
                        'nama_petugas' => $pembayaran->petugas->nama_petugas,
                    ] : null,
                ])
                ->all(),
            'riwayat_status_produksi' => $transaksi->riwayatStatusProduksi
                ->values()
                ->map(fn (RiwayatStatusProduksi $riwayat): array => [
                    'id_status_produksi' => $riwayat->id_status_produksi,
                    'nomor_nota' => $riwayat->nomor_nota,
                    'id_pegawai' => $riwayat->id_pegawai,
                    'tahap_status' => $this->enumValue($riwayat->tahap_status),
                    'waktu_update' => $riwayat->waktu_update?->toISOString(),
                    'catatan' => $riwayat->catatan,
                    'pegawai' => $riwayat->pegawai !== null ? [
                        'id_pegawai' => $riwayat->pegawai->id_pegawai,
                        'nama_pegawai' => $riwayat->pegawai->nama_pegawai,
                    ] : null,
                ])
                ->all(),
            'laporan_insiden' => $transaksi->laporanKerusakanKehilangan
                ->values()
                ->map(fn (LaporanKerusakanKehilangan $laporan): array => $this->formatLaporanInsiden(
                    $laporan,
                    $subtotalLayanan,
                    $totalPotongNota
                ))
                ->all(),
        ];
    }

    /**
     * @throws ValidationException
     */
    private function resolvePelanggan(mixed $idPelanggan): Pelanggan
    {
        $pelanggan = Pelanggan::find((int) $idPelanggan);

        if ($pelanggan === null) {
            throw ValidationException::withMessages([
                'id_pelanggan' => 'Pelanggan tidak ditemukan.',
            ]);
        }

        return $pelanggan;
    }

    /**
     * @throws ValidationException
     */
    private function resolveActiveLayanan(mixed $idLayanan): JenisLayanan
    {
        $layanan = JenisLayanan::find((int) $idLayanan);

        if ($layanan === null) {
            throw ValidationException::withMessages([
                'id_layanan' => 'Jenis layanan tidak ditemukan.',
            ]);
        }

        if (! $layanan->is_active) {
            throw ValidationException::withMessages([
                'id_layanan' => 'Jenis layanan yang dipilih sedang tidak aktif.',
            ]);
        }

        return $layanan;
    }

    /**
     * @return list<array{jenis_pakaian: string, jumlah_potong: int, kondisi_pakaian: string}>
     *
     * @throws ValidationException
     */
    private function validateDetailItems(mixed $rawItems): array
    {
        if (! is_array($rawItems) || count($rawItems) < 1) {
            throw ValidationException::withMessages([
                'detail_pakaian' => 'Minimal harus ada 1 rincian pakaian.',
            ]);
        }

        $validated = [];

        foreach (array_values($rawItems) as $index => $item) {
            if (! is_array($item)) {
                throw ValidationException::withMessages([
                    "detail_pakaian.{$index}" => 'Format rincian pakaian tidak valid.',
                ]);
            }

            $jenisPakaian = trim((string) ($item['jenis_pakaian'] ?? ''));
            $kondisiPakaian = trim((string) ($item['kondisi_pakaian'] ?? ''));
            $jumlahPotong = filter_var($item['jumlah_potong'] ?? null, FILTER_VALIDATE_INT);

            if ($jenisPakaian === '') {
                throw ValidationException::withMessages([
                    "detail_pakaian.{$index}.jenis_pakaian" => 'Jenis pakaian wajib diisi.',
                ]);
            }

            if ($jumlahPotong === false || $jumlahPotong < 1) {
                throw ValidationException::withMessages([
                    "detail_pakaian.{$index}.jumlah_potong" => 'Jumlah potong minimal 1.',
                ]);
            }

            if ($kondisiPakaian === '') {
                throw ValidationException::withMessages([
                    "detail_pakaian.{$index}.kondisi_pakaian" => 'Kondisi pakaian wajib diisi.',
                ]);
            }

            $validated[] = [
                'jenis_pakaian' => $jenisPakaian,
                'jumlah_potong' => $jumlahPotong,
                'kondisi_pakaian' => $kondisiPakaian,
            ];
        }

        return $validated;
    }

    /**
     * Validate and normalize transaction quantity/weight against the service's counting method.
     *
     * @throws ValidationException
     */
    public function validateQuantityForLayanan(
        mixed $rawQuantity,
        JenisLayanan $layanan,
        string $field = 'berat_atau_jumlah'
    ): string {
        $beratAtauJumlah = $this->normalizeDecimal($rawQuantity, $field);
        $quantityCents = DecimalMoney::toCents($beratAtauJumlah);

        if ($quantityCents <= 0) {
            throw ValidationException::withMessages([
                $field => 'Berat atau jumlah harus lebih besar dari 0.',
            ]);
        }

        if (DecimalMoney::gt($beratAtauJumlah, '99999.99')) {
            throw ValidationException::withMessages([
                $field => 'Berat atau jumlah maksimal 99999.99.',
            ]);
        }

        if ($layanan->metode_hitung === MetodeHitung::JUMLAH && ($quantityCents < 100 || ($quantityCents % 100) !== 0)) {
            throw ValidationException::withMessages([
                $field => 'Kuantitas untuk layanan metode JUMLAH (pcs) wajib berupa bilangan bulat minimal 1.',
            ]);
        }

        return $beratAtauJumlah;
    }

    /**
     * @param  list<array{jenis_pakaian: string, jumlah_potong: int, kondisi_pakaian: string}>  $detailItems
     */
    private function persistDetailAndInitialHistory(Transaksi $transaksi, array $detailItems, CarbonInterface $now): void
    {
        foreach ($detailItems as $item) {
            DetailPakaian::create([
                'nomor_nota' => $transaksi->nomor_nota,
                'jenis_pakaian' => $item['jenis_pakaian'],
                'jumlah_potong' => $item['jumlah_potong'],
                'kondisi_pakaian' => $item['kondisi_pakaian'],
            ]);
        }

        RiwayatStatusProduksi::create([
            'nomor_nota' => $transaksi->nomor_nota,
            'id_pegawai' => null,
            'tahap_status' => TahapProduksi::DITERIMA,
            'waktu_update' => $now,
            'catatan' => 'Transaksi diterima di loket kasir.',
        ]);
    }

    private function recordCreatedAuditLog(
        Transaksi $transaksi,
        Petugas $petugas,
        ?User $actor,
        string $subtotalLayanan,
        string $nominalDp,
        int $detailCount,
        CarbonInterface $now
    ): void {
        AuditLog::create([
            'user_id' => $actor?->id ?? $petugas->user_id,
            'actor_role' => $actor !== null
                ? $this->enumValue($actor->role)
                : UserRole::PETUGAS->value,
            'action' => 'TRANSAKSI_CREATED',
            'subject_type' => Transaksi::class,
            'subject_id' => $transaksi->nomor_nota,
            'payload_before' => null,
            'payload_after' => [
                'nomor_nota' => $transaksi->nomor_nota,
                'id_pelanggan' => $transaksi->id_pelanggan,
                'id_petugas' => $transaksi->id_petugas,
                'id_layanan' => $transaksi->id_layanan,
                'nomor_voucher' => $transaksi->nomor_voucher,
                'berat_atau_jumlah' => (string) $transaksi->berat_atau_jumlah,
                'harga_satuan_snapshot' => (string) $transaksi->harga_satuan_snapshot,
                'nilai_voucher_snapshot' => (string) $transaksi->nilai_voucher_snapshot,
                'subtotal_layanan' => $subtotalLayanan,
                'total_harga' => (string) $transaksi->total_harga,
                'nominal_dp' => $nominalDp,
                'status_pembayaran' => $this->enumValue($transaksi->status_pembayaran),
                'status_transaksi' => $this->enumValue($transaksi->status_transaksi),
                'detail_pakaian_count' => $detailCount,
            ],
            'created_at' => $now,
        ]);
    }

    /**
     * Eager-load relations required for full TransaksiDetail serialization without N+1 queries.
     *
     * @return array<int|string, mixed>
     */
    public function detailRelations(): array
    {
        return [
            'pelanggan',
            'petugas',
            'layanan.tahapLayanan' => fn ($query) => $query->orderBy('urutan'),
            'voucher',
            'detailPakaian' => fn ($query) => $query->orderBy('id_detail'),
            'pembayaran' => fn ($query) => $query->orderBy('tanggal_bayar')->orderBy('id_pembayaran'),
            'pembayaran.petugas',
            'riwayatStatusProduksi',
            'riwayatStatusProduksi.pegawai',
            'laporanKerusakanKehilangan' => fn ($query) => $query->orderBy('id_laporan'),
            'laporanKerusakanKehilangan.detailPakaian',
            'laporanKerusakanKehilangan.petugas',
            'laporanKerusakanKehilangan.pegawaiPelapor',
            'itemPengantaran' => fn ($query) => $query->orderBy('id_item_antar'),
            'itemPengantaran.pengantaran.petugasPengantaran',
        ];
    }

    /**
     * Resolve the latest RiwayatStatusProduksi record ordered by waktu_update and id_status_produksi.
     */
    public function resolveLatestRiwayatStatus(Transaksi $transaksi): ?RiwayatStatusProduksi
    {
        $records = $transaksi->relationLoaded('riwayatStatusProduksi')
            ? $transaksi->riwayatStatusProduksi
            : $transaksi->riwayatStatusProduksi()->get();

        if ($records->isEmpty()) {
            return null;
        }

        return $records
            ->sort(function (RiwayatStatusProduksi $left, RiwayatStatusProduksi $right): int {
                $timeCompare = ($left->waktu_update?->getTimestamp() ?? 0)
                    <=> ($right->waktu_update?->getTimestamp() ?? 0);

                if ($timeCompare !== 0) {
                    return $timeCompare;
                }

                return $left->id_status_produksi <=> $right->id_status_produksi;
            })
            ->last();
    }

    /**
     * Resolve ordered production stage enums for a service.
     *
     * @return list<TahapProduksi>
     */
    public function resolveOrderedTahapStages(JenisLayanan $layanan): array
    {
        $layanan->loadMissing(['tahapLayanan' => fn ($query) => $query->orderBy('urutan')]);

        $stages = $layanan->tahapLayanan
            ->sortBy('urutan')
            ->values()
            ->map(fn (TahapLayanan $tahap): TahapProduksi => $tahap->nama_tahap)
            ->all();

        return $stages !== []
            ? $stages
            : TahapProduksi::canonicalSequence((bool) $layanan->perlu_setrika);
    }

    private function resolveNextProductionStage(
        Transaksi $transaksi,
        JenisLayanan $layanan,
        ?RiwayatStatusProduksi $latestRiwayat
    ): ?string {
        if ($transaksi->status_transaksi !== StatusTransaksi::AKTIF || $latestRiwayat === null) {
            return null;
        }

        $stages = $this->resolveOrderedTahapStages($layanan);
        $currentIndex = array_search($latestRiwayat->tahap_status, $stages, true);

        if ($currentIndex === false || ! isset($stages[$currentIndex + 1])) {
            return null;
        }

        return $stages[$currentIndex + 1]->value;
    }

    /**
     * @return array<string, mixed>
     */
    public function formatLaporanInsiden(
        LaporanKerusakanKehilangan $laporan,
        string $subtotalLayanan,
        int $totalPotongNota
    ): array {
        $detail = $laporan->detailPakaian;
        $jenisInsiden = $laporan->jenis_insiden instanceof JenisInsiden
            ? $laporan->jenis_insiden
            : JenisInsiden::from((string) $laporan->jenis_insiden);

        return [
            'id_laporan' => $laporan->id_laporan,
            'nomor_nota' => $laporan->nomor_nota,
            'id_detail' => $laporan->id_detail,
            'id_petugas' => $laporan->id_petugas,
            'id_pegawai_pelapor' => $laporan->id_pegawai_pelapor,
            'jenis_insiden' => $jenisInsiden->value,
            'keterangan' => $laporan->keterangan,
            'nilai_kompensasi' => (string) $laporan->nilai_kompensasi,
            'kelebihan_ganti_rugi' => (string) $laporan->kelebihan_ganti_rugi,
            'estimasi_kompensasi' => KompensasiService::estimateCompensation(
                $subtotalLayanan,
                $totalPotongNota,
                $detail,
                $jenisInsiden
            ),
            'status_konfirmasi' => $laporan->id_petugas !== null ? 'TERKONFIRMASI' : 'MENUNGGU_KONFIRMASI',
            'created_at' => $laporan->created_at?->toISOString(),
            'updated_at' => $laporan->updated_at?->toISOString(),
            'detail_pakaian' => $detail !== null ? [
                'id_detail' => $detail->id_detail,
                'nomor_nota' => $detail->nomor_nota,
                'jenis_pakaian' => $detail->jenis_pakaian,
                'jumlah_potong' => (int) $detail->jumlah_potong,
                'kondisi_pakaian' => $detail->kondisi_pakaian,
            ] : null,
            'petugas' => $laporan->petugas !== null ? [
                'id_petugas' => $laporan->petugas->id_petugas,
                'nama_petugas' => $laporan->petugas->nama_petugas,
            ] : null,
            'pegawai_pelapor' => $laporan->pegawaiPelapor !== null ? [
                'id_pegawai' => $laporan->pegawaiPelapor->id_pegawai,
                'nama_pegawai' => $laporan->pegawaiPelapor->nama_pegawai,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatItemPengantaranSummary(ItemPengantaran $item): array
    {
        $pengantaran = $item->pengantaran;

        return [
            'id_item_antar' => $item->id_item_antar,
            'id_pengantaran' => $item->id_pengantaran,
            'nomor_nota' => $item->nomor_nota,
            'status_terima_pelanggan' => $this->enumValue($item->status_terima_pelanggan),
            'alasan_gagal' => $item->alasan_gagal,
            'waktu_update' => $item->waktu_update?->toISOString(),
            'pengantaran' => $pengantaran !== null ? [
                'id_pengantaran' => $pengantaran->id_pengantaran,
                'id_petugas_antar' => $pengantaran->id_petugas_antar,
                'tanggal_pengantaran' => $pengantaran->tanggal_pengantaran instanceof CarbonInterface
                    ? $pengantaran->tanggal_pengantaran->toDateString()
                    : (string) $pengantaran->tanggal_pengantaran,
                'status_pengantaran' => $this->enumValue($pengantaran->status_pengantaran),
                'nama_petugas_antar' => $pengantaran->petugasPengantaran?->nama_petugas_antar ?? '',
            ] : null,
        ];
    }

    /**
     * @throws ValidationException
     */
    private function normalizeDecimal(mixed $value, string $field): string
    {
        try {
            return DecimalMoney::toDecimalString(DecimalMoney::toCents((string) $value));
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages([
                $field => 'Format angka desimal tidak valid.',
            ]);
        }
    }

    private function enumValue(mixed $value): string
    {
        return $value instanceof BackedEnum ? (string) $value->value : (string) $value;
    }
}
