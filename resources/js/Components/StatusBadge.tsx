import type { ReactNode } from 'react';
import {
    formatStatusItemPengantaran,
    formatStatusKonfirmasi,
    formatStatusPengantaran,
    formatTahapProduksi,
} from '@/lib/format';
import type {
    JenisBayar,
    JenisInsiden,
    StatusItemPengantaran,
    StatusKonfirmasiInsiden,
    StatusPembayaran,
    StatusPengantaran,
    StatusTransaksi,
    TahapProduksiCode,
    TingkatKecepatan,
    UserRole,
    VoucherStatus,
} from '@/types';

export type BadgeTone =
    | 'slate'
    | 'teal'
    | 'sky'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'indigo'
    | 'violet';

const TONE_CLASSES: Record<BadgeTone, string> = {
    slate: 'bg-[#EEF2F5] text-[#334155] ring-[#D8E2E6]',
    teal: 'bg-[#F0FDFA] text-[#115E59] ring-teal-200',
    sky: 'bg-sky-50 text-sky-900 ring-sky-200',
    emerald: 'bg-[#ECFDF5] text-[#065F46] ring-emerald-200',
    amber: 'bg-[#FFFBEB] text-[#78350F] ring-amber-300/80',
    rose: 'bg-[#FFF1F2] text-[#9F1239] ring-rose-200',
    indigo: 'bg-[#EEF2FF] text-[#3730A3] ring-indigo-200',
    violet: 'bg-violet-50 text-violet-900 ring-violet-200',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
    slate: 'bg-[#475569]',
    teal: 'bg-[#0F766E]',
    sky: 'bg-sky-700',
    emerald: 'bg-[#047857]',
    amber: 'bg-[#B45309]',
    rose: 'bg-[#BE123C]',
    indigo: 'bg-[#4338CA]',
    violet: 'bg-violet-700',
};

interface BadgeMeta {
    label: string;
    tone: BadgeTone;
}

const ROLE_META: Record<UserRole, BadgeMeta> = {
    PETUGAS: { label: 'Petugas / Kasir', tone: 'teal' },
    PEGAWAI: { label: 'Pegawai Produksi', tone: 'indigo' },
    PENGANTAR: { label: 'Kurir Pengantaran', tone: 'violet' },
};

const PEMBAYARAN_META: Record<StatusPembayaran, BadgeMeta> = {
    BELUM_BAYAR: { label: 'Belum Bayar', tone: 'rose' },
    DP: { label: 'DP', tone: 'amber' },
    LUNAS: { label: 'Lunas', tone: 'emerald' },
    BELUM_LUNAS: { label: 'Belum Lunas', tone: 'amber' },
};

const TRANSAKSI_META: Record<StatusTransaksi, BadgeMeta> = {
    AKTIF: { label: 'Aktif', tone: 'teal' },
    SELESAI: { label: 'Selesai', tone: 'indigo' },
    DIAMBIL: { label: 'Diambil', tone: 'emerald' },
    DIBATALKAN: { label: 'Dibatalkan', tone: 'rose' },
};

const VOUCHER_META: Record<VoucherStatus, BadgeMeta> = {
    TERSEDIA: { label: 'Tersedia', tone: 'emerald' },
    SUDAH_DIGUNAKAN: { label: 'Sudah Digunakan', tone: 'slate' },
    KEDALUWARSA: { label: 'Kedaluwarsa', tone: 'rose' },
};

const KECEPATAN_META: Record<TingkatKecepatan, BadgeMeta> = {
    REGULER: { label: 'Reguler', tone: 'slate' },
    EXPRESS: { label: 'Express', tone: 'indigo' },
};

const TAHAP_META: Record<TahapProduksiCode, BadgeMeta> = {
    DITERIMA: { label: formatTahapProduksi('DITERIMA'), tone: 'sky' },
    DICUCI: { label: formatTahapProduksi('DICUCI'), tone: 'indigo' },
    DIKERINGKAN: { label: formatTahapProduksi('DIKERINGKAN'), tone: 'amber' },
    DISETRIKA: { label: formatTahapProduksi('DISETRIKA'), tone: 'violet' },
    SELESAI: { label: formatTahapProduksi('SELESAI'), tone: 'emerald' },
};

const JENIS_BAYAR_META: Record<JenisBayar, BadgeMeta> = {
    DP: { label: 'DP', tone: 'amber' },
    PELUNASAN: { label: 'Pelunasan', tone: 'emerald' },
};

const JENIS_INSIDEN_META: Record<JenisInsiden, BadgeMeta> = {
    RUSAK: { label: 'Rusak', tone: 'amber' },
    HILANG: { label: 'Hilang', tone: 'rose' },
};

