<?php

namespace App\Services;

use App\Models\Transaksi;
use App\Support\DecimalMoney;

class SerahTerimaService
{
    public function __construct(
        private readonly PembayaranService $pembayaranService
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
}
