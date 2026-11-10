<?php

namespace App\Services;

use App\Enums\StatusTransaksi;
use App\Enums\TahapProduksi;
use App\Enums\UserRole;
use App\Enums\VoucherStatus;
use App\Models\AuditLog;
use App\Models\JenisLayanan;
use App\Models\Petugas;
use App\Models\Transaksi;
use App\Models\User;
use App\Support\DecimalMoney;
use BackedEnum;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class TransaksiAdjustmentService
{
    public function __construct(
        private readonly TransaksiService $transaksiService,
        private readonly PembayaranService $pembayaranService,
        private readonly VoucherService $voucherService
    ) {}

    /**
     * Change service on an AKTIF transaction at DITERIMA or DICUCI, updating KK-09 tariff snapshot and reconciling balance (KK-02).
     *
     * @param  array{
     *     id_layanan_baru: int|string,
     *     berat_atau_jumlah_baru?: string|int|float|null,
     *     alasan_perubahan: string
     * }  $data
     *
     * @throws ValidationException
     */
    public function ubahLayanan(
        string $nomorNota,
        Petugas $petugas,
        array $data,
        ?User $actor = null
    ): Transaksi {
        return DB::transaction(function () use ($nomorNota, $petugas, $data, $actor): Transaksi {
            $now = now('Asia/Jakarta');
            $transaksi = $this->lockTransaksiForAdjustment($nomorNota);

            if ($transaksi->status_transaksi !== StatusTransaksi::AKTIF) {
                throw ValidationException::withMessages([
                    'id_layanan_baru' => 'Perubahan layanan hanya dapat dilakukan pada transaksi berstatus AKTIF.',
                ]);
            }

            $tahapTerakhir = $this->transaksiService->resolveLatestRiwayatStatus($transaksi)?->tahap_status;

            if (! in_array($tahapTerakhir, [TahapProduksi::DITERIMA, TahapProduksi::DICUCI], true)) {
                throw ValidationException::withMessages([
                    'id_layanan_baru' => 'Perubahan layanan hanya diizinkan saat tahap produksi masih DITERIMA atau DICUCI.',
                ]);
            }

            $alasan = $this->resolveValidatedReason(
                $data['alasan_perubahan'] ?? '',
                'alasan_perubahan',
                'Alasan perubahan layanan'
            );

            $layananLama = $transaksi->layanan;
            $layananBaru = $this->resolveTargetLayananForChange(
                $transaksi,
                $data['id_layanan_baru'] ?? null,
                $tahapTerakhir
            );

            $qtyLama = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $transaksi->berat_atau_jumlah)
            );
            $qtyBaru = $this->resolveQuantityForServiceChange(
                $qtyLama,
                $layananLama,
                $layananBaru,
                $data['berat_atau_jumlah_baru'] ?? null
            );

            $hargaSnapshotLama = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $transaksi->harga_satuan_snapshot)
            );
            $subtotalLama = DecimalMoney::multiplyQuantity($qtyLama, $hargaSnapshotLama);
            $totalHargaLama = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $transaksi->total_harga)
            );
            $statusPembayaranLama = $transaksi->status_pembayaran;

            $hargaSnapshotBaru = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $layananBaru->harga_satuan)
            );
            $subtotalBaru = DecimalMoney::multiplyQuantity($qtyBaru, $hargaSnapshotBaru);
            $tagihanDasarBaru = DecimalMoney::maxZero(
                DecimalMoney::subtract($subtotalBaru, (string) $transaksi->nilai_voucher_snapshot)
            );
            $totalHargaBaru = DecimalMoney::maxZero(
                DecimalMoney::subtract($tagihanDasarBaru, (string) $transaksi->total_kompensasi)
            );
            $selisihTagihan = DecimalMoney::subtract($totalHargaBaru, $totalHargaLama);

            $totalDibayar = $this->pembayaranService->hitungTotalDibayar($transaksi);
            $statusPembayaranBaru = $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                $statusPembayaranLama,
                $totalHargaBaru,
                $totalDibayar
            );

            $before = [
                'id_layanan' => $layananLama->id_layanan,
                'nama_layanan' => $layananLama->nama_layanan,
                'metode_hitung' => $this->enumValue($layananLama->metode_hitung),
                'berat_atau_jumlah' => $qtyLama,
                'harga_satuan_snapshot' => $hargaSnapshotLama,
                'subtotal_layanan' => $subtotalLama,
                'total_harga' => $totalHargaLama,
                'status_pembayaran' => $this->enumValue($statusPembayaranLama),
            ];

            $transaksi->update([
                'id_layanan' => $layananBaru->id_layanan,
                'berat_atau_jumlah' => $qtyBaru,
                'harga_satuan_snapshot' => $hargaSnapshotBaru,
                'total_harga' => $totalHargaBaru,
                'status_pembayaran' => $statusPembayaranBaru,
            ]);

            $this->recordAuditLog(
                $transaksi,
                $petugas,
                $actor,
                'LAYANAN_CHANGED',
                $before,
                [
                    'id_layanan' => $layananBaru->id_layanan,
                    'nama_layanan' => $layananBaru->nama_layanan,
                    'metode_hitung' => $this->enumValue($layananBaru->metode_hitung),
                    'berat_atau_jumlah' => $qtyBaru,
                    'harga_satuan_snapshot' => $hargaSnapshotBaru,
                    'subtotal_layanan' => $subtotalBaru,
                    'total_harga' => $totalHargaBaru,
                    'selisih_tagihan' => $selisihTagihan,
                    'total_dibayar' => $totalDibayar,
                    'status_pembayaran' => $statusPembayaranBaru->value,
                    'tahap_produksi_terakhir' => $tahapTerakhir->value,
                    'alasan_perubahan' => $alasan,
                    'id_petugas' => $petugas->id_petugas,
                ],
                $now
            );

            return $transaksi->refresh()->load($this->transaksiService->detailRelations());
        });
    }

    /**
     * Cancel a transaction based on its latest production stage (KK-08).
     *
     * Branch A (DITERIMA): free cancellation + atomic voucher release (clearing transaksi.nomor_voucher for UNIQUE safety).
     * Branch B (DICUCI/DIKERINGKAN/DISETRIKA): rejects free cancellation, applies 50% default or validated fee, keeps voucher used.
     *
     * @param  array{
     *     alasan_pembatalan: string,
     *     biaya_pembatalan?: string|int|float|null
     * }  $data
     *
     * @throws ValidationException
     */
    public function batalkanTransaksi(
        string $nomorNota,
        Petugas $petugas,
        array $data,
        ?User $actor = null
    ): Transaksi {
        return DB::transaction(function () use ($nomorNota, $petugas, $data, $actor): Transaksi {
            $now = now('Asia/Jakarta');
            $transaksi = $this->lockTransaksiForAdjustment($nomorNota);

            if ($transaksi->status_transaksi !== StatusTransaksi::AKTIF) {
                throw ValidationException::withMessages([
                    'alasan_pembatalan' => 'Pembatalan hanya dapat dilakukan pada transaksi berstatus AKTIF.',
                ]);
            }

            $tahapTerakhir = $this->transaksiService->resolveLatestRiwayatStatus($transaksi)?->tahap_status;

            if ($tahapTerakhir === null || $tahapTerakhir === TahapProduksi::SELESAI) {
                throw ValidationException::withMessages([
                    'alasan_pembatalan' => 'Transaksi yang sudah memasuki tahap SELESAI tidak dapat dibatalkan.',
                ]);
            }

            $alasan = $this->resolveValidatedReason(
                $data['alasan_pembatalan'] ?? '',
                'alasan_pembatalan',
                'Alasan pembatalan'
            );

            $biayaInput = $this->parseOptionalCancellationFee($data['biaya_pembatalan'] ?? null);

            $subtotalLayanan = DecimalMoney::multiplyQuantity(
                (string) $transaksi->berat_atau_jumlah,
                (string) $transaksi->harga_satuan_snapshot
            );
            $totalKompensasi = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $transaksi->total_kompensasi)
            );
            $totalDibayar = $this->pembayaranService->hitungTotalDibayar($transaksi);
            $statusPembayaranLama = $transaksi->status_pembayaran;
            $voucherAsal = $transaksi->nomor_voucher;
            $nilaiVoucherSnapshotLama = DecimalMoney::toDecimalString(
                DecimalMoney::toCents((string) $transaksi->nilai_voucher_snapshot)
            );

            $before = [
                'status_transaksi' => $this->enumValue($transaksi->status_transaksi),
                'status_pembayaran' => $this->enumValue($statusPembayaranLama),
                'tahap_produksi_terakhir' => $tahapTerakhir->value,
                'nomor_voucher' => $voucherAsal,
                'nilai_voucher_snapshot' => $nilaiVoucherSnapshotLama,
                'biaya_pembatalan' => (string) $transaksi->biaya_pembatalan,
                'total_harga' => (string) $transaksi->total_harga,
            ];

            $isDiterima = $tahapTerakhir === TahapProduksi::DITERIMA;
            $voucherDilepas = false;
            $voucherStatusSesudah = $voucherAsal !== null ? VoucherStatus::SUDAH_DIGUNAKAN->value : null;

            if ($isDiterima) {
                if ($biayaInput !== null && DecimalMoney::gt($biayaInput, '0.00')) {
                    throw ValidationException::withMessages([
                        'biaya_pembatalan' => 'Pembatalan pada tahap DITERIMA tidak dikenakan biaya pembatalan (wajib 0.00).',
                    ]);
                }

                $biayaPembatalan = '0.00';
                $totalHargaBaru = '0.00';
                $statusPembayaranBaru = $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                    $statusPembayaranLama,
                    $totalHargaBaru,
                    $totalDibayar
                );

                if ($voucherAsal !== null) {
                    $releasedVoucher = $this->voucherService->lepaskan($voucherAsal, $now);
                    $voucherDilepas = true;
                    $voucherStatusSesudah = $releasedVoucher !== null
                        ? $this->enumValue($releasedVoucher->status_penggunaan)
                        : null;
                }

                $transaksi->update([
                    'nomor_voucher' => null,
                    'nilai_voucher_snapshot' => '0.00',
                    'biaya_pembatalan' => $biayaPembatalan,
                    'total_harga' => $totalHargaBaru,
                    'status_pembayaran' => $statusPembayaranBaru,
                    'status_transaksi' => StatusTransaksi::DIBATALKAN,
                ]);
            } else {
                $biayaPembatalan = $this->resolvePostWashCancellationFee($biayaInput, $subtotalLayanan);
                $totalHargaBaru = DecimalMoney::maxZero(
                    DecimalMoney::subtract($biayaPembatalan, $totalKompensasi)
                );
                $statusPembayaranBaru = $this->pembayaranService->resolveStatusPembayaranSetelahPenyesuaian(
                    $statusPembayaranLama,
                    $totalHargaBaru,
                    $totalDibayar
                );

                $transaksi->update([
                    'biaya_pembatalan' => $biayaPembatalan,
                    'total_harga' => $totalHargaBaru,
                    'status_pembayaran' => $statusPembayaranBaru,
                    'status_transaksi' => StatusTransaksi::DIBATALKAN,
                ]);
            }

            $this->recordAuditLog(
                $transaksi,
                $petugas,
                $actor,
                'TRANSAKSI_CANCELLED',
                $before,
                [
                    'status_transaksi' => StatusTransaksi::DIBATALKAN->value,
                    'status_pembayaran' => $statusPembayaranBaru->value,
                    'tahap_produksi_terakhir' => $tahapTerakhir->value,
                    'cabang_pembatalan' => $isDiterima ? 'DITERIMA_GRATIS' : 'PROSES_BERJALAN',
                    'voucher_dilepas' => $voucherDilepas,
                    'voucher_asal' => $voucherAsal,
                    'voucher_status_sesudah' => $voucherStatusSesudah,
                    'nomor_voucher' => $transaksi->nomor_voucher,
                    'nilai_voucher_snapshot' => (string) $transaksi->nilai_voucher_snapshot,
                    'biaya_pembatalan' => $biayaPembatalan,
                    'total_harga' => $totalHargaBaru,
                    'total_dibayar' => $totalDibayar,
                    'alasan_pembatalan' => $alasan,
                    'id_petugas' => $petugas->id_petugas,
                ],
                $now
            );

            return $transaksi->refresh()->load($this->transaksiService->detailRelations());
        });
    }

    private function lockTransaksiForAdjustment(string $nomorNota): Transaksi
    {
        $transaksi = Transaksi::query()
            ->where('nomor_nota', $nomorNota)
            ->lockForUpdate()
            ->firstOrFail();

        $transaksi->load([
            'layanan.tahapLayanan' => fn ($query) => $query->orderBy('urutan'),
            'riwayatStatusProduksi',
            'pembayaran',
            'voucher',
        ]);

        return $transaksi;
    }

    /**
     * @throws ValidationException
     */
    private function resolveTargetLayananForChange(
        Transaksi $transaksi,
        mixed $rawIdLayananBaru,
        TahapProduksi $tahapTerakhir
    ): JenisLayanan {
        $layananBaru = JenisLayanan::query()
            ->with(['tahapLayanan' => fn ($query) => $query->orderBy('urutan')])
            ->find((int) ($rawIdLayananBaru ?? 0));

        if ($layananBaru === null) {
            throw ValidationException::withMessages([
                'id_layanan_baru' => 'Jenis layanan tujuan tidak ditemukan.',
            ]);
        }

        if (! $layananBaru->is_active) {
            throw ValidationException::withMessages([
                'id_layanan_baru' => 'Jenis layanan tujuan sedang tidak aktif.',
            ]);
        }

        if ($layananBaru->id_layanan === $transaksi->id_layanan) {
            throw ValidationException::withMessages([
                'id_layanan_baru' => 'Jenis layanan tujuan harus berbeda dari layanan saat ini.',
            ]);
        }

        $targetStages = $this->transaksiService->resolveOrderedTahapStages($layananBaru);
        if (! in_array($tahapTerakhir, $targetStages, true)) {
            throw ValidationException::withMessages([
                'id_layanan_baru' => "Tahap produksi saat ini ({$tahapTerakhir->value}) tidak tersedia pada konfigurasi tahapan layanan tujuan.",
            ]);
        }

        return $layananBaru;
    }

    /**
     * @throws ValidationException
     */
    private function resolveQuantityForServiceChange(
        string $currentQty,
        JenisLayanan $layananLama,
        JenisLayanan $layananBaru,
        mixed $rawQuantityBaru
    ): string {
        $hasQuantityBaru = $rawQuantityBaru !== null && trim((string) $rawQuantityBaru) !== '';

        if ($layananBaru->metode_hitung !== $layananLama->metode_hitung && ! $hasQuantityBaru) {
            throw ValidationException::withMessages([
                'berat_atau_jumlah_baru' => 'Berat atau jumlah baru wajib diisi saat berpindah metode hitung (BERAT <-> JUMLAH).',
            ]);
        }

        return $this->transaksiService->validateQuantityForLayanan(
            $hasQuantityBaru ? $rawQuantityBaru : $currentQty,
            $layananBaru,
            'berat_atau_jumlah_baru'
        );
    }

    /**
     * @throws ValidationException
     */
    private function parseOptionalCancellationFee(mixed $rawBiaya): ?string
    {
        if ($rawBiaya === null || trim((string) $rawBiaya) === '') {
            return null;
        }

        $biaya = $this->normalizeMoney((string) $rawBiaya, 'biaya_pembatalan');

        if (DecimalMoney::lt($biaya, '0.00')) {
            throw ValidationException::withMessages([
                'biaya_pembatalan' => 'Biaya pembatalan tidak boleh bernilai negatif.',
            ]);
        }

        return $biaya;
    }

    /**
     * @throws ValidationException
     */
    private function resolvePostWashCancellationFee(?string $biayaInput, string $subtotalLayanan): string
    {
        if ($biayaInput !== null) {
            if (DecimalMoney::lte($biayaInput, '0.00')) {
                throw ValidationException::withMessages([
                    'biaya_pembatalan' => 'Pembatalan setelah proses pencucian dimulai tidak boleh gratis (biaya pembatalan wajib lebih dari 0).',
                ]);
            }

            if (DecimalMoney::gt($biayaInput, $subtotalLayanan)) {
                throw ValidationException::withMessages([
                    'biaya_pembatalan' => 'Biaya pembatalan tidak boleh melebihi subtotal layanan.',
                ]);
            }

            return $biayaInput;
        }

        $defaultFee = DecimalMoney::percentage($subtotalLayanan, 50);

        if (DecimalMoney::lte($defaultFee, '0.00')) {
            throw ValidationException::withMessages([
                'biaya_pembatalan' => 'Biaya pembatalan setelah pencucian harus lebih besar dari 0.',
            ]);
        }

        return $defaultFee;
    }

    /**
     * @throws ValidationException
     */
    private function resolveValidatedReason(mixed $rawReason, string $field, string $label): string
    {
        $reason = trim((string) ($rawReason ?? ''));
        $length = mb_strlen($reason);

        if ($length < 3 || $length > 500) {
            throw ValidationException::withMessages([
                $field => "{$label} wajib diisi antara 3 hingga 500 karakter.",
            ]);
        }

        return $reason;
    }

    /**
     * @throws ValidationException
     */
    private function normalizeMoney(string $amount, string $field): string
    {
        try {
            return DecimalMoney::toDecimalString(DecimalMoney::toCents($amount));
        } catch (InvalidArgumentException) {
            throw ValidationException::withMessages([
                $field => 'Format nominal uang tidak valid.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    private function recordAuditLog(
        Transaksi $transaksi,
        Petugas $petugas,
        ?User $actor,
        string $action,
        array $before,
        array $after,
        CarbonInterface $now
    ): void {
        AuditLog::create([
            'user_id' => $actor?->id ?? $petugas->user_id,
            'actor_role' => $actor !== null
                ? $this->enumValue($actor->role)
                : UserRole::PETUGAS->value,
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
