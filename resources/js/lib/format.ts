import type {
    EligibleInsidenTransaksiOption,
    JenisInsiden,
    StatusKonfirmasiInsiden,
    StatusPembayaran,
    TahapProduksiCode,
    TransaksiDetail,
} from '@/types';

const SCALE = 100;

/**
 * Parse a decimal string or number (up to 2 decimal places) into integer cents
 * without IEEE-754 floating-point drift. Returns 0 when input is empty or invalid.
 */
export function parseDecimalToCents(value: string | number | null | undefined): number {
    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.round(value * SCALE);
    }

    const trimmed = value.trim().replaceAll(',', '.');
    if (trimmed === '') {
        return 0;
    }

    const match = /^([+-])?(\d+)(?:\.(\d*))?$/.exec(trimmed);
    if (!match) {
        return 0;
    }

    const sign = match[1] === '-' ? -1 : 1;
    const whole = Number.parseInt(match[2], 10);
    const rawFrac = match[3] ?? '';
    const fracPadded = rawFrac.slice(0, 2).padEnd(2, '0');
    let frac = Number.parseInt(fracPadded, 10);

    // Half-up round if more than 2 fractional digits are typed temporarily
    if (rawFrac.length > 2 && Number.parseInt(rawFrac[2], 10) >= 5) {
        frac += 1;
    }

    const cents = whole * SCALE + frac;
    return cents === 0 ? 0 : sign * cents;
}

/**
 * Format integer cents into a fixed 2-decimal string suitable for backend decimal inputs.
 */
export function centsToDecimalString(cents: number): string {
    const rounded = Math.round(cents);
    if (rounded === 0) {
        return '0.00';
    }

    const sign = rounded < 0 ? '-' : '';
    const abs = Math.abs(rounded);
    const whole = Math.floor(abs / SCALE);
    const fraction = abs % SCALE;

    return `${sign}${whole}.${String(fraction).padStart(2, '0')}`;
}

/**
 * Format a numeric/decimal value as Indonesian Rupiah (e.g. "Rp 12.500" or "Rp 12.500,50").
 */
export function formatRupiah(value: string | number | null | undefined): string {
    const cents = parseDecimalToCents(value);
    const isNegative = cents < 0;
    const absCents = Math.abs(cents);
    const whole = Math.floor(absCents / SCALE);
    const fraction = absCents % SCALE;

    const wholeFormatted = new Intl.NumberFormat('id-ID').format(whole);
    const formatted =
        fraction === 0
            ? `Rp ${wholeFormatted}`
            : `Rp ${wholeFormatted},${String(fraction).padStart(2, '0')}`;

    return isNegative ? `-${formatted}` : formatted;
}

const BULAN_ID = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
] as const;

/**
 * Format ISO timestamp or YYYY-MM-DD date string into readable Asia/Jakarta Indonesian date.
 */
export function formatTanggal(
    iso: string | null | undefined,
    options: { withTime?: boolean } = {},
): string {
    if (!iso) {
        return '—';
    }

    const trimmed = iso.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

    if (dateOnlyMatch && !options.withTime) {
        const year = Number.parseInt(dateOnlyMatch[1], 10);
        const monthIdx = Number.parseInt(dateOnlyMatch[2], 10) - 1;
        const day = Number.parseInt(dateOnlyMatch[3], 10);

        if (monthIdx >= 0 && monthIdx < BULAN_ID.length) {
            return `${day} ${BULAN_ID[monthIdx]} ${year}`;
        }
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return trimmed;
    }

    const dateFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    if (!options.withTime) {
        return dateFormatter.format(parsed);
    }

    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

    return `${dateFormatter.format(parsed)}, ${timeFormatter.format(parsed)} WIB`;
}

/**
 * Multiply a 2-decimal quantity by a 2-decimal unit price in integer cents (matching DecimalMoney::multiplyQuantity).
 */
export function calculateMultiplyQuantityCents(
    quantity: string | number,
    unitPrice: string | number,
): number {
    const qtyCents = Math.max(0, parseDecimalToCents(quantity));
    const priceCents = Math.max(0, parseDecimalToCents(unitPrice));

    const qtyWhole = Math.floor(qtyCents / SCALE);
    const qtyFrac = qtyCents % SCALE;
    const wholeCents = qtyWhole * priceCents;
    const fracCents = Math.floor((qtyFrac * priceCents + 50) / SCALE);

    return wholeCents + fracCents;
}

/**
 * Calculate a non-negative integer percentage in integer cents (matching DecimalMoney::percentage).
 */
export function calculatePercentageCents(
    amount: string | number,
    percent: number,
): number {
    const amountCents = Math.max(0, parseDecimalToCents(amount));
    const normalizedPercent = Math.max(0, Math.trunc(percent));

    if (amountCents === 0 || normalizedPercent === 0) {
        return 0;
    }

    return Math.floor((amountCents * normalizedPercent + 50) / SCALE);
}

export interface PreviewTotalsResult {
    subtotalCents: number;
    voucherCents: number;
    totalCents: number;
    dpCents: number;
    sisaCents: number;
    subtotalDecimal: string;
    voucherDecimal: string;
    totalDecimal: string;
    dpDecimal: string;
    sisaDecimal: string;
    isOverpaid: boolean;
    previewStatus: StatusPembayaran;
}

/**
 * Calculate live cashier preview totals using integer-scaled cents (matching App\Support\DecimalMoney).
 * Official final amounts are always computed and persisted by the Laravel backend service layer.
 */
