import { Head, Link, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import Pagination from '@/Components/Pagination';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    ProductionStageBadge,
    SpeedTierBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatRupiah, formatTanggal, parseDecimalToCents } from '@/lib/format';
import type { StatusPembayaran, TransaksiIndexProps } from '@/types';

export default function TransaksiIndex({
    transaksi,
    filters,
}: TransaksiIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusPembayaran, setStatusPembayaran] = useState<
        StatusPembayaran | ''
    >(filters.status_pembayaran ?? '');

    const applyFilters = (
        nextSearch: string,
        nextStatus: StatusPembayaran | '',
    ) => {
        router.get(
            '/transaksi',
            {
                search: nextSearch.trim() || undefined,
                status_pembayaran: nextStatus || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, statusPembayaran);
    };

    const handleStatusChange = (nextStatus: StatusPembayaran | '') => {
        setStatusPembayaran(nextStatus);
        applyFilters(search, nextStatus);
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusPembayaran('');
        router.get('/transaksi', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters =
        filters.search !== '' || (filters.status_pembayaran ?? '') !== '';

    return (
        <AppLayout
            title="Daftar Transaksi"
            subtitle="Cari nomor nota, pantau pembayaran DP/pelunasan, dan cetak nota pelanggan"
            headerActions={
                <Link
                    href="/transaksi/create"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                >
                    + Buat Nota Baru
                </Link>
            }
        >
            <Head title="Daftar Transaksi" />

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <form
                    onSubmit={handleSearchSubmit}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <label htmlFor="search-transaksi" className="sr-only">
                            Cari nomor nota, nama, atau nomor telepon
                        </label>
                        <input
                            id="search-transaksi"
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nomor nota (CW-...), nama pelanggan, atau no. telepon..."
                            className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                    </div>
                    <div className="w-full sm:w-52">
                        <label
                            htmlFor="filter-status-pembayaran"
                            className="sr-only"
                        >
                            Filter status pembayaran
                        </label>
                        <select
                            id="filter-status-pembayaran"
                            value={statusPembayaran}
                            onChange={(event) =>
                                handleStatusChange(
                                    event.target.value as StatusPembayaran | '',
                                )
                            }
                            className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        >
                            <option value="">Semua Status Pembayaran</option>
                            <option value="BELUM_BAYAR">Belum Bayar</option>
                            <option value="DP">DP</option>
                            <option value="BELUM_LUNAS">Belum Lunas</option>
                            <option value="LUNAS">Lunas</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                            Cari
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
            </section>

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {transaksi.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Transaksi belum ditemukan"
                            description={
                                hasActiveFilters
                                    ? 'Tidak ada transaksi yang sesuai dengan filter pencarian atau status pembayaran.'
                                    : 'Belum ada transaksi tercatat. Mulai penerimaan pakaian pertama di loket kasir.'
                            }
                            actionLabel={
                                hasActiveFilters
                                    ? 'Reset Filter'
                                    : '+ Buat Nota Baru'
                            }
                            actionHref={
                                hasActiveFilters
                                    ? undefined
                                    : '/transaksi/create'
                            }
                            onAction={
                                hasActiveFilters
                                    ? handleResetFilters
                                    : undefined
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3.5">
                                            Nomor Nota
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Pelanggan
                                        </th>
                                        <th className="px-5 py-3.5">Layanan</th>
                                        <th className="px-5 py-3.5 text-right">
                                            Total Tagihan
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Dibayar / Sisa
                                        </th>
                                        <th className="px-5 py-3.5">
                                            Status Pembayaran & Produksi
                                        </th>
                                        <th className="px-5 py-3.5 text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {transaksi.data.map((item) => {
                                        const latestStage =
                                            item.riwayat_status_produksi[
                                                item.riwayat_status_produksi
                                                    .length - 1
                                            ];
                                        const hasVoucher =
                                            parseDecimalToCents(
                                                item.nilai_voucher_snapshot,
                                            ) > 0;

                                        return (
                                            <tr
                                                key={item.nomor_nota}
                                                className="hover:bg-slate-50/70"
                                            >
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <Link
                                                        href={`/transaksi/${item.nomor_nota}`}
                                                        className="font-mono text-sm font-bold text-sky-700 hover:text-sky-800 hover:underline"
                                                    >
                                                        {item.nomor_nota}
                                                    </Link>
                                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                                        {formatTanggal(
                                                            item.tanggal_penerimaan,
                                                            { withTime: true },
                                                        )}
                                                    </p>
                                                    <div className="mt-1">
                                                        <TransactionStatusBadge
                                                            status={
                                                                item.status_transaksi
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="font-semibold text-slate-900">
                                                        {item.pelanggan.nama}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {
                                                            item.pelanggan
                                                                .no_telepon
                                                        }
                                                    </p>
                                                    {item.pelanggan
                                                        .boleh_bayar_akhir && (
                                                        <div className="mt-1">
                                                            <PayLaterBadge
                                                                allowed
                                                            />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-medium text-slate-900">
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
                                                    <p className="mt-1 text-xs tabular-nums text-slate-600">
                                                        {item.berat_atau_jumlah}{' '}
                                                        {item.layanan.satuan}{' '}
                                                        &times;{' '}
                                                        {formatRupiah(
                                                            item.harga_satuan_snapshot,
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                    <p className="font-bold tabular-nums text-slate-900">
                                                        {formatRupiah(
                                                            item.total_harga,
                                                        )}
                                                    </p>
                                                    {hasVoucher && (
                                                        <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                                                            Voucher -
                                                            {formatRupiah(
                                                                item.nilai_voucher_snapshot,
                                                            )}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums">
                                                    <p className="text-xs font-medium text-slate-700">
                                                        Dibayar:{' '}
                                                        {formatRupiah(
                                                            item.total_dibayar,
                                                        )}
                                                    </p>
                                                    <p className="mt-0.5 text-xs font-semibold text-amber-700">
                                                        Sisa:{' '}
                                                        {formatRupiah(
                                                            item.sisa_tagihan,
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5">
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        <PaymentStatusBadge
                                                            status={
                                                                item.status_pembayaran
                                                            }
                                                        />
                                                        {latestStage && (
                                                            <ProductionStageBadge
                                                                stage={
                                                                    latestStage.tahap_status
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <Link
                                                            href={`/transaksi/${item.nomor_nota}`}
                                                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                        >
                                                            Detail
                                                        </Link>
                                                        <Link
                                                            href={`/transaksi/${item.nomor_nota}/nota`}
                                                            className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                                                        >
                                                            Cetak Nota
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
        </AppLayout>
    );
}
