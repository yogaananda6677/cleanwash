import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    Inbox,
    Info,
    Scale,
    Sparkles,
    WashingMachine,
    Wind,
} from 'lucide-react';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar, {
    FILTER_LABEL_CLASS,
    FILTER_SELECT_CLASS,
} from '@/Components/FilterToolbar';
import LaporkanInsidenModal from '@/Components/LaporkanInsidenModal';
import MetadataRow from '@/Components/MetadataRow';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import StatTile, { type StatTileTone } from '@/Components/StatTile';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    SpeedTierBadge,
    StatusBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    calculateMultiplyQuantityCents,
    centsToDecimalString,
    formatRupiah,
    formatTahapProduksi,
    formatTanggal,
    parseDecimalToCents,
    toEligibleInsidenOption,
} from '@/lib/format';
import type {
    EligibleInsidenTransaksiOption,
    ProduksiIndexProps,
    TahapProduksiCode,
    TransaksiDetail,
} from '@/types';

const STAGE_ORDER: TahapProduksiCode[] = [
    'DITERIMA',
    'DICUCI',
    'DIKERINGKAN',
    'DISETRIKA',
    'SELESAI',
];

const STAGE_TILE_META: Record<
    TahapProduksiCode,
    { tone: StatTileTone; icon: ReactNode }
> = {
    DITERIMA: {
        tone: 'brand',
        icon: <Inbox className="h-4 w-4" aria-hidden="true" />,
    },
    DICUCI: {
        tone: 'indigo',
        icon: <WashingMachine className="h-4 w-4" aria-hidden="true" />,
    },
    DIKERINGKAN: {
        tone: 'amber',
        icon: <Wind className="h-4 w-4" aria-hidden="true" />,
    },
    DISETRIKA: {
        tone: 'neutral',
        icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    },
    SELESAI: {
        tone: 'emerald',
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    },
};

