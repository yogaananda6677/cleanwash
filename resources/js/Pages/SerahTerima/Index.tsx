import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';
import PelunasanModal, {
    type PelunasanModalTarget,
} from '@/Components/PelunasanModal';
import SerahTerimaModal, {
    type SerahTerimaModalTarget,
} from '@/Components/SerahTerimaModal';
import {
    ItemPengantaranStatusBadge,
    PayLaterBadge,
    PaymentStatusBadge,
    SpeedTierBadge,
    StatusBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatRupiah, formatTanggal, parseDecimalToCents } from '@/lib/format';
import type { SerahTerimaIndexProps, TransaksiDetail } from '@/types';

type SerahTerimaMode = SerahTerimaIndexProps['filters']['mode'];

const MODE_TABS: Array<{
    key: SerahTerimaMode;
    label: string;
    description: string;
}> = [
    {
        key: 'SIAP_AMBIL',
        label: 'Siap Diambil (SELESAI)',
        description: 'Transaksi selesai produksi menunggu serah terima loket',
    },
    {
        key: 'PIUTANG',
        label: 'Piutang (BELUM_LUNAS)',
        description:
            'Pakaian sudah diambil pelanggan boleh_bayar_akhir dengan sisa tagihan',
    },
    {
        key: 'RIWAYAT_DIAMBIL',
        label: 'Riwayat Diambil',
        description: 'Seluruh transaksi berstatus DIAMBIL',
    },
];

