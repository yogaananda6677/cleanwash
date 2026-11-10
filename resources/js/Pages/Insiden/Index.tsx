import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import KonfirmasiKompensasiModal, {
    type KonfirmasiKompensasiTarget,
} from '@/Components/KonfirmasiKompensasiModal';
import LaporkanInsidenModal from '@/Components/LaporkanInsidenModal';
import Pagination from '@/Components/Pagination';
import {
    JenisInsidenBadge,
    StatusBadge,
    StatusKonfirmasiBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    formatRupiah,
    formatTanggal,
    parseDecimalToCents,
} from '@/lib/format';
import type {
    InsidenIndexProps,
    JenisInsiden,
    LaporanInsidenDetailItem,
    StatusKonfirmasiInsiden,
} from '@/types';

function toConfirmationTarget(
    item: LaporanInsidenDetailItem,
): KonfirmasiKompensasiTarget {
    return {
        id_laporan: item.id_laporan,
        nomor_nota: item.nomor_nota,
        jenis_insiden: item.jenis_insiden,
        keterangan: item.keterangan,
        estimasi_kompensasi: item.estimasi_kompensasi,
        pelanggan_nama: item.transaksi.pelanggan.nama,
        detail_pakaian: item.detail_pakaian,
        pegawai_pelapor: item.pegawai_pelapor,
        sisa_tagihan: item.transaksi.sisa_tagihan,
        total_harga: item.transaksi.total_harga,
        total_dibayar: item.transaksi.total_dibayar,
    };
}

