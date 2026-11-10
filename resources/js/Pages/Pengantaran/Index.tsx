import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import {
    ItemPengantaranStatusBadge,
    PayLaterBadge,
    PaymentStatusBadge,
    PengantaranStatusBadge,
    SpeedTierBadge,
    StatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    formatRupiah,
    formatStatusPengantaran,
    formatTanggal,
    getTodayJakartaDateString,
    parseDecimalToCents,
} from '@/lib/format';
import type {
    PengantaranIndexProps,
    StatusPengantaran,
} from '@/types';

const STATUS_ORDER: StatusPengantaran[] = [
    'DIJADWALKAN',
    'BERJALAN',
    'SELESAI',
];

const STATUS_CARD_STYLES: Record<
    StatusPengantaran,
    { active: string; idle: string; count: string; hint: string }
> = {
    DIJADWALKAN: {
        active: 'border-sky-500 bg-sky-50 ring-2 ring-sky-200',
        idle: 'border-slate-200 bg-white hover:border-sky-300',
        count: 'text-sky-700',
        hint: 'Menunggu kurir berangkat',
    },
    BERJALAN: {
        active: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
        idle: 'border-slate-200 bg-white hover:border-amber-300',
        count: 'text-amber-700',
        hint: 'Sedang dalam pengantaran',
    },
    SELESAI: {
        active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
        idle: 'border-slate-200 bg-white hover:border-emerald-300',
        count: 'text-emerald-700',
        hint: 'Seluruh item telah tuntas',
    },
};

