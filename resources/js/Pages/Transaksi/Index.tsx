import { Head, Link, router } from '@inertiajs/react';
import { PlusCircle, Printer } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar, {
    FILTER_LABEL_CLASS,
    FILTER_SELECT_CLASS,
} from '@/Components/FilterToolbar';
import MetadataRow from '@/Components/MetadataRow';
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
import type {
    StatusPembayaran,
    StatusTransaksi,
    TransaksiIndexProps,
} from '@/types';

export default function TransaksiIndex({
    transaksi,
    filters,
}: TransaksiIndexProps) {
    const tableCaptionId = useId();
    const [search, setSearch] = useState(filters.search ?? '');
    const [statusPembayaran, setStatusPembayaran] = useState<
        StatusPembayaran | ''
    >(filters.status_pembayaran ?? '');
    const [statusTransaksi, setStatusTransaksi] = useState<
        StatusTransaksi | ''
    >(filters.status_transaksi ?? '');

    useEffect(() => {
        setSearch(filters.search ?? '');
        setStatusPembayaran(filters.status_pembayaran ?? '');
        setStatusTransaksi(filters.status_transaksi ?? '');
    }, [
        filters.search,
        filters.status_pembayaran,
        filters.status_transaksi,
    ]);

    const applyFilters = (
        nextSearch: string,
        nextStatusPembayaran: StatusPembayaran | '',
        nextStatusTransaksi: StatusTransaksi | '',
    ) => {
        router.get(
            '/transaksi',
            {
                search: nextSearch.trim() || undefined,
                status_pembayaran: nextStatusPembayaran || undefined,
                status_transaksi: nextStatusTransaksi || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, statusPembayaran, statusTransaksi);
    };

    const handleStatusPembayaranChange = (
        nextStatus: StatusPembayaran | '',
    ) => {
        setStatusPembayaran(nextStatus);
        applyFilters(search, nextStatus, statusTransaksi);
    };

    const handleStatusTransaksiChange = (nextStatus: StatusTransaksi | '') => {
        setStatusTransaksi(nextStatus);
        applyFilters(search, statusPembayaran, nextStatus);
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusPembayaran('');
        setStatusTransaksi('');
        router.get('/transaksi', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters =
        filters.search !== '' ||
        (filters.status_pembayaran ?? '') !== '' ||
        (filters.status_transaksi ?? '') !== '';

    return (
        <AppLayout
            title="Daftar Transaksi"
            subtitle="Cari nomor nota, pantau pembayaran DP/pelunasan, tahap produksi, serta insiden/penyesuaian"
            headerActions={
                <Link
                    href="/transaksi/create"
                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                >
                    <PlusCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                        <span className="sr-only">+ </span>Buat Nota Baru
                    </span>
                </Link>
            }
        >
            <Head title="Daftar Transaksi" />

            <FilterToolbar
                onSubmit={handleSearchSubmit}
                ariaLabel="Filter dan pencarian daftar transaksi"
                searchId="search-transaksi"
                searchLabel="Cari Nomor Nota / Pelanggan"
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Cari nomor nota (CW-...), nama pelanggan, atau no. telepon..."
                submitLabel="Cari"
                onReset={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
            >
                <div className="w-full lg:w-52">
                    <label
                        htmlFor="filter-status-pembayaran"
                        className={FILTER_LABEL_CLASS}
                    >
                        Status Pembayaran
                    </label>
                    <select
                        id="filter-status-pembayaran"
                        value={statusPembayaran}
                        onChange={(event) =>
                            handleStatusPembayaranChange(
                                event.target.value as StatusPembayaran | '',
                            )
                        }
                        className={FILTER_SELECT_CLASS}
                    >
                        <option value="">Semua Status Pembayaran</option>
                        <option value="BELUM_BAYAR">Belum Bayar</option>
                        <option value="DP">DP</option>
                        <option value="BELUM_LUNAS">Belum Lunas</option>
                        <option value="LUNAS">Lunas</option>
                    </select>
                </div>
                <div className="w-full lg:w-44">
                    <label
                        htmlFor="filter-status-transaksi"
                        className={FILTER_LABEL_CLASS}
                    >
                        Status Transaksi
                    </label>
                    <select
                        id="filter-status-transaksi"
                        value={statusTransaksi}
                        onChange={(event) =>
                            handleStatusTransaksiChange(
                                event.target.value as StatusTransaksi | '',
                            )
                        }
                        className={FILTER_SELECT_CLASS}
                    >
                        <option value="">Semua Status</option>
                        <option value="AKTIF">AKTIF</option>
                        <option value="SELESAI">SELESAI</option>
                        <option value="DIAMBIL">DIAMBIL</option>
                        <option value="DIBATALKAN">DIBATALKAN</option>
                    </select>
                </div>
            </FilterToolbar>

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                {transaksi.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Transaksi belum ditemukan"
                            description={
                                hasActiveFilters
                                    ? 'Tidak ada transaksi yang sesuai dengan filter pencarian, status pembayaran, atau status transaksi.'
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
                        <div
                            tabIndex={0}
                            role="region"
                            aria-labelledby={tableCaptionId}
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                                <caption
                                    id={tableCaptionId}
                                    className="sr-only"
                                >
                                    Daftar transaksi laundry CleanWash beserta
                                    status pembayaran dan tahap produksi
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Nomor Nota
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Pelanggan
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Layanan
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Total Tagihan
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Dibayar / Sisa
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Status Pembayaran &amp; Produksi
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D8E2E6]/70 bg-white">
                                    {transaksi.data.map((item) => {
                                        const latestStageCode =
                                            item.tahap_produksi_terakhir ??
                                            item.riwayat_status_produksi[
                                                item.riwayat_status_produksi
                                                    .length - 1
                                            ]?.tahap_status ??
                                            null;
                                        const hasVoucher =
                                            parseDecimalToCents(
                                                item.nilai_voucher_snapshot,
                                            ) > 0;
                                        const hasKompensasi =
                                            parseDecimalToCents(
                                                item.total_kompensasi,
                                            ) > 0;
                                        const hasBiayaBatal =
                                            parseDecimalToCents(
                                                item.biaya_pembatalan,
                                            ) > 0;
                                        const hasPengembalian =
                                            parseDecimalToCents(
                                                item.total_pengembalian_pelanggan,
                                            ) > 0;
                                        const isDibatalkan =
                                            item.status_transaksi ===
                                            'DIBATALKAN';

                                        return (
                                            <tr
                                                key={item.nomor_nota}
                                                className="align-top transition hover:bg-[#F8FAFC]"
                                            >
                                                <th
                                                    scope="row"
                                                    className="whitespace-nowrap px-5 py-4 text-left font-normal"
                                                >
                                                    <Link
                                                        href={`/transaksi/${item.nomor_nota}`}
                                                        className="font-mono text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                                                    >
                                                        {item.nomor_nota}
                                                    </Link>
                                                    <p className="mt-0.5 text-[11px] tabular-nums text-[#5B697A]">
                                                        {formatTanggal(
                                                            item.tanggal_penerimaan,
                                                            { withTime: true },
                                                        )}
                                                    </p>
                                                    <MetadataRow
                                                        className="mt-1"
                                                        items={[
                                                            item.status_transaksi,
                                                            isDibatalkan &&
                                                                (hasBiayaBatal
                                                                    ? 'Batal + Biaya'
                                                                    : 'Batal Gratis'),
                                                        ]}
                                                    />
                                                </th>

                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-[#0F172A]">
                                                        {item.pelanggan.nama}
                                                    </p>
                                                    <MetadataRow
                                                        className="mt-1"
                                                        items={[
                                                            <span
                                                                key="telp"
                                                                className="font-mono tabular-nums"
                                                            >
                                                                {
                                                                    item
                                                                        .pelanggan
                                                                        .no_telepon
                                                                }
                                                            </span>,
                                                            <PayLaterBadge
                                                                key="paylater"
                                                                allowed={
                                                                    item
                                                                        .pelanggan
                                                                        .boleh_bayar_akhir
                                                                }
                                                                variant={
                                                                    item
                                                                        .pelanggan
                                                                        .boleh_bayar_akhir
                                                                        ? 'badge'
                                                                        : 'text'
                                                                }
                                                            />,
                                                        ]}
                                                    />
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-[#0F172A]">
                                                        {
                                                            item.layanan
                                                                .nama_layanan
                                                        }
                                                    </p>
                                                    <MetadataRow
                                                        className="mt-1"
                                                        items={[
                                                            <SpeedTierBadge
                                                                key="speed"
                                                                tier={
                                                                    item.layanan
                                                                        .tingkat_kecepatan
                                                                }
                                                                variant="text"
                                                            />,
                                                            <span
                                                                key="qty"
                                                                className="font-mono tabular-nums"
                                                            >
                                                                {
                                                                    item.berat_atau_jumlah
                                                                }{' '}
                                                                {
                                                                    item.layanan
                                                                        .satuan
                                                                }{' '}
                                                                &times;{' '}
                                                                {formatRupiah(
                                                                    item.harga_satuan_snapshot,
                                                                )}
                                                            </span>,
                                                        ]}
                                                    />
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                                                    <p className="font-mono font-bold text-[#0F172A]">
                                                        {formatRupiah(
                                                            item.total_harga,
                                                        )}
                                                    </p>
                                                    {hasVoucher && (
                                                        <p className="mt-0.5 font-mono text-[11px] font-medium text-[#065F46]">
                                                            Voucher -
                                                            {formatRupiah(
                                                                item.nilai_voucher_snapshot,
                                                            )}
                                                        </p>
                                                    )}
                                                    {hasKompensasi && (
                                                        <p className="mt-0.5 font-mono text-[11px] font-medium text-[#065F46]">
                                                            Kompensasi -
                                                            {formatRupiah(
                                                                item.total_kompensasi,
                                                            )}
                                                        </p>
                                                    )}
                                                    {hasBiayaBatal && (
                                                        <p className="mt-0.5 font-mono text-[11px] font-medium text-[#9F1239]">
                                                            Biaya Batal{' '}
                                                            {formatRupiah(
                                                                item.biaya_pembatalan,
                                                            )}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-xs tabular-nums">
                                                    <p className="font-medium text-[#2563EB]">
                                                        Dibayar:{' '}
                                                        {formatRupiah(
                                                            item.total_dibayar,
                                                        )}
                                                    </p>
                                                    <p className="mt-0.5 font-semibold text-[#78350F]">
                                                        Sisa:{' '}
                                                        {formatRupiah(
                                                            item.sisa_tagihan,
                                                        )}
                                                    </p>
                                                    {hasPengembalian && (
                                                        <p className="mt-0.5 text-[11px] font-semibold text-[#3730A3]">
                                                            Kembali:{' '}
                                                            {formatRupiah(
                                                                item.total_pengembalian_pelanggan,
                                                            )}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        <PaymentStatusBadge
                                                            status={
                                                                item.status_pembayaran
                                                            }
                                                        />
                                                        {isDibatalkan ? (
                                                            <TransactionStatusBadge
                                                                status={
                                                                    item.status_transaksi
                                                                }
                                                            />
                                                        ) : latestStageCode ? (
                                                            <ProductionStageBadge
                                                                stage={
                                                                    latestStageCode
                                                                }
                                                            />
                                                        ) : (
                                                            <TransactionStatusBadge
                                                                status={
                                                                    item.status_transaksi
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                    {item.insiden_pending_count >
                                                        0 && (
                                                        <p className="mt-1.5 text-[11px] font-semibold text-[#78350F]">
                                                            {
                                                                item.insiden_pending_count
                                                            }{' '}
                                                            Insiden Pending
                                                        </p>
                                                    )}
                                                    {item.insiden_pending_count ===
                                                        0 &&
                                                        item.laporan_insiden
                                                            .length > 0 && (
                                                            <p className="mt-1.5 text-[11px] text-[#5B697A]">
                                                                {
                                                                    item
                                                                        .laporan_insiden
                                                                        .length
                                                                }{' '}
                                                                Insiden
                                                                Terkonfirmasi
                                                            </p>
                                                        )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <Link
                                                            href={`/transaksi/${item.nomor_nota}`}
                                                            className="inline-flex min-h-[2.25rem] items-center rounded-xl border border-[#7C8C9D] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                                                        >
                                                            Detail
                                                        </Link>
                                                        <Link
                                                            href={`/transaksi/${item.nomor_nota}/nota`}
                                                            className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                                                        >
                                                            <Printer
                                                                className="h-3.5 w-3.5 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Cetak Nota
                                                            </span>
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