const STATUS_KONFIRMASI_META: Record<StatusKonfirmasiInsiden, BadgeMeta> = {
    MENUNGGU_KONFIRMASI: {
        label: formatStatusKonfirmasi('MENUNGGU_KONFIRMASI'),
        tone: 'amber',
    },
    TERKONFIRMASI: {
        label: formatStatusKonfirmasi('TERKONFIRMASI'),
        tone: 'emerald',
    },
};

const PENGANTARAN_META: Record<StatusPengantaran, BadgeMeta> = {
    DIJADWALKAN: {
        label: formatStatusPengantaran('DIJADWALKAN'),
        tone: 'teal',
    },
    BERJALAN: {
        label: formatStatusPengantaran('BERJALAN'),
        tone: 'amber',
    },
    SELESAI: {
        label: formatStatusPengantaran('SELESAI'),
        tone: 'emerald',
    },
};

const ITEM_PENGANTARAN_META: Record<StatusItemPengantaran, BadgeMeta> = {
    MENUNGGU: {
        label: formatStatusItemPengantaran('MENUNGGU'),
        tone: 'slate',
    },
    DIAMBIL: {
        label: formatStatusItemPengantaran('DIAMBIL'),
        tone: 'teal',
    },
    DALAM_PERJALANAN: {
        label: formatStatusItemPengantaran('DALAM_PERJALANAN'),
        tone: 'indigo',
    },
    DITERIMA: {
        label: formatStatusItemPengantaran('DITERIMA'),
        tone: 'emerald',
    },
    GAGAL: {
        label: formatStatusItemPengantaran('GAGAL'),
        tone: 'rose',
    },
};

interface BaseBadgeProps {
    tone?: BadgeTone;
    showDot?: boolean;
    className?: string;
    children: ReactNode;
}

export function StatusBadge({
    tone = 'slate',
    showDot = true,
    className = '',
    children,
}: BaseBadgeProps) {
    return (
        <span
            className={`inline-flex min-h-[1.375rem] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]} ${className}`}
        >
            {showDot && (
                <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`}
                    aria-hidden="true"
                />
            )}
            {children}
        </span>
    );
}

export function RoleBadge({ role }: { role: UserRole }) {
    const meta = ROLE_META[role] ?? { label: role, tone: 'slate' as const };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function PaymentStatusBadge({ status }: { status: StatusPembayaran }) {
    const meta = PEMBAYARAN_META[status] ?? {
        label: status,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function TransactionStatusBadge({
    status,
}: {
    status: StatusTransaksi;
}) {
    const meta = TRANSAKSI_META[status] ?? {
        label: status,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
    const meta = VOUCHER_META[status] ?? {
        label: status,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function SpeedTierBadge({
    tier,
    variant = 'badge',
}: {
    tier: TingkatKecepatan;
    variant?: 'badge' | 'text';
}) {
    const meta = KECEPATAN_META[tier] ?? {
        label: tier,
        tone: 'slate' as const,
    };
    if (tier === 'REGULER' && variant === 'text') {
        return (
            <span className="text-xs font-medium text-[#475569]">
                {meta.label}
            </span>
        );
    }
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function ProductionStageBadge({
    stage,
    order,
}: {
    stage: TahapProduksiCode;
    order?: number;
}) {
    const meta = TAHAP_META[stage] ?? {
        label: stage,
        tone: 'slate' as const,
    };
    return (
        <StatusBadge tone={meta.tone}>
            {order !== undefined ? `${order}. ` : ''}
            {meta.label}
        </StatusBadge>
    );
}

export const TahapProduksiBadge = ProductionStageBadge;

export function JenisInsidenBadge({ jenis }: { jenis: JenisInsiden }) {
    const meta = JENIS_INSIDEN_META[jenis] ?? {
        label: jenis,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function StatusKonfirmasiBadge({
    status,
}: {
    status: StatusKonfirmasiInsiden;
}) {
    const meta = STATUS_KONFIRMASI_META[status] ?? {
        label: status,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function PaymentTypeBadge({ type }: { type: JenisBayar }) {
    const meta = JENIS_BAYAR_META[type] ?? {
        label: type,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function PayLaterBadge({
    allowed,
    variant = 'badge',
}: {
    allowed: boolean;
    variant?: 'badge' | 'text';
}) {
    if (allowed) {
        return <StatusBadge tone="indigo">Boleh Bayar Akhir</StatusBadge>;
    }

    if (variant === 'text') {
        return (
            <span className="text-xs font-medium text-[#475569]">
                Wajib Lunas
            </span>
        );
    }

    return <StatusBadge tone="slate">Wajib Lunas</StatusBadge>;
}

export function PengantaranStatusBadge({
    status,
}: {
    status: StatusPengantaran;
}) {
    const meta = PENGANTARAN_META[status] ?? {
        label: status,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

export function ItemPengantaranStatusBadge({
    status,
}: {
    status: StatusItemPengantaran;
}) {
    const meta = ITEM_PENGANTARAN_META[status] ?? {
        label: status,
        tone: 'slate' as const,
    };
    return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}