export default function InsidenIndex({
    auth,
    laporan,
    filters,
    pendingCount,
    eligibleTransaksiOptions,
}: InsidenIndexProps) {
    const filterId = useId();
    const searchInputId = `${filterId}-search`;
    const jenisSelectId = `${filterId}-jenis`;
    const statusSelectId = `${filterId}-status`;
    const tableCaptionId = useId();

    const isPetugas = auth.user?.role === 'PETUGAS';

    const [search, setSearch] = useState(filters.search ?? '');
    const [jenisInsiden, setJenisInsiden] = useState<JenisInsiden | ''>(
        filters.jenis_insiden ?? '',
    );
    const [statusKonfirmasi, setStatusKonfirmasi] = useState<
        StatusKonfirmasiInsiden | ''
    >(filters.status_konfirmasi ?? '');

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [konfirmasiTarget, setKonfirmasiTarget] =
        useState<KonfirmasiKompensasiTarget | null>(null);

    useEffect(() => {
        setSearch(filters.search ?? '');
        setJenisInsiden(filters.jenis_insiden ?? '');
        setStatusKonfirmasi(filters.status_konfirmasi ?? '');
    }, [filters.search, filters.jenis_insiden, filters.status_konfirmasi]);

    const applyFilters = (
        nextSearch: string,
        nextJenis: JenisInsiden | '',
        nextStatus: StatusKonfirmasiInsiden | '',
    ) => {
        router.get(
            '/insiden',
            {
                search: nextSearch.trim() || undefined,
                jenis_insiden: nextJenis || undefined,
                status_konfirmasi: nextStatus || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, jenisInsiden, statusKonfirmasi);
    };

    const handleResetFilters = () => {
        setSearch('');
        setJenisInsiden('');
        setStatusKonfirmasi('');
        router.get('/insiden', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters =
        filters.search !== '' ||
        filters.jenis_insiden !== '' ||
        filters.status_konfirmasi !== '';

    return (
        <AppLayout
            title="Insiden & Kompensasi"
            subtitle="Pelaporan kerusakan/kehilangan pakaian per detail item dan pemotongan saldo transaksi (KK-04, KK-05)"
            headerActions={
                <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge tone={pendingCount > 0 ? 'amber' : 'emerald'}>
                        {pendingCount} Menunggu Konfirmasi
                    </StatusBadge>
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700"
                    >
                        + Laporkan Insiden
                    </button>
                </div>
            }
        >
            <Head title="Insiden & Kompensasi" />

            {/* Search & Filters */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
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
                                Cari Insiden
                            </label>
                            <input
                                id={searchInputId}
                                name="search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Cari nomor nota, nama pelanggan, jenis pakaian, atau keterangan..."
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                        </div>

                        <div className="w-full sm:w-48">
                            <label
                                htmlFor={jenisSelectId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Jenis Insiden
                            </label>
                            <select
                                id={jenisSelectId}
                                name="jenis_insiden"
                                value={jenisInsiden}
                                onChange={(event) =>
                                    setJenisInsiden(
                                        event.target.value as JenisInsiden | '',
                                    )
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="">Semua Jenis</option>
                                <option value="RUSAK">Rusak (5&times;)</option>
                                <option value="HILANG">
                                    Hilang (10&times;)
                                </option>
                            </select>
                        </div>

                        <div className="w-full sm:w-56">
                            <label
                                htmlFor={statusSelectId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Status Konfirmasi
                            </label>
                            <select
                                id={statusSelectId}
                                name="status_konfirmasi"
                                value={statusKonfirmasi}
                                onChange={(event) =>
                                    setStatusKonfirmasi(
                                        event.target.value as
                                            | StatusKonfirmasiInsiden
                                            | '',
                                    )
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="">Semua Status</option>
                                <option value="MENUNGGU_KONFIRMASI">
                                    Menunggu Konfirmasi
                                </option>
                                <option value="TERKONFIRMASI">
                                    Terkonfirmasi
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

            {/* Incident Reports Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {laporan.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Laporan insiden tidak ditemukan"
                            description={
                                hasActiveFilters
                                    ? 'Tidak ada laporan insiden yang cocok dengan filter pencarian atau status saat ini.'
                                    : 'Belum ada laporan kerusakan atau kehilangan pakaian yang tercatat.'
                            }
                            actionLabel={
                                hasActiveFilters
                                    ? 'Reset Filter'
                                    : '+ Laporkan Insiden'
                            }
                            onAction={
                                hasActiveFilters
                                    ? handleResetFilters
                                    : () => setCreateModalOpen(true)
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
                                    Daftar laporan kerusakan dan kehilangan
                                    pakaian beserta status konfirmasi kompensasi
                                </caption>
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Nota &amp; Pelanggan
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Item Pakaian &amp; Insiden
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Pelapor &amp; Petugas
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Estimasi &amp; Kompensasi
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Status Konfirmasi
                                        </th>
                                        {isPetugas && (
                                            <th
                                                scope="col"
                                                className="px-5 py-3.5 text-right"
                                            >
                                                Aksi
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {laporan.data.map((item) => {
                                        const isPending =
                                            item.status_konfirmasi ===
                                            'MENUNGGU_KONFIRMASI';
                                        const hasKelebihan =
                                            parseDecimalToCents(
                                                item.kelebihan_ganti_rugi,
                                            ) > 0;

                                        return (
                                            <tr
                                                key={item.id_laporan}
                                                className="align-top hover:bg-slate-50/70"
                                            >
                                                <th
                                                    scope="row"
                                                    className="whitespace-nowrap px-5 py-4 text-left font-normal"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {isPetugas ? (
                                                            <Link
                                                                href={`/transaksi/${item.nomor_nota}`}
                                                                className="font-mono text-sm font-bold text-sky-700 hover:text-sky-800 hover:underline"
                                                            >
                                                                {
                                                                    item.nomor_nota
                                                                }
                                                            </Link>
                                                        ) : (
                                                            <span className="font-mono text-sm font-bold text-slate-900">
                                                                {
                                                                    item.nomor_nota
                                                                }
                                                            </span>
                                                        )}
                                                        <TransactionStatusBadge
                                                            status={
                                                                item.transaksi
                                                                    .status_transaksi
                                                            }
                                                        />
                                                    </div>
                                                    <p className="mt-1 text-xs font-semibold text-slate-900">
                                                        {
                                                            item.transaksi
                                                                .pelanggan.nama
                                                        }
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {
                                                            item.transaksi
                                                                .pelanggan
                                                                .no_telepon
                                                        }{' '}
                                                        &bull;{' '}
                                                        {
                                                            item.transaksi
                                                                .layanan
                                                                .nama_layanan
                                                        }
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-slate-400">
                                                        Laporan #
                                                        {item.id_laporan}{' '}
                                                        &bull;{' '}
                                                        {formatTanggal(
                                                            item.created_at,
                                                            { withTime: true },
                                                        )}
                                                    </p>
                                                </th>

                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <JenisInsidenBadge
                                                            jenis={
                                                                item.jenis_insiden
                                                            }
                                                        />
                                                        <span className="text-xs font-semibold text-slate-900">
                                                            {
                                                                item
                                                                    .detail_pakaian
                                                                    .jenis_pakaian
                                                            }{' '}
                                                            &times;{' '}
                                                            {
                                                                item
                                                                    .detail_pakaian
                                                                    .jumlah_potong
                                                            }{' '}
                                                            pcs
                                                        </span>
                                                    </div>
                                                    <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-700">
                                                        {item.keterangan}
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-slate-400">
                                                        Kondisi awal:{' '}
                                                        {
                                                            item.detail_pakaian
                                                                .kondisi_pakaian
                                                        }
                                                    </p>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-xs">
                                                    <div>
                                                        <p className="text-[11px] text-slate-500">
                                                            Pelapor:
                                                        </p>
                                                        <p className="font-semibold text-slate-900">
                                                            {item
                                                                .pegawai_pelapor
                                                                ?.nama_pegawai ??
                                                                'Langsung oleh Petugas'}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2">
                                                        <p className="text-[11px] text-slate-500">
                                                            Petugas
                                                            Konfirmator:
                                                        </p>
                                                        <p
                                                            className={
                                                                item.petugas
                                                                    ? 'font-semibold text-emerald-700'
                                                                    : 'text-slate-400'
                                                            }
                                                        >
                                                            {item.petugas
                                                                ?.nama_petugas ??
                                                                'Belum dikonfirmasi'}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right text-xs tabular-nums">
                                                    <p className="text-[11px] text-slate-500">
                                                        Estimasi:{' '}
                                                        <span className="font-semibold text-slate-700">
                                                            {formatRupiah(
                                                                item.estimasi_kompensasi,
                                                            )}
                                                        </span>
                                                    </p>
                                                    <p className="mt-1 text-sm font-bold text-slate-900">
                                                        {isPending
                                                            ? '—'
                                                            : formatRupiah(
                                                                  item.nilai_kompensasi,
                                                              )}
                                                    </p>
                                                    {hasKelebihan && (
                                                        <p className="mt-1 inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                                                            Ganti rugi tunai:{' '}
                                                            {formatRupiah(
                                                                item.kelebihan_ganti_rugi,
                                                            )}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4">
                                                    <StatusKonfirmasiBadge
                                                        status={
                                                            item.status_konfirmasi
                                                        }
                                                    />
                                                    <p className="mt-1.5 text-[11px] tabular-nums text-slate-500">
                                                        Sisa nota:{' '}
                                                        {formatRupiah(
                                                            item.transaksi
                                                                .sisa_tagihan,
                                                        )}
                                                    </p>
                                                </td>

                                                {isPetugas && (
                                                    <td className="whitespace-nowrap px-5 py-4 text-right">
                                                        <div className="flex flex-col items-end gap-2">
                                                            {isPending && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setKonfirmasiTarget(
                                                                            toConfirmationTarget(
                                                                                item,
                                                                            ),
                                                                        )
                                                                    }
                                                                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                                                                >
                                                                    Konfirmasi &amp;
                                                                    Potong Saldo
                                                                </button>
                                                            )}
                                                            <Link
                                                                href={`/transaksi/${item.nomor_nota}`}
                                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                            >
                                                                Buka Nota
                                                            </Link>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            paginated={laporan}
                            itemLabel="laporan insiden"
                        />
                    </>
                )}
            </section>

            {/* Modal + Laporkan Insiden */}
            <LaporkanInsidenModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                role={auth.user?.role}
                submitMode="global"
                transaksiOptions={eligibleTransaksiOptions}
            />

            {/* Modal Konfirmasi & Potong Saldo (Khusus PETUGAS) */}
            {isPetugas && (
                <KonfirmasiKompensasiModal
                    target={konfirmasiTarget}
                    onClose={() => setKonfirmasiTarget(null)}
                />
            )}
        </AppLayout>
    );
}
