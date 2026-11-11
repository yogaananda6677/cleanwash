import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Plus,
} from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar, {
    FILTER_LABEL_CLASS,
    FILTER_SELECT_CLASS,
} from '@/Components/FilterToolbar';
import KonfirmasiKompensasiModal, {
    type KonfirmasiKompensasiTarget,
} from '@/Components/KonfirmasiKompensasiModal';
import LaporkanInsidenModal from '@/Components/LaporkanInsidenModal';
import MetadataRow from '@/Components/MetadataRow';
import Pagination from '@/Components/Pagination';
import StatTile from '@/Components/StatTile';
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

    const handleTogglePendingFilter = () => {
        const nextStatus: StatusKonfirmasiInsiden | '' =
            statusKonfirmasi === 'MENUNGGU_KONFIRMASI'
                ? ''
                : 'MENUNGGU_KONFIRMASI';
        setStatusKonfirmasi(nextStatus);
        applyFilters(search, jenisInsiden, nextStatus);
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
                        className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-[#BE123C] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-800"
                    >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            <span className="sr-only">+ </span>Laporkan Insiden
                        </span>
                    </button>
                </div>
            }
        >
            <Head title="Insiden & Kompensasi" />

            {/* Quick Summary & Filter Tiles */}
            <section
                aria-label="Ringkasan laporan insiden"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
                <StatTile
                    label="Menunggu Konfirmasi"
                    value={pendingCount}
                    hint={
                        statusKonfirmasi === 'MENUNGGU_KONFIRMASI'
                            ? 'Klik untuk tampilkan semua status'
                            : pendingCount > 0
                              ? 'Klik untuk menyaring laporan yang perlu konfirmasi kasir'
                              : 'Tidak ada laporan menunggu konfirmasi'
                    }
                    tone={pendingCount > 0 ? 'amber' : 'emerald'}
                    icon={
                        <AlertTriangle
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    }
                    active={statusKonfirmasi === 'MENUNGGU_KONFIRMASI'}
                    onClick={handleTogglePendingFilter}
                />
                <StatTile
                    label="Total Laporan Sesuai Filter"
                    value={laporan.total}
                    hint={
                        hasActiveFilters
                            ? 'Menampilkan jumlah laporan sesuai pencarian/filter aktif'
                            : 'Total seluruh laporan kerusakan dan kehilangan tercatat'
                    }
                    tone="neutral"
                    icon={
                        <ClipboardList
                            className="h-4 w-4"
                            aria-hidden="true"
                        />
                    }
                />
            </section>

            {/* Search & Filters */}
            <FilterToolbar
                className="mt-5"
                ariaLabel="Filter laporan insiden"
                onSubmit={handleSearchSubmit}
                searchValue={search}
                onSearchChange={setSearch}
                searchId={searchInputId}
                searchLabel="Cari Insiden"
                searchPlaceholder="Cari nomor nota, nama pelanggan, jenis pakaian, atau keterangan..."
                submitLabel="Terapkan Filter"
                onReset={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
            >
                <div className="w-full sm:w-44 lg:shrink-0">
                    <label
                        htmlFor={jenisSelectId}
                        className={FILTER_LABEL_CLASS}
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
                        className={FILTER_SELECT_CLASS}
                    >
                        <option value="">Semua Jenis</option>
                        <option value="RUSAK">Rusak (5&times;)</option>
                        <option value="HILANG">Hilang (10&times;)</option>
                    </select>
                </div>

                <div className="w-full sm:w-52 lg:shrink-0">
                    <label
                        htmlFor={statusSelectId}
                        className={FILTER_LABEL_CLASS}
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
                        className={FILTER_SELECT_CLASS}
                    >
                        <option value="">Semua Status</option>
                        <option value="MENUNGGU_KONFIRMASI">
                            Menunggu Konfirmasi
                        </option>
                        <option value="TERKONFIRMASI">Terkonfirmasi</option>
                    </select>
                </div>
            </FilterToolbar>

            {/* Incident Reports Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
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
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                                <caption
                                    id={tableCaptionId}
                                    className="sr-only"
                                >
                                    Daftar laporan kerusakan dan kehilangan
                                    pakaian beserta status konfirmasi kompensasi
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
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
                                <tbody className="divide-y divide-[#D8E2E6] bg-white">
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
                                                className="align-top transition hover:bg-[#F8FAFC]"
                                            >
                                                <th
                                                    scope="row"
                                                    className="whitespace-nowrap px-5 py-4 text-left font-normal"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {isPetugas ? (
                                                            <Link
                                                                href={`/transaksi/${item.nomor_nota}`}
                                                                className="font-mono text-sm font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
                                                            >
                                                                {
                                                                    item.nomor_nota
                                                                }
                                                            </Link>
                                                        ) : (
                                                            <span className="font-mono text-sm font-bold text-[#0F172A]">
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
                                                    <p className="mt-1 text-xs font-semibold text-[#0F172A]">
                                                        {
                                                            item.transaksi
                                                                .pelanggan.nama
                                                        }
                                                    </p>
                                                    <MetadataRow
                                                        className="mt-0.5 text-[11px]"
                                                        items={[
                                                            <span
                                                                key="tel"
                                                                className="font-mono"
                                                            >
                                                                {
                                                                    item
                                                                        .transaksi
                                                                        .pelanggan
                                                                        .no_telepon
                                                                }
                                                            </span>,
                                                            <span key="layanan">
                                                                {
                                                                    item
                                                                        .transaksi
                                                                        .layanan
                                                                        .nama_layanan
                                                                }
                                                            </span>,
                                                        ]}
                                                    />
                                                    <p className="mt-1 text-[11px] text-[#5B697A]">
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
                                                        <span className="text-xs font-semibold text-[#0F172A]">
                                                            {
                                                                item
                                                                    .detail_pakaian
                                                                    .jenis_pakaian
                                                            }{' '}
                                                            &times;{' '}
                                                            <span className="font-mono tabular-nums">
                                                                {
                                                                    item
                                                                        .detail_pakaian
                                                                        .jumlah_potong
                                                                }
                                                            </span>{' '}
                                                            pcs
                                                        </span>
                                                    </div>
                                                    <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#475569]">
                                                        {item.keterangan}
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-[#5B697A]">
                                                        Kondisi awal:{' '}
                                                        {
                                                            item.detail_pakaian
                                                                .kondisi_pakaian
                                                        }
                                                    </p>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-xs">
                                                    <div>
                                                        <p className="text-[11px] text-[#5B697A]">
                                                            Pelapor:
                                                        </p>
                                                        <p className="font-semibold text-[#0F172A]">
                                                            {item
                                                                .pegawai_pelapor
                                                                ?.nama_pegawai ??
                                                                'Langsung oleh Petugas'}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2">
                                                        <p className="text-[11px] text-[#5B697A]">
                                                            Petugas
                                                            Konfirmator:
                                                        </p>
                                                        <p
                                                            className={
                                                                item.petugas
                                                                    ? 'font-semibold text-[#065F46]'
                                                                    : 'text-[#5B697A]'
                                                            }
                                                        >
                                                            {item.petugas
                                                                ?.nama_petugas ??
                                                                'Belum dikonfirmasi'}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right text-xs tabular-nums">
                                                    <p className="text-[11px] text-[#5B697A]">
                                                        Estimasi:{' '}
                                                        <span className="font-mono font-semibold text-[#475569]">
                                                            {formatRupiah(
                                                                item.estimasi_kompensasi,
                                                            )}
                                                        </span>
                                                    </p>
                                                    <p className="mt-1 font-mono text-sm font-bold text-[#0F172A]">
                                                        {isPending
                                                            ? '—'
                                                            : formatRupiah(
                                                                  item.nilai_kompensasi,
                                                              )}
                                                    </p>
                                                    {hasKelebihan && (
                                                        <p className="mt-1 inline-block rounded-md border border-amber-300 bg-[#FFFBEB] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#78350F]">
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
                                                    <p className="mt-1.5 font-mono text-[11px] tabular-nums text-[#5B697A]">
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
                                                                    className="inline-flex min-h-[2.375rem] items-center gap-1.5 rounded-xl bg-[#047857] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800"
                                                                >
                                                                    <CheckCircle2
                                                                        className="h-3.5 w-3.5 shrink-0"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span>
                                                                        Konfirmasi
                                                                        &amp;
                                                                        Potong
                                                                        Saldo
                                                                    </span>
                                                                </button>
                                                            )}
                                                            <Link
                                                                href={`/transaksi/${item.nomor_nota}`}
                                                                className="inline-flex min-h-[2.25rem] items-center rounded-xl border border-[#7C8C9D] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
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