export default function ProduksiIndex({
    auth,
    transaksi,
    filters,
    stageCounts,
}: ProduksiIndexProps) {
    const filterId = useId();
    const searchInputId = `${filterId}-search`;
    const tahapSelectId = `${filterId}-tahap`;
    const statusSelectId = `${filterId}-status`;
    const timbangFormId = useId();
    const beratInputId = `${timbangFormId}-berat`;
    const beratErrorId = `${timbangFormId}-berat-err`;
    const catatanInputId = `${timbangFormId}-catatan`;
    const catatanErrorId = `${timbangFormId}-catatan-err`;

    const [search, setSearch] = useState(filters.search ?? '');
    const [tahapStatus, setTahapStatus] = useState<TahapProduksiCode | ''>(
        filters.tahap_status ?? '',
    );
    const [statusTransaksi, setStatusTransaksi] = useState<
        'AKTIF' | 'SELESAI' | 'ALL'
    >(filters.status_transaksi ?? 'AKTIF');

    const [advancingNota, setAdvancingNota] = useState<string | null>(null);
    const [timbangTarget, setTimbangTarget] = useState<TransaksiDetail | null>(
        null,
    );
    const [insidenTarget, setInsidenTarget] =
        useState<EligibleInsidenTransaksiOption | null>(null);

    const timbangForm = useForm({
        berat_aktual: '',
        catatan: '',
    });

    useEffect(() => {
        setSearch(filters.search ?? '');
        setTahapStatus(filters.tahap_status ?? '');
        setStatusTransaksi(filters.status_transaksi ?? 'AKTIF');
    }, [filters.search, filters.tahap_status, filters.status_transaksi]);

    const applyFilters = (
        nextSearch: string,
        nextTahap: TahapProduksiCode | '',
        nextStatus: 'AKTIF' | 'SELESAI' | 'ALL',
    ) => {
        router.get(
            '/produksi',
            {
                search: nextSearch.trim() || undefined,
                tahap_status: nextTahap || undefined,
                status_transaksi: nextStatus,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, tahapStatus, statusTransaksi);
    };

    const handleStageCardClick = (stage: TahapProduksiCode) => {
        const isCurrentlySelected = tahapStatus === stage;
        const nextTahap: TahapProduksiCode | '' = isCurrentlySelected
            ? ''
            : stage;

        let nextStatus = statusTransaksi;
        if (nextTahap === 'SELESAI' && statusTransaksi === 'AKTIF') {
            nextStatus = 'SELESAI';
        } else if (
            nextTahap !== '' &&
            nextTahap !== 'SELESAI' &&
            statusTransaksi === 'SELESAI'
        ) {
            nextStatus = 'AKTIF';
        } else if (
            nextTahap === '' &&
            stage === 'SELESAI' &&
            statusTransaksi === 'SELESAI'
        ) {
            nextStatus = 'AKTIF';
        }

        setTahapStatus(nextTahap);
        setStatusTransaksi(nextStatus);
        applyFilters(search, nextTahap, nextStatus);
    };

    const handleResetFilters = () => {
        setSearch('');
        setTahapStatus('');
        setStatusTransaksi('AKTIF');
        router.get('/produksi', {}, { preserveState: true, replace: true });
    };

    const handleAdvanceStage = (
        item: TransaksiDetail,
        nextStage: TahapProduksiCode,
    ) => {
        if (advancingNota !== null) {
            return;
        }
        if (!item.layanan.perlu_setrika && nextStage === 'DISETRIKA') {
            return;
        }

        setAdvancingNota(item.nomor_nota);
        router.post(
            `/produksi/${item.nomor_nota}/status`,
            { tahap_status: nextStage },
            {
                preserveScroll: true,
                onFinish: () => setAdvancingNota(null),
            },
        );
    };

    const openTimbangModal = (item: TransaksiDetail) => {
        timbangForm.clearErrors();
        timbangForm.setData({
            berat_aktual: item.berat_atau_jumlah,
            catatan: '',
        });
        setTimbangTarget(item);
    };

    const closeTimbangModal = () => {
        if (timbangForm.processing) {
            return;
        }
        timbangForm.clearErrors();
        setTimbangTarget(null);
    };

    const handleTimbangSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!timbangTarget) {
            return;
        }

        timbangForm.post(`/produksi/${timbangTarget.nomor_nota}/timbang-ulang`, {
            preserveScroll: true,
            onSuccess: () => {
                timbangForm.clearErrors();
                setTimbangTarget(null);
            },
        });
    };

    const hasActiveFilters =
        filters.search !== '' ||
        filters.tahap_status !== '' ||
        filters.status_transaksi !== 'AKTIF';

    // Integer-cents preview for Timbang Ulang modal
    const timbangSubtotalBaruCents = timbangTarget
        ? calculateMultiplyQuantityCents(
              timbangForm.data.berat_aktual || '0',
              timbangTarget.harga_satuan_snapshot,
          )
        : 0;
    const timbangVoucherCents = timbangTarget
        ? parseDecimalToCents(timbangTarget.nilai_voucher_snapshot)
        : 0;
    const timbangKompensasiCents = timbangTarget
        ? parseDecimalToCents(timbangTarget.total_kompensasi)
        : 0;
    const timbangTagihanDasarBaruCents = Math.max(
        0,
        timbangSubtotalBaruCents - timbangVoucherCents,
    );
    const timbangTotalHargaBaruCents = Math.max(
        0,
        timbangTagihanDasarBaruCents - timbangKompensasiCents,
    );
    const timbangDibayarCents = timbangTarget
        ? parseDecimalToCents(timbangTarget.total_dibayar)
        : 0;
    const timbangSisaBaruCents = Math.max(
        0,
        timbangTotalHargaBaruCents - timbangDibayarCents,
    );
    const timbangKelebihanTunaiCents = Math.max(
        0,
        timbangDibayarCents - timbangTagihanDasarBaruCents,
    );
    const willDowngradeFromLunas =
        timbangTarget?.status_pembayaran === 'LUNAS' &&
        timbangTotalHargaBaruCents > timbangDibayarCents;
    const willUpgradeToLunas =
        timbangTarget !== null &&
        timbangTarget.status_pembayaran !== 'LUNAS' &&
        timbangTotalHargaBaruCents <= timbangDibayarCents;

    return (
        <AppLayout
            title="Antrean Produksi"
            subtitle="Kelola tahapan proses cucian, penimbangan ulang (KK-01), dan pelaporan insiden pakaian"
            headerActions={
                <Link
                    href="/insiden"
                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                >
                    <AlertTriangle
                        className="h-4 w-4 shrink-0 text-[#B45309]"
                        aria-hidden="true"
                    />
                    <span>Lihat Daftar Insiden</span>
                </Link>
            }
        >
            <Head title="Antrean Produksi" />

            {/* 5 Stage Summary Quick-Filter Cards (Mobile Horizontal Pills + Desktop StatTiles) */}
            <section aria-label="Ringkasan tahap produksi">
                {/* Mobile Stage Selector Pills */}
                <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-1.5 -mx-4 px-4 no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setTahapStatus('')}
                        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                            tahapStatus === ''
                                ? 'bg-[#0F766E] text-white shadow-xs ring-1 ring-[#14B8A6]/40'
                                : 'border border-[#CBD5E1] bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <span>Semua</span>
                        <span
                            className={`rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold ${
                                tahapStatus === ''
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            {STAGE_ORDER.reduce(
                                (acc, s) => acc + (stageCounts[s] ?? 0),
                                0,
                            )}
                        </span>
                    </button>
                    {STAGE_ORDER.map((stage) => {
                        const selected = tahapStatus === stage;
                        const meta = STAGE_TILE_META[stage];
                        const count = stageCounts[stage] ?? 0;

                        return (
                            <button
                                key={`mobile-${stage}`}
                                type="button"
                                onClick={() => handleStageCardClick(stage)}
                                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                                    selected
                                        ? 'bg-[#0F766E] text-white shadow-xs ring-1 ring-[#14B8A6]/40'
                                        : 'border border-[#CBD5E1] bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className={selected ? 'text-white' : 'text-[#0F766E]'}>
                                    {meta.icon}
                                </span>
                                <span>{formatTahapProduksi(stage)}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold ${
                                        selected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Desktop StatTiles Grid */}
                <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {STAGE_ORDER.map((stage) => {
                        const selected = tahapStatus === stage;
                        const meta = STAGE_TILE_META[stage];
                        const count = stageCounts[stage] ?? 0;

                        return (
                            <StatTile
                                key={stage}
                                label={formatTahapProduksi(stage)}
                                value={count}
                                hint={
                                    selected
                                        ? 'Klik untuk hapus filter'
                                        : `Filter tahap ${formatTahapProduksi(stage)}`
                                }
                                tone={meta.tone}
                                icon={meta.icon}
                                active={selected}
                                onClick={() => handleStageCardClick(stage)}
                            />
                        );
                    })}
                </div>
            </section>

            {/* Search & Filter Controls */}
            <FilterToolbar
                className="mt-5"
                ariaLabel="Filter dan pencarian antrean produksi"
                onSubmit={handleSearchSubmit}
                searchValue={search}
                onSearchChange={setSearch}
                searchId={searchInputId}
                searchLabel="Cari Nota / Pelanggan"
                searchPlaceholder="Cari nomor nota (CW-...), nama pelanggan, atau no. telepon..."
                submitLabel="Terapkan Filter"
                onReset={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
            >
                <div className="w-full sm:w-48 lg:shrink-0">
                    <label
                        htmlFor={tahapSelectId}
                        className={FILTER_LABEL_CLASS}
                    >
                        Tahap Produksi
                    </label>
                    <select
                        id={tahapSelectId}
                        name="tahap_status"
                        value={tahapStatus}
                        onChange={(event) =>
                            setTahapStatus(
                                event.target.value as TahapProduksiCode | '',
                            )
                        }
                        className={FILTER_SELECT_CLASS}
                    >
                        <option value="">Semua Tahap</option>
                        {STAGE_ORDER.map((stage) => (
                            <option key={stage} value={stage}>
                                {formatTahapProduksi(stage)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-52 lg:shrink-0">
                    <label
                        htmlFor={statusSelectId}
                        className={FILTER_LABEL_CLASS}
                    >
                        Status Transaksi
                    </label>
                    <select
                        id={statusSelectId}
                        name="status_transaksi"
                        value={statusTransaksi}
                        onChange={(event) =>
                            setStatusTransaksi(
                                event.target.value as
                                    | 'AKTIF'
                                    | 'SELESAI'
                                    | 'ALL',
                            )
                        }
                        className={FILTER_SELECT_CLASS}
                    >
                        <option value="AKTIF">Antrean Aktif</option>
                        <option value="SELESAI">Selesai Produksi</option>
                        <option value="ALL">
                            Semua (Aktif &amp; Selesai)
                        </option>
                    </select>
                </div>
            </FilterToolbar>

            {/* Production Queue List */}
            <section className="mt-5 space-y-4">
                {transaksi.data.length === 0 ? (
                    <EmptyState
                        title="Antrean produksi tidak ditemukan"
                        description={
                            hasActiveFilters
                                ? 'Tidak ada nota produksi yang cocok dengan pencarian atau filter tahap saat ini.'
                                : 'Belum ada transaksi aktif di antrean produksi saat ini.'
                        }
                        actionLabel={
                            hasActiveFilters ? 'Reset Filter' : undefined
                        }
                        onAction={
                            hasActiveFilters ? handleResetFilters : undefined
                        }
                    />
                ) : (
                    <>
                        {transaksi.data.map((item) => {
                            const orderedStages = item.layanan.tahap_layanan
                                .slice()
                                .sort((a, b) => a.urutan - b.urutan)
                                .filter(
                                    (tahap) =>
                                        item.layanan.perlu_setrika ||
                                        tahap.nama_tahap !== 'DISETRIKA',
                                );

                            const completedStages = new Set(
                                item.riwayat_status_produksi.map(
                                    (riwayat) => riwayat.tahap_status,
                                ),
                            );

                            const latestHistory =
                                item.riwayat_status_produksi[
                                    item.riwayat_status_produksi.length - 1
                                ] ?? null;

                            const nextStage =
                                item.tahap_produksi_berikutnya !== null &&
                                (item.layanan.perlu_setrika ||
                                    item.tahap_produksi_berikutnya !==
                                        'DISETRIKA')
                                    ? item.tahap_produksi_berikutnya
                                    : null;

                            const canReportIncident =
                                item.status_transaksi === 'AKTIF' ||
                                item.status_transaksi === 'SELESAI';

                            const totalPotong = item.detail_pakaian.reduce(
                                (sum, detail) => sum + detail.jumlah_potong,
                                0,
                            );

                            return (
                                <article
                                    key={item.nomor_nota}
                                    className="rounded-2xl border border-[#D8E2E6] bg-white p-4 shadow-[0_1px_2px_rgba(15,41,51,0.04)] transition hover:border-[#7C8C9D] sm:p-5"
                                >
                                    {/* Card Header (max 2-3 badges + single Primary CTA) */}
                                    <div className="flex flex-col justify-between gap-3 border-b border-[#D8E2E6] pb-4 lg:flex-row lg:items-start">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-base font-bold text-[#0F172A]">
                                                    {item.nomor_nota}
                                                </span>
                                                <TransactionStatusBadge
                                                    status={
                                                        item.status_transaksi
                                                    }
                                                />
                                                <PaymentStatusBadge
                                                    status={
                                                        item.status_pembayaran
                                                    }
                                                />
                                                {item.insiden_pending_count >
                                                    0 && (
                                                    <StatusBadge tone="amber">
                                                        {
                                                            item.insiden_pending_count
                                                        }{' '}
                                                        Insiden Menunggu
                                                    </StatusBadge>
                                                )}
                                            </div>
                                            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[#5B697A]">
                                                <Clock
                                                    className="h-3.5 w-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Masuk:{' '}
                                                    {formatTanggal(
                                                        item.tanggal_penerimaan,
                                                        { withTime: true },
                                                    )}{' '}
                                                    &bull; Penerima:{' '}
                                                    {item.petugas.nama_petugas}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                            {item.bisa_timbang_ulang && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openTimbangModal(item)
                                                    }
                                                    className="flex-1 sm:flex-initial inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 active:scale-95"
                                                >
                                                    <Scale
                                                        className="h-4 w-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Timbang Ulang</span>
                                                </button>
                                            )}

                                            {canReportIncident && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setInsidenTarget(
                                                            toEligibleInsidenOption(
                                                                item,
                                                            ),
                                                        )
                                                    }
                                                    className="flex-1 sm:flex-initial inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-[#9F1239] transition hover:bg-rose-100 active:scale-95"
                                                >
                                                    <AlertTriangle
                                                        className="h-4 w-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Laporkan Insiden
                                                    </span>
                                                </button>
                                            )}

                                            {nextStage && (
                                                <button
                                                    type="button"
                                                    disabled={
                                                        advancingNota ===
                                                        item.nomor_nota
                                                    }
                                                    onClick={() =>
                                                        handleAdvanceStage(
                                                            item,
                                                            nextStage,
                                                        )
                                                    }
                                                    className="hidden sm:inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <span>
                                                        {advancingNota ===
                                                        item.nomor_nota
                                                            ? 'Memproses...'
                                                            : `Lanjut ke ${formatTahapProduksi(nextStage)}`}
                                                    </span>
                                                    {advancingNota !==
                                                        item.nomor_nota && (
                                                        <ArrowRight
                                                            className="h-4 w-4 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Customer, Service & Clothing Details */}
                                    <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
                                        {/* Customer + Service Summary */}
                                        <div className="min-w-0 space-y-3 lg:col-span-5">
                                            <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-sm font-bold text-[#0F172A]">
                                                        {item.pelanggan.nama}
                                                    </p>
                                                    {item.pelanggan
                                                        .boleh_bayar_akhir && (
                                                        <PayLaterBadge
                                                            allowed={true}
                                                        />
                                                    )}
                                                </div>
                                                <MetadataRow
                                                    className="mt-1"
                                                    items={[
                                                        <span
                                                            key="tel"
                                                            className="font-mono text-[#475569]"
                                                        >
                                                            {
                                                                item.pelanggan
                                                                    .no_telepon
                                                            }
                                                        </span>,
                                                        !item.pelanggan
                                                            .boleh_bayar_akhir && (
                                                            <PayLaterBadge
                                                                key="paylater"
                                                                allowed={false}
                                                                variant="text"
                                                            />
                                                        ),
                                                    ]}
                                                />
                                                <p className="mt-1.5 break-words text-xs leading-relaxed text-[#475569]">
                                                    {item.pelanggan.alamat}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-sm font-bold text-[#0F172A]">
                                                        {
                                                            item.layanan
                                                                .nama_layanan
                                                        }
                                                    </span>
                                                    <SpeedTierBadge
                                                        tier={
                                                            item.layanan
                                                                .tingkat_kecepatan
                                                        }
                                                        variant="text"
                                                    />
                                                </div>

                                                <MetadataRow
                                                    className="mt-2"
                                                    items={[
                                                        <span key="metode">
                                                            {
                                                                item.layanan
                                                                    .metode_hitung
                                                            }{' '}
                                                            (
                                                            {
                                                                item.layanan
                                                                    .satuan
                                                            }
                                                            )
                                                        </span>,
                                                        <span key="setrika">
                                                            {item.layanan
                                                                .perlu_setrika
                                                                ? 'Perlu Setrika'
                                                                : 'Tanpa Setrika'}
                                                        </span>,
                                                        <strong
                                                            key="qty"
                                                            className="font-mono font-bold tabular-nums text-[#0F766E]"
                                                        >
                                                            {
                                                                item.berat_atau_jumlah
                                                            }{' '}
                                                            {
                                                                item.layanan
                                                                    .satuan
                                                            }
                                                        </strong>,
                                                    ]}
                                                />

                                                <p className="mt-2 border-t border-[#D8E2E6] pt-2 text-xs text-[#475569]">
                                                    Tarif snapshot:{' '}
                                                    <strong className="font-mono tabular-nums text-[#0F172A]">
                                                        {formatRupiah(
                                                            item.harga_satuan_snapshot,
                                                        )}
                                                        /{item.layanan.satuan}
                                                    </strong>{' '}
                                                    &bull; Total:{' '}
                                                    <strong className="font-mono tabular-nums text-[#0F172A]">
                                                        {formatRupiah(
                                                            item.total_harga,
                                                        )}
                                                    </strong>
                                                </p>

                                                {item.catatan_khusus && (
                                                    <p className="mt-2 rounded-lg border border-amber-200 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-2.5 py-1.5 text-xs text-[#78350F]">
                                                        <span className="font-semibold">
                                                            Catatan khusus:
                                                        </span>{' '}
                                                        {item.catatan_khusus}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Detail Pakaian + Visual Pipeline Stepper */}
                                        <div className="min-w-0 space-y-4 lg:col-span-7">
                                            <div>
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                                                        Rincian Pakaian (
                                                        {
                                                            item.detail_pakaian
                                                                .length
                                                        }{' '}
                                                        item &bull;{' '}
                                                        {totalPotong} potong)
                                                    </h2>
                                                    {item.laporan_insiden
                                                        .length > 0 && (
                                                        <span className="text-xs font-semibold text-[#9F1239]">
                                                            {
                                                                item
                                                                    .laporan_insiden
                                                                    .length
                                                            }{' '}
                                                            laporan insiden
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="mt-2 divide-y divide-[#D8E2E6] rounded-xl border border-[#D8E2E6] bg-white text-xs">
                                                    {item.detail_pakaian.map(
                                                        (detail) => (
                                                            <li
                                                                key={
                                                                    detail.id_detail
                                                                }
                                                                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
                                                            >
                                                                <div className="min-w-0">
                                                                    <span className="font-semibold text-[#0F172A]">
                                                                        {
                                                                            detail.jenis_pakaian
                                                                        }
                                                                    </span>
                                                                    <span className="ml-2 text-[#5B697A]">
                                                                        &mdash;{' '}
                                                                        {
                                                                            detail.kondisi_pakaian
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <span className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                                                    {
                                                                        detail.jumlah_potong
                                                                    }{' '}
                                                                    pcs
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>

                                            {/* Visual Pipeline Stepper */}
                                            <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5">
                                                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                                    Alur Tahap Produksi Layanan
                                                </p>
                                                <ol className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
                                                    {orderedStages.map(
                                                        (tahap, index) => {
                                                            const isCompleted =
                                                                completedStages.has(
                                                                    tahap.nama_tahap,
                                                                );
                                                            const isCurrent =
                                                                item.tahap_produksi_terakhir ===
                                                                tahap.nama_tahap;

                                                            return (
                                                                <li
                                                                    key={
                                                                        tahap.id_tahap
                                                                    }
                                                                    className="flex items-center gap-1.5"
                                                                >
                                                                    <span
                                                                        aria-current={
                                                                            isCurrent
                                                                                ? 'step'
                                                                                : undefined
                                                                        }
                                                                        className={`inline-flex min-h-[1.875rem] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                                                                            isCurrent
                                                                                ? 'bg-[#0F766E] text-white ring-[#0F766E] shadow-xs'
                                                                                : isCompleted
                                                                                  ? 'bg-[#ECFDF5] text-[#065F46] ring-emerald-200'
                                                                                  : 'bg-white text-[#5B697A] ring-[#CBD5E1]'
                                                                        }`}
                                                                    >
                                                                        {isCurrent ? (
                                                                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#0F766E] tabular-nums">
                                                                                {index +
                                                                                    1}
                                                                            </span>
                                                                        ) : isCompleted ? (
                                                                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#047857] text-white">
                                                                                <Check
                                                                                    className="h-2.5 w-2.5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#CBD5E1] text-[10px] font-semibold text-[#5B697A] tabular-nums">
                                                                                {index +
                                                                                    1}
                                                                            </span>
                                                                        )}
                                                                        <span>
                                                                            {
                                                                                index +
                                                                                1
                                                                            }
                                                                            .{' '}
                                                                            {formatTahapProduksi(
                                                                                tahap.nama_tahap,
                                                                            )}
                                                                        </span>
                                                                    </span>
                                                                    {index <
                                                                        orderedStages.length -
                                                                            1 && (
                                                                        <ChevronRight
                                                                            className="h-3.5 w-3.5 shrink-0 text-[#7C8C9D]"
                                                                            aria-hidden="true"
                                                                        />
                                                                    )}
                                                                </li>
                                                            );
                                                        },
                                                    )}
                                                </ol>

                                                {latestHistory && (
                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#D8E2E6] pt-2.5 text-xs text-[#475569]">
                                                        <span>
                                                            Update terakhir:{' '}
                                                            <strong className="text-[#0F172A]">
                                                                {latestHistory
                                                                    .pegawai
                                                                    ?.nama_pegawai ??
                                                                    (latestHistory.id_pegawai !==
                                                                    null
                                                                        ? `Pegawai #${latestHistory.id_pegawai}`
                                                                        : 'Kasir saat penerimaan')}
                                                            </strong>
                                                        </span>
                                                        <span className="font-mono text-[11px] tabular-nums text-[#5B697A]">
                                                            {formatTanggal(
                                                                latestHistory.waktu_update,
                                                                {
                                                                    withTime:
                                                                        true,
                                                                },
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile-Only Primary Advance Action (Full Width, Easy Thumb Target) */}
                                    {nextStage && (
                                        <div className="mt-4 pt-3.5 border-t border-[#D8E2E6] sm:hidden">
                                            <button
                                                type="button"
                                                disabled={
                                                    advancingNota ===
                                                    item.nomor_nota
                                                }
                                                onClick={() =>
                                                    handleAdvanceStage(
                                                        item,
                                                        nextStage,
                                                    )
                                                }
                                                className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.98] transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <span>
                                                    {advancingNota ===
                                                    item.nomor_nota
                                                        ? 'Memproses...'
                                                        : `Lanjut ke ${formatTahapProduksi(nextStage)}`}
                                                </span>
                                                {advancingNota !==
                                                    item.nomor_nota && (
                                                    <ArrowRight
                                                        className="h-4 w-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}

                        <div className="overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                            <Pagination
                                paginated={transaksi}
                                itemLabel="nota produksi"
                            />
                        </div>
                    </>
                )}
            </section>

            {/* Modal Timbang Ulang (KK-01) */}
            <Modal
                open={timbangTarget !== null}
                onClose={closeTimbangModal}
                closeDisabled={timbangForm.processing}
                maxWidth="lg"
                title={
                    timbangTarget
                        ? `Timbang Ulang Nota ${timbangTarget.nomor_nota}`
                        : 'Timbang Ulang'
                }
                subtitle={
                    timbangTarget
                        ? `${timbangTarget.pelanggan.nama} — ${timbangTarget.layanan.nama_layanan}`
                        : undefined
                }
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeTimbangModal}
                            disabled={timbangForm.processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={timbangFormId}
                            disabled={timbangForm.processing || !timbangTarget}
                            className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Scale
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>
                                {timbangForm.processing
                                    ? 'Menyimpan...'
                                    : 'Simpan Berat Aktual'}
                            </span>
                        </button>
                    </>
                }
            >
                {timbangTarget && (
                    <form
                        id={timbangFormId}
                        onSubmit={handleTimbangSubmit}
                        className="space-y-4"
                    >
                        <div className="flex items-start gap-2.5 rounded-xl border border-teal-200 border-l-4 border-l-[#0F766E] bg-[#F0FDFA] px-4 py-3 text-xs text-[#115E59]">
                            <Info
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-semibold">
                                    Tarif Snapshot Nota Terkunci (KK-09)
                                </p>
                                <p className="mt-1 leading-relaxed">
                                    Perhitungan tetap menggunakan tarif snapshot{' '}
                                    <strong className="font-mono tabular-nums">
                                        {formatRupiah(
                                            timbangTarget.harga_satuan_snapshot,
                                        )}
                                        /kg
                                    </strong>{' '}
                                    (berat awal:{' '}
                                    <strong className="font-mono tabular-nums">
                                        {timbangTarget.berat_atau_jumlah} kg
                                    </strong>
                                    ).
                                </p>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor={beratInputId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Berat Aktual (kg){' '}
                                <span
                                    aria-hidden="true"
                                    className="text-rose-600"
                                >
                                    *
                                </span>
                            </label>
                            <input
                                id={beratInputId}
                                name="berat_aktual"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="99999.99"
                                inputMode="decimal"
                                autoFocus
                                required
                                value={timbangForm.data.berat_aktual}
                                onChange={(event) =>
                                    timbangForm.setData(
                                        'berat_aktual',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={Boolean(
                                    timbangForm.errors.berat_aktual,
                                )}
                                aria-describedby={
                                    timbangForm.errors.berat_aktual
                                        ? beratErrorId
                                        : undefined
                                }
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                            {timbangForm.errors.berat_aktual && (
                                <p
                                    id={beratErrorId}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {timbangForm.errors.berat_aktual}
                                </p>
                            )}
                        </div>

                        {/* Live Recalculation Preview */}
                        <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs">
                            <p className="font-semibold text-[#0F172A]">
                                Pratinjau Dampak Tagihan
                            </p>
                            <dl className="mt-2 space-y-1.5">
                                <div className="flex justify-between">
                                    <dt className="text-[#5B697A]">
                                        Subtotal Baru
                                    </dt>
                                    <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                timbangSubtotalBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#5B697A]">
                                        Total Tagihan Baru
                                    </dt>
                                    <dd className="font-mono font-bold tabular-nums text-[#0F172A]">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                timbangTotalHargaBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#5B697A]">
                                        Sudah Dibayar
                                    </dt>
                                    <dd className="font-mono font-semibold tabular-nums text-[#0F766E]">
                                        {formatRupiah(
                                            timbangTarget.total_dibayar,
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between border-t border-[#D8E2E6] pt-1.5">
                                    <dt className="font-semibold text-[#0F172A]">
                                        Estimasi Sisa Tagihan
                                    </dt>
                                    <dd className="font-mono font-bold tabular-nums text-[#78350F]">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                timbangSisaBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                                {timbangKelebihanTunaiCents > 0 && (
                                    <div className="flex justify-between text-[#065F46]">
                                        <dt className="font-semibold">
                                            Kelebihan Bayar Tunai
                                        </dt>
                                        <dd className="font-mono font-bold tabular-nums">
                                            {formatRupiah(
                                                centsToDecimalString(
                                                    timbangKelebihanTunaiCents,
                                                ),
                                            )}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {willDowngradeFromLunas && (
                            <div
                                role="status"
                                className="flex items-start gap-2.5 rounded-xl border border-rose-300 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-xs text-[#9F1239]"
                            >
                                <AlertTriangle
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="font-bold">
                                        Peringatan Status Pembayaran (KK-01)
                                    </p>
                                    <p className="mt-1 leading-relaxed">
                                        Nota ini saat ini berstatus{' '}
                                        <strong>LUNAS</strong>. Karena tagihan
                                        baru melebihi total yang sudah dibayar,
                                        status pembayaran akan otomatis turun
                                        menjadi <strong>BELUM_LUNAS</strong>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {!willDowngradeFromLunas &&
                            timbangTarget.status_pembayaran === 'LUNAS' && (
                                <p className="text-[11px] text-[#5B697A]">
                                    Catatan KK-01: Jika berat aktual menaikkan
                                    total tagihan melampaui nominal yang sudah
                                    dibayar, status <strong>LUNAS</strong> akan
                                    turun ke <strong>BELUM_LUNAS</strong>.
                                </p>
                            )}

                        {willUpgradeToLunas && (
                            <div
                                role="status"
                                className="flex items-start gap-2.5 rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] px-4 py-3 text-xs text-[#065F46]"
                            >
                                <CheckCircle2
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                                    aria-hidden="true"
                                />
                                <p>
                                    Total tagihan baru sudah tertutupi oleh
                                    pembayaran masuk, sehingga status pembayaran
                                    akan menjadi <strong>LUNAS</strong>.
                                </p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor={catatanInputId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Catatan Penimbangan (Opsional)
                            </label>
                            <textarea
                                id={catatanInputId}
                                name="catatan"
                                maxLength={500}
                                rows={2}
                                value={timbangForm.data.catatan}
                                onChange={(event) =>
                                    timbangForm.setData(
                                        'catatan',
                                        event.target.value,
                                    )
                                }
                                placeholder="mis. Hasil timbang ulang di timbangan digital produksi..."
                                aria-invalid={Boolean(
                                    timbangForm.errors.catatan,
                                )}
                                aria-describedby={
                                    timbangForm.errors.catatan
                                        ? catatanErrorId
                                        : undefined
                                }
                                className="mt-1.5 block min-h-[4.25rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                            {timbangForm.errors.catatan && (
                                <p
                                    id={catatanErrorId}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {timbangForm.errors.catatan}
                                </p>
                            )}
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Lapor Insiden per DetailPakaian */}
            <LaporkanInsidenModal
                open={insidenTarget !== null}
                onClose={() => setInsidenTarget(null)}
                role={auth.user?.role}
                submitMode="transaksi"
                fixedTransaksi={insidenTarget}
            />
        </AppLayout>
    );
}
