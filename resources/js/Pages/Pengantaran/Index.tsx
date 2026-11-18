import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    MapPin,
    Plus,
    RotateCcw,
    Search,
    Truck,
} from 'lucide-react';
import {
    useEffect,
    useId,
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar, {
    FILTER_INPUT_CLASS,
    FILTER_LABEL_CLASS,
    FILTER_RESET_BUTTON_CLASS,
    FILTER_SELECT_CLASS,
    FILTER_SUBMIT_BUTTON_CLASS,
} from '@/Components/FilterToolbar';
import MetadataRow from '@/Components/MetadataRow';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import StatTile, { type StatTileTone } from '@/Components/StatTile';
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

const STATUS_TILE_META: Record<
    StatusPengantaran,
    { tone: StatTileTone; hint: string; icon: ReactNode }
> = {
    DIJADWALKAN: {
        tone: 'brand',
        hint: 'Menunggu kurir berangkat',
        icon: <Clock className="h-4 w-4" aria-hidden="true" />,
    },
    BERJALAN: {
        tone: 'amber',
        hint: 'Sedang dalam pengantaran',
        icon: <Truck className="h-4 w-4" aria-hidden="true" />,
    },
    SELESAI: {
        tone: 'emerald',
        hint: 'Seluruh item telah tuntas',
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
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
            preserveScroll: 'errors',
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
                        className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59]"
                    >
                        <Plus
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            <span className="sr-only">+ </span>Buat Jadwal
                            Pengantaran
                        </span>
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
                    const meta = STATUS_TILE_META[status];

                    return (
                        <StatTile
                            key={status}
                            label={formatStatusPengantaran(status)}
                            value={statusCounts[status] ?? 0}
                            hint={meta.hint}
                            tone={meta.tone}
                            icon={meta.icon}
                            active={active}
                            onClick={() => handleStatusCardClick(status)}
                        />
                    );
                })}
            </section>

            {/* Search & Filters */}
            <FilterToolbar
                className="mt-5"
                ariaLabel="Filter daftar sesi pengantaran"
                onSubmit={handleSearchSubmit}
            >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
                    <div
                        className={
                            isPetugas ? 'lg:col-span-4' : 'lg:col-span-5'
                        }
                    >
                        <label
                            htmlFor={searchInputId}
                            className={FILTER_LABEL_CLASS}
                        >
                            Cari Pengantaran
                        </label>
                        <div className="relative mt-1.5">
                            <Search
                                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B697A]"
                                aria-hidden="true"
                            />
                            <input
                                id={searchInputId}
                                name="search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Nomor nota, nama/telepon pelanggan, atau kurir..."
                                className="block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white py-2 pl-10 pr-3.5 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <label
                            htmlFor={statusSelectId}
                            className={FILTER_LABEL_CLASS}
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
                            className={FILTER_SELECT_CLASS}
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
                            className={FILTER_LABEL_CLASS}
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
                            className={FILTER_INPUT_CLASS}
                        />
                    </div>

                    {isPetugas && (
                        <div className="lg:col-span-2">
                            <label
                                htmlFor={kurirSelectId}
                                className={FILTER_LABEL_CLASS}
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
                                className={FILTER_SELECT_CLASS}
                            >
                                <option value="">Semua Kurir</option>
                                {kurirOptions.map((kurir) => (
                                    <option
                                        key={kurir.id_petugas_antar}
                                        value={kurir.id_petugas_antar}
                                    >
                                        {kurir.nama_petugas_antar}
                                        {!kurir.is_active ? ' (Nonaktif)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
                        <button
                            type="submit"
                            className={FILTER_SUBMIT_BUTTON_CLASS}
                        >
                            Terapkan
                        </button>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className={FILTER_RESET_BUTTON_CLASS}
                            >
                                <RotateCcw
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>
                </div>
            </FilterToolbar>

            {/* Delivery Sessions Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
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
                        {/* Mobile Card List View (< md screens) */}
                        <div className="block divide-y divide-[#D8E2E6] md:hidden">
                            {pengantaran.data.map((sesi) => {
                                const visibleItems = sesi.items.slice(0, 3);
                                const remainingCount = Math.max(
                                    0,
                                    sesi.items.length - visibleItems.length,
                                );

                                return (
                                    <article
                                        key={`mobile-${sesi.id_pengantaran}`}
                                        className="p-4 transition hover:bg-[#F8FAFC]"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <Link
                                                    href={`/pengantaran/${sesi.id_pengantaran}`}
                                                    className="font-mono text-base font-bold text-[#0F766E] hover:underline"
                                                >
                                                    Sesi #{sesi.id_pengantaran}
                                                </Link>
                                                <p className="mt-0.5 text-xs font-semibold text-[#0F172A]">
                                                    {formatTanggal(sesi.tanggal_pengantaran)}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <PengantaranStatusBadge
                                                    status={sesi.status_pengantaran}
                                                />
                                                {sesi.item_gagal_count > 0 && (
                                                    <StatusBadge tone="rose">
                                                        {sesi.item_gagal_count} Gagal
                                                    </StatusBadge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-3 rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#5B697A]">Kurir:</span>
                                                <span className="font-bold text-[#0F172A]">
                                                    {sesi.petugas_pengantaran.nama_petugas_antar}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between">
                                                <span className="text-[#5B697A]">Progres:</span>
                                                <span className="font-mono font-bold text-[#0F766E]">
                                                    {sesi.item_selesai_count}/{sesi.total_item} item tuntas
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B697A] mb-1.5">
                                                Pelanggan &amp; Nota:
                                            </p>
                                            <ul className="space-y-1.5 text-xs">
                                                {visibleItems.map((item) => (
                                                    <li
                                                        key={`mobile-item-${item.id_item_antar}`}
                                                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-200/60"
                                                    >
                                                        <div className="min-w-0">
                                                            <span className="font-mono font-bold text-[#0F172A]">
                                                                {item.nomor_nota}
                                                            </span>
                                                            <span className="ml-1.5 truncate text-[#475569]">
                                                                {item.transaksi.pelanggan.nama}
                                                            </span>
                                                        </div>
                                                        <ItemPengantaranStatusBadge
                                                            status={item.status_terima_pelanggan}
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                            {remainingCount > 0 && (
                                                <p className="mt-1 text-[11px] font-medium text-[#5B697A]">
                                                    +{remainingCount} item lainnya dalam sesi ini
                                                </p>
                                            )}
                                        </div>

                                        <Link
                                            href={`/pengantaran/${sesi.id_pengantaran}`}
                                            className="mt-4 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#115E59]"
                                        >
                                            <span>Buka Rute &amp; Detail Pengantaran</span>
                                            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                                        </Link>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Desktop Table View (>= md screens) */}
                        <div
                            tabIndex={0}
                            role="region"
                            aria-labelledby={tableCaptionId}
                            className="hidden overflow-x-auto md:block"
                        >
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                                <caption
                                    id={tableCaptionId}
                                    className="sr-only"
                                >
                                    Daftar sesi pengantaran laundry beserta
                                    kurir, progres item, dan ringkasan pelanggan
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
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
                                <tbody className="divide-y divide-[#D8E2E6] bg-white">
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
                                                className="align-top transition hover:bg-[#F8FAFC]"
                                            >
                                                <th
                                                    scope="row"
                                                    className="whitespace-nowrap px-5 py-4 text-left font-normal"
                                                >
                                                    <Link
                                                        href={`/pengantaran/${sesi.id_pengantaran}`}
                                                        className="font-mono text-sm font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
                                                    >
                                                        Sesi #
                                                        {sesi.id_pengantaran}
                                                    </Link>
                                                    <p className="mt-1 text-xs font-medium text-[#0F172A]">
                                                        {formatTanggal(
                                                            sesi.tanggal_pengantaran,
                                                        )}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-[#5B697A]">
                                                        Dibuat{' '}
                                                        {formatTanggal(
                                                            sesi.created_at,
                                                            { withTime: true },
                                                        )}
                                                    </p>
                                                </th>

                                                <td className="whitespace-nowrap px-5 py-4 text-xs">
                                                    <p className="font-semibold text-[#0F172A]">
                                                        {
                                                            sesi
                                                                .petugas_pengantaran
                                                                .nama_petugas_antar
                                                        }
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-[#5B697A] tabular-nums">
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
                                                    <p className="mt-1.5 text-[11px] font-medium tabular-nums text-[#475569]">
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
                                                                    <span className="font-mono font-semibold text-[#0F172A]">
                                                                        {
                                                                            item.nomor_nota
                                                                        }
                                                                    </span>
                                                                    <span className="text-[#475569]">
                                                                        &mdash;{' '}
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
                                                        <p className="mt-1.5 text-[11px] font-medium text-[#5B697A]">
                                                            +{remainingCount}{' '}
                                                            item lainnya
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 text-right">
                                                    <Link
                                                        href={`/pengantaran/${sesi.id_pengantaran}`}
                                                        className="inline-flex min-h-[2.375rem] items-center gap-1 rounded-xl border border-teal-200 bg-[#F0FDFA] px-3 py-1.5 text-xs font-semibold text-[#115E59] transition hover:bg-[#CCFBF1]"
                                                    >
                                                        <span>Buka Sesi</span>
                                                        <ArrowRight
                                                            className="h-3.5 w-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
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
                                className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
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
                                className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Truck
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    {createForm.processing
                                        ? 'Menyimpan...'
                                        : `Buat Jadwal (${createForm.data.nomor_nota_list.length} Nota)`}
                                </span>
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
                                    className="block text-xs font-semibold text-[#0F172A]"
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
                                    className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
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
                                        className="mt-1.5 text-xs font-medium text-rose-600"
                                    >
                                        {createForm.errors.id_petugas_antar}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor={createTanggalId}
                                    className="block text-xs font-semibold text-[#0F172A]"
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
                                    className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                />
                                {createForm.errors.tanggal_pengantaran && (
                                    <p
                                        id={createTanggalErrId}
                                        role="alert"
                                        className="mt-1.5 text-xs font-medium text-rose-600"
                                    >
                                        {createForm.errors.tanggal_pengantaran}
                                    </p>
                                )}
                            </div>
                        </div>

                        <fieldset className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5">
                            <legend className="px-1.5 text-xs font-semibold text-[#0F172A]">
                                Pilih Nota Transaksi SELESAI (
                                {createForm.data.nomor_nota_list.length} nota,{' '}
                                {selectedUniqueCustomersCount} pelanggan)
                            </legend>

                            {eligibleTransaksiOptions.length === 0 ? (
                                <div className="rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] p-3.5 text-xs text-[#78350F]">
                                    Belum ada transaksi berstatus{' '}
                                    <strong>SELESAI</strong> yang bebas dari
                                    jadwal pengantaran aktif.
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="relative flex-1">
                                            <label
                                                htmlFor={createNotaFilterId}
                                                className="sr-only"
                                            >
                                                Saring daftar nota eligible
                                            </label>
                                            <Search
                                                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5B697A]"
                                                aria-hidden="true"
                                            />
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
                                                className="block min-h-[2.375rem] w-full rounded-xl border border-[#7C8C9D] bg-white py-1.5 pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
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
                                                className="min-h-[2.25rem] rounded-xl border border-[#7C8C9D] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
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
                                                className="min-h-[2.25rem] rounded-xl border border-[#7C8C9D] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                                            >
                                                Kosongkan
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
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
                                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-xs transition ${
                                                        checked
                                                            ? 'border-2 border-[#0F766E] bg-[#F0FDFA] shadow-xs'
                                                            : 'border-[#D8E2E6] bg-white hover:border-[#7C8C9D]'
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
                                                        className="mt-1 h-4 w-4 shrink-0 rounded border-[#7C8C9D] accent-[#0F766E]"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        {/* Max 2 status badges per card */}
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className="font-mono text-sm font-bold text-[#0F172A]">
                                                                    {
                                                                        opt.nomor_nota
                                                                    }
                                                                </span>
                                                                <PaymentStatusBadge
                                                                    status={
                                                                        opt.status_pembayaran
                                                                    }
                                                                />
                                                                {opt.has_previous_failed_delivery ? (
                                                                    <StatusBadge tone="rose">
                                                                        Pernah
                                                                        Gagal
                                                                        Antar
                                                                    </StatusBadge>
                                                                ) : (
                                                                    opt
                                                                        .pelanggan
                                                                        .boleh_bayar_akhir && (
                                                                        <PayLaterBadge
                                                                            allowed={
                                                                                true
                                                                            }
                                                                        />
                                                                    )
                                                                )}
                                                            </div>
                                                            <span
                                                                className={`font-mono font-bold tabular-nums ${
                                                                    sisaCents >
                                                                    0
                                                                        ? 'text-[#78350F]'
                                                                        : 'text-[#065F46]'
                                                                }`}
                                                            >
                                                                Sisa:{' '}
                                                                {formatRupiah(
                                                                    opt.sisa_tagihan,
                                                                )}
                                                            </span>
                                                        </div>

                                                        <p className="mt-1.5 text-xs font-bold text-[#0F172A]">
                                                            {opt.pelanggan.nama}{' '}
                                                            <span className="font-mono font-normal text-[#5B697A]">
                                                                (
                                                                {
                                                                    opt
                                                                        .pelanggan
                                                                        .no_telepon
                                                                }
                                                                )
                                                            </span>
                                                        </p>

                                                        <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#475569]">
                                                            <MapPin
                                                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                {
                                                                    opt
                                                                        .pelanggan
                                                                        .alamat
                                                                }
                                                            </span>
                                                        </p>

                                                        <MetadataRow
                                                            className="mt-1.5"
                                                            items={[
                                                                <span key="layanan">
                                                                    {
                                                                        opt
                                                                            .layanan
                                                                            .nama_layanan
                                                                    }{' '}
                                                                    (
                                                                    <span className="font-mono tabular-nums">
                                                                        {
                                                                            opt.berat_atau_jumlah
                                                                        }{' '}
                                                                        {
                                                                            opt
                                                                                .layanan
                                                                                .satuan
                                                                        }
                                                                    </span>
                                                                    )
                                                                </span>,
                                                                <SpeedTierBadge
                                                                    key="tier"
                                                                    tier={
                                                                        opt
                                                                            .layanan
                                                                            .tingkat_kecepatan
                                                                    }
                                                                    variant="text"
                                                                />,
                                                                opt.pelanggan
                                                                    .boleh_bayar_akhir ? (
                                                                    opt.has_previous_failed_delivery && (
                                                                        <span
                                                                            key="paylater-text"
                                                                            className="font-medium text-[#3730A3]"
                                                                        >
                                                                            Boleh
                                                                            Bayar
                                                                            Akhir
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <PayLaterBadge
                                                                        key="paylater-text"
                                                                        allowed={
                                                                            false
                                                                        }
                                                                        variant="text"
                                                                    />
                                                                ),
                                                            ]}
                                                        />

                                                        {opt.insiden_pending_count >
                                                            0 && (
                                                            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#78350F]">
                                                                <AlertTriangle
                                                                    className="h-3.5 w-3.5 shrink-0 text-[#B45309]"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>
                                                                    {
                                                                        opt.insiden_pending_count
                                                                    }{' '}
                                                                    Insiden
                                                                    Pending
                                                                    menunggu
                                                                    konfirmasi
                                                                </span>
                                                            </p>
                                                        )}
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