export default function PengantaranIndex({
    auth,
    pengantaran,
    filters,
    kurirOptions,
    eligibleTransaksiOptions,
    statusCounts,
}: PengantaranIndexProps) {
    const isPetugas = auth.user?.role === 'PETUGAS';

    const filterId = useId();
    const searchInputId = `${filterId}-search`;
    const statusSelectId = `${filterId}-status`;
    const tanggalInputId = `${filterId}-tanggal`;
    const kurirSelectId = `${filterId}-kurir`;
    const tableCaptionId = useId();

    const createFormId = useId();
    const createKurirId = `${createFormId}-kurir`;
    const createKurirErrId = `${createFormId}-kurir-err`;
    const createTanggalId = `${createFormId}-tanggal`;
    const createTanggalErrId = `${createFormId}-tanggal-err`;
    const createNotaFilterId = `${createFormId}-nota-filter`;
    const createNotaErrId = `${createFormId}-nota-err`;

    const [search, setSearch] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState<StatusPengantaran | ''>(
        filters.status_pengantaran ?? '',
    );
    const [tanggalFilter, setTanggalFilter] = useState(
        filters.tanggal_pengantaran ?? '',
    );
    const [kurirFilter, setKurirFilter] = useState(
        filters.id_petugas_antar ?? '',
    );

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [notaSearchQuery, setNotaSearchQuery] = useState('');
    const [notaValidationError, setNotaValidationError] = useState<
        string | null
    >(null);

    const activeKurirOptions = useMemo(
        () => kurirOptions.filter((kurir) => kurir.is_active),
        [kurirOptions],
    );
    const todayJakarta = getTodayJakartaDateString();

    const createForm = useForm<{
        id_petugas_antar: string;
        tanggal_pengantaran: string;
        nomor_nota_list: string[];
    }>({
        id_petugas_antar: activeKurirOptions[0]
            ? String(activeKurirOptions[0].id_petugas_antar)
            : '',
        tanggal_pengantaran: todayJakarta,
        nomor_nota_list: [],
    });

    useEffect(() => {
        setSearch(filters.search ?? '');
        setStatusFilter(filters.status_pengantaran ?? '');
        setTanggalFilter(filters.tanggal_pengantaran ?? '');
        setKurirFilter(filters.id_petugas_antar ?? '');
    }, [
        filters.search,
        filters.status_pengantaran,
        filters.tanggal_pengantaran,
        filters.id_petugas_antar,
    ]);

    const applyFilters = (
        nextSearch: string,
        nextStatus: StatusPengantaran | '',
        nextTanggal: string,
        nextKurir: string,
    ) => {
        router.get(
            '/pengantaran',
            {
                search: nextSearch.trim() || undefined,
                status_pengantaran: nextStatus || undefined,
                tanggal_pengantaran: nextTanggal || undefined,
                id_petugas_antar:
                    isPetugas && nextKurir ? nextKurir : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, statusFilter, tanggalFilter, kurirFilter);
    };

    const handleStatusCardClick = (status: StatusPengantaran) => {
        const nextStatus = statusFilter === status ? '' : status;
        setStatusFilter(nextStatus);
        applyFilters(search, nextStatus, tanggalFilter, kurirFilter);
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('');
        setTanggalFilter('');
        setKurirFilter('');
        router.get('/pengantaran', {}, { preserveState: true, replace: true });
    };

    const openCreateModal = () => {
        createForm.clearErrors();
        setNotaValidationError(null);
        setNotaSearchQuery('');
        createForm.setData({
            id_petugas_antar: activeKurirOptions[0]
                ? String(activeKurirOptions[0].id_petugas_antar)
                : '',
            tanggal_pengantaran: getTodayJakartaDateString(),
            nomor_nota_list: [],
        });
        setCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (createForm.processing) {
            return;
        }
        createForm.clearErrors();
        setNotaValidationError(null);
        setCreateModalOpen(false);
    };

    const filteredEligibleOptions = useMemo(() => {
        const query = notaSearchQuery.trim().toLowerCase();
        if (!query) {
            return eligibleTransaksiOptions;
        }
        return eligibleTransaksiOptions.filter(
            (opt) =>
                opt.nomor_nota.toLowerCase().includes(query) ||
                opt.pelanggan.nama.toLowerCase().includes(query) ||
                opt.pelanggan.no_telepon.toLowerCase().includes(query) ||
                opt.pelanggan.alamat.toLowerCase().includes(query),
        );
    }, [eligibleTransaksiOptions, notaSearchQuery]);

    const toggleNotaSelection = (nomorNota: string) => {
        setNotaValidationError(null);
        createForm.clearErrors('nomor_nota_list');
        createForm.setData((prev) => {
            const exists = prev.nomor_nota_list.includes(nomorNota);
            return {
                ...prev,
                nomor_nota_list: exists
                    ? prev.nomor_nota_list.filter((n) => n !== nomorNota)
                    : [...prev.nomor_nota_list, nomorNota],
            };
        });
    };

    const selectedUniqueCustomersCount = useMemo(() => {
        const selectedSet = new Set(createForm.data.nomor_nota_list);
        const customerIds = new Set<number>();
        for (const opt of eligibleTransaksiOptions) {
            if (selectedSet.has(opt.nomor_nota)) {
                customerIds.add(opt.pelanggan.id_pelanggan);
            }
        }
        return customerIds.size;
    }, [createForm.data.nomor_nota_list, eligibleTransaksiOptions]);

    const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (createForm.data.nomor_nota_list.length === 0) {
            setNotaValidationError(
                'Pilih minimal 1 nomor nota transaksi berstatus SELESAI untuk dijadwalkan.',
            );
            return;
        }

        createForm.transform((formData) => ({
            id_petugas_antar: Number(formData.id_petugas_antar),
            tanggal_pengantaran: formData.tanggal_pengantaran,
            nomor_nota_list: formData.nomor_nota_list,
        }));

        createForm.post('/pengantaran', {
            preserveScroll: true,
            onSuccess: () => {
                createForm.clearErrors();
                setNotaValidationError(null);
                setCreateModalOpen(false);
            },
        });
    };

    const hasActiveFilters =
        filters.search !== '' ||
        filters.status_pengantaran !== '' ||
        filters.tanggal_pengantaran !== '' ||
        (isPetugas && filters.id_petugas_antar !== '');

    const createErrorsRecord = createForm.errors as Record<
        string,
        string | undefined
    >;
    const indexedNotaError = Object.entries(createErrorsRecord).find(([key]) =>
        key.startsWith('nomor_nota_list.'),
    )?.[1];
    const combinedNotaError =
        createForm.errors.nomor_nota_list ??
        indexedNotaError ??
        notaValidationError;

    return (
        <AppLayout
            title={isPetugas ? 'Manajemen Pengantaran' : 'Jadwal Pengantaran'}
            subtitle={
                isPetugas
                    ? 'Jadwalkan pengantaran multi-pelanggan (KK-07), tugaskan kurir, dan pantau status pengantaran'
                    : 'Daftar rute pengantaran multi-pelanggan yang ditugaskan kepada Anda'
            }
            headerActions={
                isPetugas ? (
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                    >
                        + Buat Jadwal Pengantaran
                    </button>
                ) : undefined
            }
        >
            <Head
                title={
                    isPetugas ? 'Manajemen Pengantaran' : 'Jadwal Pengantaran'
                }
            />

            {/* Status Summary Cards */}
            <section
                aria-label="Ringkasan status pengantaran"
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
                {STATUS_ORDER.map((status) => {
                    const active = statusFilter === status;
                    const styles = STATUS_CARD_STYLES[status];

                    return (
                        <button
                            key={status}
                            type="button"
                            aria-pressed={active}
                            onClick={() => handleStatusCardClick(status)}
                            className={`flex items-center justify-between rounded-2xl border p-4 text-left shadow-xs transition ${
                                active ? styles.active : styles.idle
                            }`}
                        >
                            <div>
                                <p className="text-xs font-semibold text-slate-600">
                                    {formatStatusPengantaran(status)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                    {styles.hint}
                                </p>
                            </div>
                            <span
                                className={`text-2xl font-bold tabular-nums ${styles.count}`}
                            >
                                {statusCounts[status] ?? 0}
                            </span>
                        </button>
                    );
                })}
            </section>

            {/* Search & Filters */}
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <search>
                    <form
                        method="GET"
                        onSubmit={handleSearchSubmit}
                        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end"
                    >
                        <div
                            className={
                                isPetugas ? 'lg:col-span-4' : 'lg:col-span-5'
                            }
                        >
                            <label
                                htmlFor={searchInputId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Cari Pengantaran
                            </label>
                            <input
                                id={searchInputId}
                                name="search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Nomor nota, nama/telepon pelanggan, atau kurir..."
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                        </div>

                        <div className="lg:col-span-2">
                            <label
                                htmlFor={statusSelectId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Status Sesi
                            </label>
                            <select
                                id={statusSelectId}
                                name="status_pengantaran"
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target.value as
                                            | StatusPengantaran
                                            | '',
                                    )
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="">Semua Status</option>
                                {STATUS_ORDER.map((st) => (
                                    <option key={st} value={st}>
                                        {formatStatusPengantaran(st)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div
                            className={
                                isPetugas ? 'lg:col-span-2' : 'lg:col-span-3'
                            }
                        >
                            <label
                                htmlFor={tanggalInputId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Tanggal Antar
                            </label>
                            <input
                                id={tanggalInputId}
                                name="tanggal_pengantaran"
                                type="date"
                                value={tanggalFilter}
                                onChange={(event) =>
                                    setTanggalFilter(event.target.value)
                                }
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                        </div>

                        {isPetugas && (
                            <div className="lg:col-span-2">
                                <label
                                    htmlFor={kurirSelectId}
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    Kurir
                                </label>
                                <select
                                    id={kurirSelectId}
                                    name="id_petugas_antar"
                                    value={kurirFilter}
                                    onChange={(event) =>
                                        setKurirFilter(event.target.value)
                                    }
                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                >
                                    <option value="">Semua Kurir</option>
                                    {kurirOptions.map((kurir) => (
                                        <option
                                            key={kurir.id_petugas_antar}
                                            value={kurir.id_petugas_antar}
                                        >
                                            {kurir.nama_petugas_antar}
                                            {!kurir.is_active
                                                ? ' (Nonaktif)'
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-2 lg:col-span-2">
                            <button
                                type="submit"
                                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                                Terapkan
                            </button>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </form>
                </search>
            </section>

            {/* Delivery Sessions Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {pengantaran.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Sesi pengantaran tidak ditemukan"
                            description={
                                hasActiveFilters
                                    ? 'Tidak ada sesi pengantaran yang cocok dengan filter pencarian atau status saat ini.'
                                    : isPetugas
                                      ? 'Belum ada jadwal pengantaran tercatat. Buat jadwal baru untuk nota yang telah selesai diproduksi.'
                                      : 'Belum ada jadwal pengantaran yang ditugaskan kepada Anda.'
                            }
                            actionLabel={
                                hasActiveFilters
                                    ? 'Reset Filter'
                                    : isPetugas
                                      ? '+ Buat Jadwal Pengantaran'
                                      : undefined
                            }
                            onAction={
                                hasActiveFilters
                                    ? handleResetFilters
                                    : isPetugas
                                      ? openCreateModal
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
                            className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        >
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <caption
                                    id={tableCaptionId}
                                    className="sr-only"
                                >
                                    Daftar sesi pengantaran laundry beserta
                                    kurir, progres item, dan ringkasan pelanggan
                                </caption>
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Sesi &amp; Tanggal
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Kurir Bertugas
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Status &amp; Progres
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Daftar Nota &amp; Pelanggan
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3.5 text-right"
                                        >
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {pengantaran.data.map((sesi) => {
                                        const visibleItems = sesi.items.slice(
                                            0,
                                            3,
                                        );
                                        const remainingCount = Math.max(
                                            0,
                                            sesi.items.length -
                                                visibleItems.length,
                                        );

                                        return (
                                            <tr
                                                key={sesi.id_pengantaran}
                                                className="align-top hover:bg-slate-50/70"
                                            >
                                                <th
                                                    scope="row"
                                                    className="whitespace-nowrap px-5 py-4 text-left font-normal"
                                                >
                                                    <Link
                                                        href={`/pengantaran/${sesi.id_pengantaran}`}
                                                        className="font-mono text-sm font-bold text-sky-700 hover:text-sky-800 hover:underline"
                                                    >
                                                        Sesi #
                                                        {sesi.id_pengantaran}
                                                    </Link>
                                                    <p className="mt-1 text-xs font-medium text-slate-700">
                                                        {formatTanggal(
                                                            sesi.tanggal_pengantaran,
                                                        )}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                                        Dibuat{' '}
                                                        {formatTanggal(
                                                            sesi.created_at,
                                                            { withTime: true },
                                                        )}
                                                    </p>
                                                </th>

                                                <td className="whitespace-nowrap px-5 py-4 text-xs">
                                                    <p className="font-semibold text-slate-900">
                                                        {
                                                            sesi
                                                                .petugas_pengantaran
                                                                .nama_petugas_antar
                                                        }
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                                        {sesi.total_item} nota
                                                        pelanggan
                                                    </p>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-xs">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <PengantaranStatusBadge
                                                            status={
                                                                sesi.status_pengantaran
                                                            }
                                                        />
                                                        {sesi.item_gagal_count >
                                                            0 && (
                                                            <StatusBadge tone="rose">
                                                                {
                                                                    sesi.item_gagal_count
                                                                }{' '}
                                                                Gagal
                                                            </StatusBadge>
                                                        )}
                                                    </div>
                                                    <p className="mt-1.5 text-[11px] font-medium tabular-nums text-slate-600">
                                                        {
                                                            sesi.item_selesai_count
                                                        }
                                                        /{sesi.total_item} item
                                                        tuntas
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <ul className="space-y-1.5 text-xs">
                                                        {visibleItems.map(
                                                            (item) => (
                                                                <li
                                                                    key={
                                                                        item.id_item_antar
                                                                    }
                                                                    className="flex flex-wrap items-center gap-1.5"
                                                                >
                                                                    <span className="font-mono font-semibold text-slate-800">
                                                                        {
                                                                            item.nomor_nota
                                                                        }
                                                                    </span>
                                                                    <span className="text-slate-500">
                                                                        —{' '}
                                                                        {
                                                                            item
                                                                                .transaksi
                                                                                .pelanggan
                                                                                .nama
                                                                        }
                                                                    </span>
                                                                    <ItemPengantaranStatusBadge
                                                                        status={
                                                                            item.status_terima_pelanggan
                                                                        }
                                                                    />
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                    {remainingCount > 0 && (
                                                        <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                                                            +{remainingCount}{' '}
                                                            item lainnya
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                                    <Link
                                                        href={`/pengantaran/${sesi.id_pengantaran}`}
                                                        className="inline-flex items-center rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-100"
                                                    >
                                                        Buka Sesi &rarr;
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            paginated={pengantaran}
                            itemLabel="sesi pengantaran"
                        />
                    </>
                )}
            </section>

            {/* Modal Buat Jadwal Multi-Pelanggan (PETUGAS) */}
            {isPetugas && (
                <Modal
                    open={createModalOpen}
                    onClose={closeCreateModal}
                    closeDisabled={createForm.processing}
                    maxWidth="2xl"
                    title="Buat Jadwal Pengantaran Multi-Pelanggan"
                    subtitle="Kelompokkan satu atau beberapa nota SELESAI lintas pelanggan ke dalam satu sesi kurir (KK-07)"
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={closeCreateModal}
                                disabled={createForm.processing}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form={createFormId}
                                disabled={
                                    createForm.processing ||
                                    activeKurirOptions.length === 0 ||
                                    eligibleTransaksiOptions.length === 0
                                }
                                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createForm.processing
                                    ? 'Menyimpan...'
                                    : `Buat Jadwal (${createForm.data.nomor_nota_list.length} Nota)`}
                            </button>
                        </>
                    }
                >
                    <form
                        id={createFormId}
                        onSubmit={handleCreateSubmit}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor={createKurirId}
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    Kurir Pengantaran Aktif{' '}
                                    <span
                                        aria-hidden="true"
                                        className="text-rose-600"
                                    >
                                        *
                                    </span>
                                </label>
                                <select
                                    id={createKurirId}
                                    name="id_petugas_antar"
                                    required
                                    autoFocus
                                    value={createForm.data.id_petugas_antar}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'id_petugas_antar',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(
                                        createForm.errors.id_petugas_antar,
                                    )}
                                    aria-describedby={
                                        createForm.errors.id_petugas_antar
                                            ? createKurirErrId
                                            : undefined
                                    }
                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                >
                                    {activeKurirOptions.length === 0 ? (
                                        <option value="">
                                            Tidak ada kurir aktif
                                        </option>
                                    ) : (
                                        activeKurirOptions.map((kurir) => (
                                            <option
                                                key={kurir.id_petugas_antar}
                                                value={kurir.id_petugas_antar}
                                            >
                                                {kurir.nama_petugas_antar}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {createForm.errors.id_petugas_antar && (
                                    <p
                                        id={createKurirErrId}
                                        role="alert"
                                        className="mt-1 text-xs font-medium text-rose-600"
                                    >
                                        {createForm.errors.id_petugas_antar}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor={createTanggalId}
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    Tanggal Pengantaran{' '}
                                    <span
                                        aria-hidden="true"
                                        className="text-rose-600"
                                    >
                                        *
                                    </span>
                                </label>
                                <input
                                    id={createTanggalId}
                                    name="tanggal_pengantaran"
                                    type="date"
                                    required
                                    min={todayJakarta}
                                    value={createForm.data.tanggal_pengantaran}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'tanggal_pengantaran',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(
                                        createForm.errors.tanggal_pengantaran,
                                    )}
                                    aria-describedby={
                                        createForm.errors.tanggal_pengantaran
                                            ? createTanggalErrId
                                            : undefined
                                    }
                                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                />
                                {createForm.errors.tanggal_pengantaran && (
                                    <p
                                        id={createTanggalErrId}
                                        role="alert"
                                        className="mt-1 text-xs font-medium text-rose-600"
                                    >
                                        {createForm.errors.tanggal_pengantaran}
                                    </p>
                                )}
                            </div>
                        </div>

                        <fieldset className="rounded-xl border border-slate-200 p-3.5">
                            <legend className="px-1 text-xs font-semibold text-slate-700">
                                Pilih Nota Transaksi SELESAI (
                                {createForm.data.nomor_nota_list.length} nota,{' '}
                                {selectedUniqueCustomersCount} pelanggan)
                            </legend>

                            {eligibleTransaksiOptions.length === 0 ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                                    Belum ada transaksi berstatus{' '}
                                    <strong>SELESAI</strong> yang bebas dari
                                    jadwal pengantaran aktif.
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex-1">
                                            <label
                                                htmlFor={createNotaFilterId}
                                                className="sr-only"
                                            >
                                                Saring daftar nota eligible
                                            </label>
                                            <input
                                                id={createNotaFilterId}
                                                type="search"
                                                value={notaSearchQuery}
                                                onChange={(event) =>
                                                    setNotaSearchQuery(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Filter nota atau nama/alamat pelanggan..."
                                                className="block w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNotaValidationError(
                                                        null,
                                                    );
                                                    createForm.clearErrors(
                                                        'nomor_nota_list',
                                                    );
                                                    createForm.setData(
                                                        'nomor_nota_list',
                                                        filteredEligibleOptions.map(
                                                            (o) => o.nomor_nota,
                                                        ),
                                                    );
                                                }}
                                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                Pilih Tampak
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    createForm.setData(
                                                        'nomor_nota_list',
                                                        [],
                                                    )
                                                }
                                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                Kosongkan
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                        {filteredEligibleOptions.map((opt) => {
                                            const checked =
                                                createForm.data.nomor_nota_list.includes(
                                                    opt.nomor_nota,
                                                );
                                            const sisaCents =
                                                parseDecimalToCents(
                                                    opt.sisa_tagihan,
                                                );

                                            return (
                                                <label
                                                    key={opt.nomor_nota}
                                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition ${
                                                        checked
                                                            ? 'border-sky-400 bg-sky-50/70 ring-1 ring-sky-200'
                                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        name="nomor_nota_list[]"
                                                        value={opt.nomor_nota}
                                                        checked={checked}
                                                        onChange={() =>
                                                            toggleNotaSelection(
                                                                opt.nomor_nota,
                                                            )
                                                        }
                                                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-sky-600"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="font-mono font-bold text-slate-900">
                                                                {opt.nomor_nota}
                                                            </span>
                                                            <SpeedTierBadge
                                                                tier={
                                                                    opt.layanan
                                                                        .tingkat_kecepatan
                                                                }
                                                            />
                                                            <PaymentStatusBadge
                                                                status={
                                                                    opt.status_pembayaran
                                                                }
                                                            />
                                                            <PayLaterBadge
                                                                allowed={
                                                                    opt
                                                                        .pelanggan
                                                                        .boleh_bayar_akhir
                                                                }
                                                            />
                                                            {opt.has_previous_failed_delivery && (
                                                                <StatusBadge tone="rose">
                                                                    Pernah Gagal
                                                                    Antar
                                                                </StatusBadge>
                                                            )}
                                                            {opt.insiden_pending_count >
                                                                0 && (
                                                                <StatusBadge tone="amber">
                                                                    {
                                                                        opt.insiden_pending_count
                                                                    }{' '}
                                                                    Insiden
                                                                    Pending
                                                                </StatusBadge>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 font-semibold text-slate-900">
                                                            {opt.pelanggan.nama}{' '}
                                                            <span className="font-normal text-slate-500">
                                                                (
                                                                {
                                                                    opt
                                                                        .pelanggan
                                                                        .no_telepon
                                                                }
                                                                )
                                                            </span>
                                                        </p>
                                                        <p className="mt-0.5 text-[11px] text-slate-600">
                                                            {
                                                                opt.pelanggan
                                                                    .alamat
                                                            }
                                                        </p>
                                                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                                                            <span>
                                                                {
                                                                    opt.layanan
                                                                        .nama_layanan
                                                                }{' '}
                                                                (
                                                                {
                                                                    opt.berat_atau_jumlah
                                                                }{' '}
                                                                {
                                                                    opt.layanan
                                                                        .satuan
                                                                }
                                                                )
                                                            </span>
                                                            <span
                                                                className={`font-semibold tabular-nums ${
                                                                    sisaCents >
                                                                    0
                                                                        ? 'text-amber-700'
                                                                        : 'text-emerald-700'
                                                                }`}
                                                            >
                                                                Sisa:{' '}
                                                                {formatRupiah(
                                                                    opt.sisa_tagihan,
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {combinedNotaError && (
                                <p
                                    id={createNotaErrId}
                                    role="alert"
                                    className="mt-2 text-xs font-medium text-rose-600"
                                >
                                    {combinedNotaError}
                                </p>
                            )}
                        </fieldset>
                    </form>
                </Modal>
            )}
        </AppLayout>
    );
}