export default function SerahTerimaIndex({
    transaksi,
    filters,
    summary,
}: SerahTerimaIndexProps) {
    const filterId = useId();
    const searchInputId = `${filterId}-search`;
    const tableCaptionId = useId();

    const [search, setSearch] = useState(filters.search ?? '');
    const [mode, setMode] = useState<SerahTerimaMode>(
        filters.mode ?? 'SIAP_AMBIL',
    );
    const [pelunasanTarget, setPelunasanTarget] =
        useState<PelunasanModalTarget | null>(null);
    const [serahTerimaTarget, setSerahTerimaTarget] =
        useState<SerahTerimaModalTarget | null>(null);

    useEffect(() => {
        setSearch(filters.search ?? '');
        setMode(filters.mode ?? 'SIAP_AMBIL');
    }, [filters.search, filters.mode]);

    const applyFilters = (nextMode: SerahTerimaMode, nextSearch: string) => {
        router.get(
            '/serah-terima',
            {
                mode: nextMode,
                search: nextSearch.trim() || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(mode, search);
    };

    const handleModeChange = (nextMode: SerahTerimaMode) => {
        setMode(nextMode);
        applyFilters(nextMode, search);
    };

    const handleResetFilters = () => {
        setSearch('');
        applyFilters(mode, '');
    };

    const handleSwitchToPelunasan = (target: SerahTerimaModalTarget) => {
        setPelunasanTarget(target);
    };

    const hasSearchFilter = filters.search !== '';

    return (
        <AppLayout
            title="Loket Serah Terima & Pelunasan"
            subtitle="Verifikasi pengambilan pakaian (KK-06), pelunasan tagihan, dan pemantauan piutang pelanggan boleh_bayar_akhir"
            headerActions={
                <Link
                    href="/audit"
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Lihat Audit &amp; Piutang &rarr;
                </Link>
            }
        >
            <Head title="Loket Serah Terima & Pelunasan" />

            {/* Summary KPI Strip */}
            <section
                aria-label="Ringkasan antrean loket serah terima"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <button
                    type="button"
                    onClick={() => handleModeChange('SIAP_AMBIL')}
                    className={`rounded-2xl border p-4 text-left shadow-xs transition ${
                        mode === 'SIAP_AMBIL'
                            ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200'
                            : 'border-slate-200 bg-white hover:border-sky-300'
                    }`}
                >
                    <p className="text-xs font-medium text-slate-500">
                        Siap Diambil (SELESAI)
                    </p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-sky-700">
                        {summary.siap_ambil_count}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                        Nota selesai produksi menunggu pengambilan
                    </p>
                </button>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <p className="text-xs font-medium text-slate-500">
                        Sedang Diantar Kurir
                    </p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-indigo-700">
                        {summary.sedang_diantar_count}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                        Nota SELESAI berstatus DIAMBIL / DALAM_PERJALANAN
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => handleModeChange('PIUTANG')}
                    className={`rounded-2xl border p-4 text-left shadow-xs transition ${
                        mode === 'PIUTANG'
                            ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                            : 'border-slate-200 bg-white hover:border-amber-300'
                    }`}
                >
                    <p className="text-xs font-medium text-slate-500">
                        Nota Piutang Aktif (KK-06)
                    </p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-amber-700">
                        {summary.piutang_count}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                        Sudah DIAMBIL dengan status BELUM_LUNAS
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => handleModeChange('PIUTANG')}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-amber-300"
                >
                    <p className="text-xs font-medium text-slate-500">
                        Total Nominal Piutang
                    </p>
                    <p className="mt-1.5 text-2xl font-bold tabular-nums text-rose-700">
                        {formatRupiah(summary.total_piutang_nominal)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                        Akumulasi sisa tagihan pelanggan bayar akhir
                    </p>
                </button>
            </section>

            {/* Mode Tabs + Search */}
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <div
                    role="tablist"
                    aria-label="Mode antrean loket serah terima"
                    className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
                >
                    {MODE_TABS.map((tab) => {
                        const active = mode === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => handleModeChange(tab.key)}
                                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                                    active
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                {tab.label}
                                {tab.key === 'SIAP_AMBIL' && (
                                    <span
                                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                                            active
                                                ? 'bg-sky-700 text-white'
                                                : 'bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {summary.siap_ambil_count}
                                    </span>
                                )}
                                {tab.key === 'PIUTANG' && (
                                    <span
                                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                                            active
                                                ? 'bg-sky-700 text-white'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}
                                    >
                                        {summary.piutang_count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <search className="mt-4 block">
                    <form
                        method="GET"
                        onSubmit={handleSearchSubmit}
                        className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    >
                        <input type="hidden" name="mode" value={mode} />
                        <div className="flex-1">
                            <label
                                htmlFor={searchInputId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Cari Nomor Nota atau Pelanggan
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
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                                Cari
                            </button>
                            {hasSearchFilter && (
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

            {/* Queue Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {transaksi.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Tidak ada transaksi pada tab ini"
                            description={
                                hasSearchFilter
                                    ? 'Tidak ditemukan nota yang cocok dengan kata kunci pencarian.'
                                    : (MODE_TABS.find((t) => t.key === mode)
                                          ?.description ??
                                      'Belum ada data tersedia.')
                            }
                            actionLabel={
                                hasSearchFilter ? 'Reset Pencarian' : undefined
                            }
                            onAction={
                                hasSearchFilter ? handleResetFilters : undefined
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div
                            tabIndex={0}
                            role="region"
                            aria-labelledby={tableCaptionId}
                            className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        >
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <caption
                                    id={tableCaptionId}
                                    className="sr-only"
                                >
                                    Antrean transaksi loket serah terima dan
                                    pelunasan kasir mode {mode}
                                </caption>
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Nota &amp; Status
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Pelanggan &amp; Hak Bayar
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Layanan &amp; Pengantaran
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Tagihan &amp; Sisa
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Aksi Loket
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {transaksi.data.map(
                                        (item: TransaksiDetail) => {
                                            const sisaCents =
                                                parseDecimalToCents(
                                                    item.sisa_tagihan,
                                                );
                                            const blockedByKK06 =
                                                item.status_transaksi ===
                                                    'SELESAI' &&
                                                sisaCents > 0 &&
                                                !item.pelanggan
                                                    .boleh_bayar_akhir;

                                            return (
                                                <tr
                                                    key={item.nomor_nota}
                                                    className="align-top hover:bg-slate-50/70"
                                                >
                                                    <th
                                                        scope="row"
                                                        className="whitespace-nowrap px-5 py-4 text-left font-normal"
                                                    >
                                                        <Link
                                                            href={`/transaksi/${item.nomor_nota}`}
                                                            className="font-mono text-sm font-bold text-sky-700 hover:text-sky-800 hover:underline"
                                                        >
                                                            {item.nomor_nota}
                                                        </Link>
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-slate-400">
                                                            {item.diambil_pada
                                                                ? `Diambil: ${formatTanggal(item.diambil_pada, { withTime: true })}`
                                                                : `Masuk: ${formatTanggal(item.tanggal_penerimaan, { withTime: true })}`}
                                                        </p>
                                                    </th>

                                                    <td className="px-5 py-4 text-xs">
                                                        <p className="font-semibold text-slate-900">
                                                            {
                                                                item.pelanggan
                                                                    .nama
                                                            }
                                                        </p>
                                                        <p className="font-mono text-[11px] text-slate-500">
                                                            {
                                                                item.pelanggan
                                                                    .no_telepon
                                                            }
                                                        </p>
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                            <PayLaterBadge
                                                                allowed={
                                                                    item
                                                                        .pelanggan
                                                                        .boleh_bayar_akhir
                                                                }
                                                            />
                                                            {blockedByKK06 && (
                                                                <StatusBadge tone="rose">
                                                                    Wajib Lunas
                                                                    KK-06
                                                                </StatusBadge>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4 text-xs">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="font-medium text-slate-800">
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
                                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                                            {
                                                                item.berat_atau_jumlah
                                                            }{' '}
                                                            {
                                                                item.layanan
                                                                    .satuan
                                                            }
                                                        </p>

                                                        {item.pengantaran_aktif && (
                                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                                <ItemPengantaranStatusBadge
                                                                    status={
                                                                        item
                                                                            .pengantaran_aktif
                                                                            .status_terima_pelanggan
                                                                    }
                                                                />
                                                                {item
                                                                    .pengantaran_aktif
                                                                    .pengantaran && (
                                                                    <Link
                                                                        href={`/pengantaran/${item.pengantaran_aktif.pengantaran.id_pengantaran}`}
                                                                        className="text-[11px] font-semibold text-sky-700 hover:underline"
                                                                    >
                                                                        Sesi #
                                                                        {
                                                                            item
                                                                                .pengantaran_aktif
                                                                                .pengantaran
                                                                                .id_pengantaran
                                                                        }{' '}
                                                                        (
                                                                        {
                                                                            item
                                                                                .pengantaran_aktif
                                                                                .pengantaran
                                                                                .nama_petugas_antar
                                                                        }
                                                                        )
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-right text-xs">
                                                        <p className="text-slate-500">
                                                            Total:{' '}
                                                            <span className="font-semibold tabular-nums text-slate-800">
                                                                {formatRupiah(
                                                                    item.total_harga,
                                                                )}
                                                            </span>
                                                        </p>
                                                        <p className="mt-0.5 text-slate-500">
                                                            Dibayar:{' '}
                                                            <span className="font-semibold tabular-nums text-sky-700">
                                                                {formatRupiah(
                                                                    item.total_dibayar,
                                                                )}
                                                            </span>
                                                        </p>
                                                        <p className="mt-1 text-sm font-bold tabular-nums text-amber-700">
                                                            Sisa:{' '}
                                                            {formatRupiah(
                                                                item.sisa_tagihan,
                                                            )}
                                                        </p>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-2">
                                                            {item.bisa_pelunasan && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPelunasanTarget(
                                                                            item,
                                                                        )
                                                                    }
                                                                    className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                                                                >
                                                                    Catat
                                                                    Pelunasan
                                                                </button>
                                                            )}

                                                            {item.status_transaksi ===
                                                                'SELESAI' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSerahTerimaTarget(
                                                                            item,
                                                                        )
                                                                    }
                                                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                                                        item.bisa_serah_terima_loket
                                                                            ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                                                            : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                                                    }`}
                                                                >
                                                                    {item.sedang_diantar_kurir
                                                                        ? 'Info Kurir Aktif'
                                                                        : blockedByKK06
                                                                          ? 'Serah Terima (KK-06)'
                                                                          : 'Serah Terima'}
                                                                </button>
                                                            )}

                                                            <Link
                                                                href={`/transaksi/${item.nomor_nota}`}
                                                                className="text-[11px] font-semibold text-slate-600 hover:text-sky-700 hover:underline"
                                                            >
                                                                Detail Nota
                                                                &rarr;
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            paginated={transaksi}
                            itemLabel="transaksi"
                        />
                    </>
                )}
            </section>

            {/* Shared Modals */}
            <PelunasanModal
                target={pelunasanTarget}
                onClose={() => setPelunasanTarget(null)}
                redirectTo="serah-terima"
            />

            <SerahTerimaModal
                target={serahTerimaTarget}
                onClose={() => setSerahTerimaTarget(null)}
                onSwitchToPelunasan={handleSwitchToPelunasan}
                redirectTo="serah-terima"
            />
        </AppLayout>
    );
}