export function calculatePreviewTotals(params: {
    quantity: string | number;
    unitPrice: string | number;
    voucherDiscount?: string | number;
    nominalDp?: string | number;
}): PreviewTotalsResult {
    const subtotalCents = calculateMultiplyQuantityCents(
        params.quantity,
        params.unitPrice,
    );

    const voucherCents = Math.max(0, parseDecimalToCents(params.voucherDiscount ?? '0'));
    const totalCents = Math.max(0, subtotalCents - voucherCents);
    const dpCents = Math.max(0, parseDecimalToCents(params.nominalDp ?? '0'));
    const isOverpaid = dpCents > totalCents;
    const sisaCents = Math.max(0, totalCents - dpCents);

    let previewStatus: StatusPembayaran = 'BELUM_BAYAR';
    if (totalCents === 0 || dpCents >= totalCents) {
        previewStatus = 'LUNAS';
    } else if (dpCents > 0) {
        previewStatus = 'DP';
    }

    return {
        subtotalCents,
        voucherCents,
        totalCents,
        dpCents,
        sisaCents,
        subtotalDecimal: centsToDecimalString(subtotalCents),
        voucherDecimal: centsToDecimalString(voucherCents),
        totalDecimal: centsToDecimalString(totalCents),
        dpDecimal: centsToDecimalString(dpCents),
        sisaDecimal: centsToDecimalString(sisaCents),
        isOverpaid,
        previewStatus,
    };
}

const JENIS_INSIDEN_LABELS: Record<JenisInsiden, string> = {
    RUSAK: 'Kerusakan Pakaian',
    HILANG: 'Kehilangan Pakaian',
};

export function formatJenisInsiden(jenis: JenisInsiden | string): string {
    return JENIS_INSIDEN_LABELS[jenis as JenisInsiden] ?? jenis;
}

const STATUS_KONFIRMASI_LABELS: Record<StatusKonfirmasiInsiden, string> = {
    MENUNGGU_KONFIRMASI: 'Menunggu Konfirmasi',
    TERKONFIRMASI: 'Terkonfirmasi',
};

export function formatStatusKonfirmasi(
    status: StatusKonfirmasiInsiden | string,
): string {
    return STATUS_KONFIRMASI_LABELS[status as StatusKonfirmasiInsiden] ?? status;
}

const TAHAP_PRODUKSI_LABELS: Record<TahapProduksiCode, string> = {
    DITERIMA: 'Diterima',
    DICUCI: 'Dicuci',
    DIKERINGKAN: 'Dikeringkan',
    DISETRIKA: 'Disetrika',
    SELESAI: 'Selesai',
};

export function formatTahapProduksi(tahap: TahapProduksiCode | string): string {
    return TAHAP_PRODUKSI_LABELS[tahap as TahapProduksiCode] ?? tahap;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
    TRANSAKSI_CREATED: 'Transaksi Dibuat',
    TIMBANG_ULANG: 'Penimbangan Ulang (KK-01)',
    PRODUKSI_STATUS_UPDATED: 'Status Produksi Diperbarui',
    LAYANAN_CHANGED: 'Layanan Diubah (KK-02)',
    TRANSAKSI_CANCELLED: 'Transaksi Dibatalkan (KK-08)',
    INSIDEN_REPORTED: 'Insiden Dilaporkan',
    KOMPENSASI_CONFIRMED: 'Kompensasi Dikonfirmasi',
    PELUNASAN_RECORDED: 'Pelunasan Dicatat',
    SERAH_TERIMA: 'Serah Terima Pakaian',
};

export function formatAuditAction(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action.replaceAll('_', ' ');
}

export interface CompensationPreviewResult {
    basisCents: number;
    multiplier: number;
    estimasiCents: number;
    estimasiDecimal: string;
}

/**
 * Preview deterministic incident compensation using integer cents (matching KompensasiService::estimateCompensation).
 * Official persisted compensation is always calculated by the backend service layer.
 */
export function estimateCompensationPreview(params: {
    subtotalLayanan: string | number;
    itemJumlahPotong: number;
    totalPotongNota: number;
    jenisInsiden: JenisInsiden;
}): CompensationPreviewResult {
    const subtotalCents = Math.max(0, parseDecimalToCents(params.subtotalLayanan));
    const itemPotong = Math.max(0, Math.trunc(params.itemJumlahPotong));
    const denominator = Math.max(1, Math.trunc(params.totalPotongNota));
    const halfDenom = Math.floor(denominator / 2);
    const proratedCents = Math.floor(
        (subtotalCents * itemPotong + halfDenom) / denominator,
    );
    const basisCents = Math.max(SCALE, proratedCents);
    const multiplier = params.jenisInsiden === 'HILANG' ? 10 : 5;
    const estimasiCents = basisCents * multiplier;

    return {
        basisCents,
        multiplier,
        estimasiCents,
        estimasiDecimal: centsToDecimalString(estimasiCents),
    };
}

/**
 * Convert a TransaksiDetail record into EligibleInsidenTransaksiOption for shared incident modals.
 */
export function toEligibleInsidenOption(
    transaksi: TransaksiDetail,
): EligibleInsidenTransaksiOption {
    const totalPotong = Math.max(
        1,
        transaksi.detail_pakaian.reduce(
            (sum, item) => sum + item.jumlah_potong,
            0,
        ),
    );

    return {
        nomor_nota: transaksi.nomor_nota,
        status_transaksi: transaksi.status_transaksi,
        pelanggan_nama: transaksi.pelanggan.nama,
        layanan_nama: transaksi.layanan.nama_layanan,
        subtotal_layanan: transaksi.subtotal_layanan,
        total_potong: totalPotong,
        detail_pakaian: transaksi.detail_pakaian,
    };
}
