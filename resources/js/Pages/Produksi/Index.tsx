import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import LaporkanInsidenModal from '@/Components/LaporkanInsidenModal';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    ProductionStageBadge,
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

const STAGE_CARD_STYLES: Record<
    TahapProduksiCode,
    { active: string; idle: string; count: string }
> = {
    DITERIMA: {
        active: 'border-sky-500 bg-sky-50 ring-2 ring-sky-200',
        idle: 'border-slate-200 bg-white hover:border-sky-300',
        count: 'text-sky-700',
    },
    DICUCI: {
        active: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200',
        idle: 'border-slate-200 bg-white hover:border-indigo-300',
        count: 'text-indigo-700',
    },
    DIKERINGKAN: {
        active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
        idle: 'border-slate-200 bg-white hover:border-amber-300',
        count: 'text-amber-700',
    },
    DISETRIKA: {
        active: 'border-violet-500 bg-violet-50 ring-2 ring-violet-200',
        idle: 'border-slate-200 bg-white hover:border-violet-300',
        count: 'text-violet-700',
    },
    SELESAI: {
        active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
        idle: 'border-slate-200 bg-white hover:border-emerald-300',
        count: 'text-emerald-700',
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Lihat Daftar Insiden
                </Link>
            }
        >
            <Head title="Antrean Produksi" />

            {/* 5 Stage Summary Quick-Filter Cards */}
            <section aria-label="Ringkasan tahap produksi">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {STAGE_ORDER.map((stage) => {
                        const selected = tahapStatus === stage;
                        const style = STAGE_CARD_STYLES[stage];
                        const count = stageCounts[stage] ?? 0;

                        return (
                            <button
                                key={stage}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => handleStageCardClick(stage)}
                                className={`flex flex-col justify-between rounded-2xl border p-4 text-left shadow-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                                    selected ? style.active : style.idle
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <ProductionStageBadge stage={stage} />
                                    {selected && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                            Aktif
                                        </span>
                                    )}
                                </div>
                                <p
                                    className={`mt-3 text-2xl font-bold tabular-nums ${style.count}`}
                                >
                                    {count}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                    {selected
                                        ? 'Klik untuk hapus filter'
                                        : `Filter tahap ${formatTahapProduksi(stage)}`}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Search & Filter Controls */}
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <search>
                    <form
                        method="GET"
                        onSubmit={handleSearchSubmit}
                        className="flex flex-col gap-3 lg:flex-row lg:items-end"
                    >
                        <div className="flex-1">
                            <label
                                htmlFor={searchInputId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Cari Nota / Pelanggan
                            </label>
                            <input
                                id={searchInputId}
                                name="search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Cari nomor nota (CW-...), nama pelanggan, atau no. telepon..."
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                        </div>

                        <div className="w-full sm:w-52">
                            <label
                                htmlFor={tahapSelectId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Tahap Produksi
                            </label>
                            <select
                                id={tahapSelectId}
                                name="tahap_status"
                                value={tahapStatus}
                                onChange={(event) =>
                                    setTahapStatus(
                                        event.target.value as
                                            | TahapProduksiCode
                                            | '',
                                    )
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="">Semua Tahap</option>
                                {STAGE_ORDER.map((stage) => (
                                    <option key={stage} value={stage}>
                                        {formatTahapProduksi(stage)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full sm:w-52">
                            <label
                                htmlFor={statusSelectId}
                                className="block text-xs font-semibold text-slate-700"
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="AKTIF">Antrean Aktif</option>
                                <option value="SELESAI">
                                    Selesai Produksi
                                </option>
                                <option value="ALL">
                                    Semua (Aktif &amp; Selesai)
                                </option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                                Terapkan Filter
                            </button>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </form>
                </search>
            </section>

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
                                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
                                >
                                    {/* Card Header */}
                                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-base font-bold text-slate-900">
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
                                                {item.tahap_produksi_terakhir && (
                                                    <ProductionStageBadge
                                                        stage={
                                                            item.tahap_produksi_terakhir
                                                        }
                                                    />
                                                )}
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
                                            <p className="mt-1 text-xs text-slate-500">
                                                Masuk:{' '}
                                                {formatTanggal(
                                                    item.tanggal_penerimaan,
                                                    { withTime: true },
                                                )}{' '}
                                                &bull; Penerima:{' '}
                                                {item.petugas.nama_petugas}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.bisa_timbang_ulang && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openTimbangModal(item)
                                                    }
                                                    className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                                                >
                                                    Timbang Ulang
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
                                                    className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                                >
                                                    Laporkan Insiden
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
                                                    className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {advancingNota ===
                                                    item.nomor_nota
                                                        ? 'Memproses...'
                                                        : `Lanjut ke ${formatTahapProduksi(nextStage)} \u2192`}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Customer, Service & Clothing Details */}
                                    <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
                                        {/* Customer + Service Summary */}
                                        <div className="space-y-3 lg:col-span-5">
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-slate-900">
                                                        {item.pelanggan.nama}
                                                    </p>
                                                    <PayLaterBadge
                                                        allowed={
                                                            item.pelanggan
                                                                .boleh_bayar_akhir
                                                        }
                                                    />
                                                </div>
                                                <p className="mt-1 font-mono text-[11px] text-slate-600">
                                                    {item.pelanggan.no_telepon}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {item.pelanggan.alamat}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="font-bold text-slate-900">
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
                                                    />
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                                                    <span className="rounded-md bg-white px-2 py-0.5 font-medium ring-1 ring-slate-200">
                                                        {
                                                            item.layanan
                                                                .metode_hitung
                                                        }{' '}
                                                        ({item.layanan.satuan})
                                                    </span>
                                                    <span className="rounded-md bg-white px-2 py-0.5 font-medium ring-1 ring-slate-200">
                                                        {item.layanan
                                                            .perlu_setrika
                                                            ? 'Perlu Setrika'
                                                            : 'Tanpa Setrika'}
                                                    </span>
                                                    <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold tabular-nums text-sky-800 ring-1 ring-sky-200">
                                                        {item.berat_atau_jumlah}{' '}
                                                        {item.layanan.satuan}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-[11px] text-slate-600">
                                                    Tarif snapshot:{' '}
                                                    <strong className="tabular-nums text-slate-900">
                                                        {formatRupiah(
                                                            item.harga_satuan_snapshot,
                                                        )}
                                                        /{item.layanan.satuan}
                                                    </strong>{' '}
                                                    &bull; Total:{' '}
                                                    <strong className="tabular-nums text-slate-900">
                                                        {formatRupiah(
                                                            item.total_harga,
                                                        )}
                                                    </strong>
                                                </p>
                                                {item.catatan_khusus && (
                                                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-[11px] text-amber-950">
                                                        <span className="font-semibold">
                                                            Catatan khusus:
                                                        </span>{' '}
                                                        {item.catatan_khusus}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Detail Pakaian + Ordered Pipeline */}
                                        <div className="space-y-4 lg:col-span-7">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
                                                        Rincian Pakaian (
                                                        {
                                                            item.detail_pakaian
                                                                .length
                                                        }{' '}
                                                        item &bull;{' '}
                                                        {totalPotong} potong)
                                                    </h3>
                                                    {item.laporan_insiden
                                                        .length > 0 && (
                                                        <span className="text-[11px] font-semibold text-rose-700">
                                                            {
                                                                item
                                                                    .laporan_insiden
                                                                    .length
                                                            }{' '}
                                                            laporan insiden
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-xs">
                                                    {item.detail_pakaian.map(
                                                        (detail) => (
                                                            <li
                                                                key={
                                                                    detail.id_detail
                                                                }
                                                                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2"
                                                            >
                                                                <div>
                                                                    <span className="font-semibold text-slate-900">
                                                                        {
                                                                            detail.jenis_pakaian
                                                                        }
                                                                    </span>
                                                                    <span className="ml-2 text-slate-500">
                                                                        —{' '}
                                                                        {
                                                                            detail.kondisi_pakaian
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <span className="font-semibold tabular-nums text-slate-800">
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

                                            {/* Pipeline & Last Update */}
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                    Alur Tahap Produksi Layanan
                                                </p>
                                                <ol className="mt-2 flex flex-wrap items-center gap-2">
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
                                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
                                                                            isCurrent
                                                                                ? 'bg-sky-600 text-white ring-sky-600 shadow-xs'
                                                                                : isCompleted
                                                                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                                                  : 'bg-white text-slate-500 ring-slate-200'
                                                                        }`}
                                                                    >
                                                                        <span>
                                                                            {
                                                                                tahap.urutan
                                                                            }
                                                                            .
                                                                        </span>
                                                                        <span>
                                                                            {formatTahapProduksi(
                                                                                tahap.nama_tahap,
                                                                            )}
                                                                        </span>
                                                                    </span>
                                                                    {index <
                                                                        orderedStages.length -
                                                                            1 && (
                                                                        <span
                                                                            aria-hidden="true"
                                                                            className="text-slate-300"
                                                                        >
                                                                            &rarr;
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            );
                                                        },
                                                    )}
                                                </ol>

                                                {latestHistory && (
                                                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2 text-[11px] text-slate-600">
                                                        <span>
                                                            Update terakhir:{' '}
                                                            <strong className="text-slate-800">
                                                                {latestHistory
                                                                    .pegawai
                                                                    ?.nama_pegawai ??
                                                                    (latestHistory.id_pegawai !==
                                                                    null
                                                                        ? `Pegawai #${latestHistory.id_pegawai}`
                                                                        : 'Kasir saat penerimaan')}
                                                            </strong>
                                                        </span>
                                                        <span className="tabular-nums">
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
                                </article>
                            );
                        })}

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
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
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={timbangFormId}
                            disabled={timbangForm.processing || !timbangTarget}
                            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {timbangForm.processing
                                ? 'Menyimpan...'
                                : 'Simpan Berat Aktual'}
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
                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950">
                            <p className="font-semibold">
                                Tarif Snapshot Nota Terkunci (KK-09)
                            </p>
                            <p className="mt-1 leading-relaxed">
                                Perhitungan tetap menggunakan tarif snapshot{' '}
                                <strong className="tabular-nums">
                                    {formatRupiah(
                                        timbangTarget.harga_satuan_snapshot,
                                    )}
                                    /kg
                                </strong>{' '}
                                (berat awal:{' '}
                                <strong className="tabular-nums">
                                    {timbangTarget.berat_atau_jumlah} kg
                                </strong>
                                ).
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor={beratInputId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Berat Aktual (kg){' '}
                                <span aria-hidden="true" className="text-rose-600">
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {timbangForm.errors.berat_aktual && (
                                <p
                                    id={beratErrorId}
                                    role="alert"
                                    className="mt-1 text-xs font-medium text-rose-600"
                                >
                                    {timbangForm.errors.berat_aktual}
                                </p>
                            )}
                        </div>

                        {/* Live Recalculation Preview */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                            <p className="font-semibold text-slate-800">
                                Pratinjau Dampak Tagihan
                            </p>
                            <dl className="mt-2 space-y-1.5">
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">
                                        Subtotal Baru
                                    </dt>
                                    <dd className="font-semibold tabular-nums text-slate-900">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                timbangSubtotalBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">
                                        Total Tagihan Baru
                                    </dt>
                                    <dd className="font-bold tabular-nums text-slate-900">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                timbangTotalHargaBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">
                                        Sudah Dibayar
                                    </dt>
                                    <dd className="font-semibold tabular-nums text-sky-700">
                                        {formatRupiah(
                                            timbangTarget.total_dibayar,
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                                    <dt className="font-semibold text-slate-700">
                                        Estimasi Sisa Tagihan
                                    </dt>
                                    <dd className="font-bold tabular-nums text-amber-700">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                timbangSisaBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                                {timbangKelebihanTunaiCents > 0 && (
                                    <div className="flex justify-between text-emerald-700">
                                        <dt className="font-semibold">
                                            Kelebihan Bayar Tunai
                                        </dt>
                                        <dd className="font-bold tabular-nums">
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
                                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-900"
                            >
                                <p className="font-bold">
                                    Peringatan Status Pembayaran (KK-01)
                                </p>
                                <p className="mt-1 leading-relaxed">
                                    Nota ini saat ini berstatus{' '}
                                    <strong>LUNAS</strong>. Karena tagihan baru
                                    melebihi total yang sudah dibayar, status
                                    pembayaran akan otomatis turun menjadi{' '}
                                    <strong>BELUM_LUNAS</strong>.
                                </p>
                            </div>
                        )}

                        {!willDowngradeFromLunas &&
                            timbangTarget.status_pembayaran === 'LUNAS' && (
                                <p className="text-[11px] text-slate-500">
                                    Catatan KK-01: Jika berat aktual menaikkan
                                    total tagihan melampaui nominal yang sudah
                                    dibayar, status <strong>LUNAS</strong> akan
                                    turun ke <strong>BELUM_LUNAS</strong>.
                                </p>
                            )}

                        {willUpgradeToLunas && (
                            <div
                                role="status"
                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900"
                            >
                                Total tagihan baru sudah tertutupi oleh
                                pembayaran masuk, sehingga status pembayaran
                                akan menjadi <strong>LUNAS</strong>.
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor={catatanInputId}
                                className="block text-xs font-semibold text-slate-700"
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {timbangForm.errors.catatan && (
                                <p
                                    id={catatanErrorId}
                                    role="alert"
                                    className="mt-1 text-xs font-medium text-rose-600"
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
