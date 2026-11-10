import type { ReactNode } from 'react';
import {
    formatStatusKonfirmasi,
    formatTahapProduksi,
} from '@/lib/format';
import type {
    JenisBayar,
    JenisInsiden,
    StatusKonfirmasiInsiden,
    StatusPembayaran,
    StatusTransaksi,
    TahapProduksiCode,
    TingkatKecepatan,
    UserRole,
    VoucherStatus,
} from '@/types';

export type BadgeTone =
    | 'slate'
    | 'sky'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'indigo'
    | 'violet';

const TONE_CLASSES: Record<BadgeTone, string> = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

interface BadgeMeta {
    label: string;
    tone: BadgeTone;
}

const ROLE_META: Record<UserRole, BadgeMeta> = {
    PETUGAS: { label: 'Petugas / Kasir', tone: 'sky' },
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
    AKTIF: { label: 'Aktif', tone: 'sky' },
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
    EXPRESS: { label: 'Express', tone: 'violet' },
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

interface BaseBadgeProps {
    tone?: BadgeTone;
    className?: string;
    children: ReactNode;
}

export function StatusBadge({
    tone = 'slate',
    className = '',
    children,
}: BaseBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]} ${className}`}
        >
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

export function SpeedTierBadge({ tier }: { tier: TingkatKecepatan }) {
    const meta = KECEPATAN_META[tier] ?? {
        label: tier,
        tone: 'slate' as const,
    };
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

export function PayLaterBadge({ allowed }: { allowed: boolean }) {
    return allowed ? (
        <StatusBadge tone="indigo">Boleh Bayar Akhir</StatusBadge>
    ) : (
        <StatusBadge tone="slate">Wajib Lunas</StatusBadge>
    );
}
