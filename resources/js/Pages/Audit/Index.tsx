import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, RotateCcw, Search, Wallet } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar, {
    FILTER_LABEL_CLASS,
    FILTER_RESET_BUTTON_CLASS,
    FILTER_SELECT_CLASS,
    FILTER_SUBMIT_BUTTON_CLASS,
} from '@/Components/FilterToolbar';
import Pagination from '@/Components/Pagination';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    RoleBadge,
    SpeedTierBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatAuditAction, formatRupiah, formatTanggal } from '@/lib/format';
import type { AuditIndexProps, AuditLogItem, UserRole } from '@/types';

function renderSubjectCell(log: AuditLogItem) {
    if (log.subject_type.endsWith('Transaksi')) {
        return (
            <Link
                href={`/transaksi/${log.subject_id}`}
                className="font-mono text-xs font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
            >
                {log.subject_id}
            </Link>
        );
    }

    if (log.subject_type.endsWith('Pengantaran')) {
        return (
            <Link
                href={`/pengantaran/${log.subject_id}`}
                className="font-mono text-xs font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
            >
                Pengantaran #{log.subject_id}
            </Link>
        );
    }

    return (
        <span className="font-mono text-xs font-semibold text-[#0F172A]">
            {log.subject_id}
        </span>
    );
}

function summarizeAuditEntry(log: AuditLogItem): string {
    const after = log.payload_after ?? {};
    if (log.action === 'SERAH_TERIMA') {
        const kanal = after.kanal
            ? `Kanal: ${String(after.kanal)}`
            : 'Serah terima';
        const piutang =
            after.piutang_dicatat === true ? ' • Piutang dicatat' : '';
        return `${kanal}${piutang}`;
    }
    if (log.action === 'PELUNASAN_RECORDED' && after.nominal_bayar) {
        return `Nominal: ${formatRupiah(String(after.nominal_bayar))}`;
    }
    if (
        log.action === 'PENGANTARAN_CREATED' &&
        Array.isArray(after.nomor_nota_list)
    ) {
        return `${after.nomor_nota_list.length} nota dijadwalkan`;
    }
    if (
        log.action === 'ITEM_PENGANTARAN_UPDATED' &&
        after.status_terima_pelanggan
    ) {
        return `Status item: ${String(after.status_terima_pelanggan)}`;
    }
    if (log.action === 'PENGANTARAN_RESCHEDULED' && after.new_id_pengantaran) {
        return `Sesi baru #${String(after.new_id_pengantaran)}`;
    }
    if (after.status_transaksi) {
        return `Status: ${String(after.status_transaksi)}`;
    }
    return log.subject_type.split('\\').pop() ?? log.subject_type;
}

export default function AuditIndex({
    logs,
    filters,
    availableActions,
    piutangSummary,
}: AuditIndexProps) {
    const filterId = useId();
    const searchInputId = `${filterId}-search`;
    const actionSelectId = `${filterId}-action`;
    const roleSelectId = `${filterId}-role`;
    const piutangCaptionId = useId();
    const logsCaptionId = useId();

    const [search, setSearch] = useState(filters.search ?? '');
    const [action, setAction] = useState(filters.action ?? '');
    const [actorRole, setActorRole] = useState<UserRole | ''>(
        filters.actor_role ?? '',
    );

    useEffect(() => {
        setSearch(filters.search ?? '');
        setAction(filters.action ?? '');
        setActorRole(filters.actor_role ?? '');
    }, [filters.search, filters.action, filters.actor_role]);

    const applyFilters = (
        nextSearch: string,
        nextAction: string,
        nextRole: UserRole | '',
    ) => {
        router.get(
            '/audit',
            {
                search: nextSearch.trim() || undefined,
                action: nextAction || undefined,
                actor_role: nextRole || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(search, action, actorRole);
    };

    const handleResetFilters = () => {
        setSearch('');
        setAction('');
        setActorRole('');
        router.get('/audit', {}, { preserveState: true, replace: true });
    };

    const hasActiveFilters =
        filters.search !== '' ||
        filters.action !== '' ||
        filters.actor_role !== '';

    return (
        <AppLayout
            title="Audit Trail & Ringkasan Piutang"
            subtitle="Rekap piutang pelanggan boleh_bayar_akhir (KK-06) serta jejak audit seluruh transaksi, produksi, insiden, dan pengantaran"
            headerActions={
                <Link
                    href="/serah-terima?mode=PIUTANG"
                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                    <Wallet
                        className="h-4 w-4 shrink-0 text-[#B45309]"
                        aria-hidden="true"
                    />
                    <span>Kelola Pelunasan Piutang</span>
                    <ArrowRight
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                    />
                </Link>
            }
        >
            <Head title="Audit Trail & Piutang" />

            {/* Piutang Summary Section */}
            <section className="overflow-hidden rounded-2xl border border-amber-200/90 bg-white shadow-xs transition hover:shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-amber-100 bg-gradient-to-r from-amber-50/70 via-white to-white px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-[#B45309]">
                            <Wallet className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                                Ringkasan Piutang Pelanggan Hak Bayar Akhir (KK-06)
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Rekap transaksi berstatus <strong className="text-slate-700">DIAMBIL</strong> yang masih memiliki sisa tagihan (<strong className="text-rose-600">BELUM_LUNAS</strong>).
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3.5 py-2 shadow-2xs">
                            <span className="text-slate-500 font-medium">Total Nota:</span>
                            <strong className="font-mono text-sm font-bold tabular-nums text-amber-800">
                                {piutangSummary.total_nota_piutang}
                            </strong>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2 shadow-2xs">
                            <span className="text-slate-500 font-medium">Total Nominal:</span>
                            <strong className="font-mono text-sm font-bold tabular-nums text-rose-600">
                                {formatRupiah(piutangSummary.total_nominal_piutang)}
                            </strong>
                        </div>
                    </div>
                </div>

                {piutangSummary.items.length === 0 ? (
                    <div className="p-5 text-xs text-[#5B697A]">
                        Tidak ada transaksi piutang pelanggan yang belum lunas
                        saat ini.
                    </div>
                ) : (
                    <div
                        tabIndex={0}
                        role="region"
                        aria-labelledby={piutangCaptionId}
                        className="overflow-x-auto"
                    >
                        <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                            <caption id={piutangCaptionId} className="sr-only">
                                Daftar piutang transaksi diambil belum lunas
                                pelanggan hak bayar akhir
                            </caption>
                            <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                <tr>
                                    <th scope="col" className="px-5 py-3">
                                        Nomor Nota
                                    </th>
                                    <th scope="col" className="px-5 py-3">
                                        Pelanggan
                                    </th>
                                    <th scope="col" className="px-5 py-3">
                                        Layanan &amp; Diambil Pada
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-5 py-3 text-right"
                                    >
                                        Total / Dibayar
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-5 py-3 text-right"
                                    >
                                        Sisa Piutang
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-5 py-3 text-right"
                                    >
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D8E2E6] bg-white text-xs">
                                {piutangSummary.items.map((item) => (
                                    <tr
                                        key={item.nomor_nota}
                                        className="transition hover:bg-[#F8FAFC]"
                                    >
                                        <th
                                            scope="row"
                                            className="whitespace-nowrap px-5 py-3.5 text-left font-normal"
                                        >
                                            <Link
                                                href={`/transaksi/${item.nomor_nota}`}
                                                className="font-mono text-sm font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
                                            >
                                                {item.nomor_nota}
                                            </Link>
                                            <div className="mt-1">
                                                <PaymentStatusBadge
                                                    status={
                                                        item.status_pembayaran
                                                    }
                                                />
                                            </div>
                                        </th>
                                        <td className="px-5 py-3.5">
                                            <p className="font-semibold text-[#0F172A]">
                                                {item.pelanggan.nama}
                                            </p>
                                            <p className="font-mono text-[11px] text-[#5B697A]">
                                                {item.pelanggan.no_telepon}
                                            </p>
                                            <div className="mt-1">
                                                <PayLaterBadge
                                                    allowed={
                                                        item.pelanggan
                                                            .boleh_bayar_akhir
                                                    }
                                                    variant="text"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-medium text-[#0F172A]">
                                                    {item.layanan.nama_layanan}
                                                </span>
                                                <span
                                                    aria-hidden="true"
                                                    className="text-[#7C8C9D]"
                                                >
                                                    &bull;
                                                </span>
                                                <SpeedTierBadge
                                                    tier={
                                                        item.layanan
                                                            .tingkat_kecepatan
                                                    }
                                                    variant="text"
                                                />
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-[#5B697A]">
                                                Diambil:{' '}
                                                {formatTanggal(
                                                    item.diambil_pada,
                                                    { withTime: true },
                                                )}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono tabular-nums">
                                            <p className="text-[#475569]">
                                                {formatRupiah(item.total_harga)}
                                            </p>
                                            <p className="text-[11px] text-[#0F766E]">
                                                Dibayar:{' '}
                                                {formatRupiah(
                                                    item.total_dibayar,
                                                )}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono text-sm font-bold tabular-nums text-[#78350F]">
                                            {formatRupiah(item.sisa_tagihan)}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                            <Link
                                                href={`/transaksi/${item.nomor_nota}`}
                                                className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-xl border border-teal-200 bg-[#F0FDFA] px-3 py-1.5 text-xs font-semibold text-[#115E59] transition hover:bg-[#CCFBF1]"
                                            >
                                                <span>Buka Nota</span>
                                                <ArrowRight
                                                    className="h-3.5 w-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Audit Log Filter Bar */}
            <div className="mt-6 space-y-3">
                <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                    Log Aktivitas &amp; Audit Trail Sistem
                </h2>
                <FilterToolbar
                    ariaLabel="Filter log aktivitas audit"
                    onSubmit={handleSearchSubmit}
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
                        <div className="lg:col-span-5">
                            <label
                                htmlFor={searchInputId}
                                className={FILTER_LABEL_CLASS}
                            >
                                Cari Log Audit
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
                                    placeholder="Cari nomor nota/ID subjek, nama aktor, atau kode aksi..."
                                    className="block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white py-2 pl-10 pr-3.5 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                />
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            <label
                                htmlFor={actionSelectId}
                                className={FILTER_LABEL_CLASS}
                            >
                                Jenis Aksi Audit
                            </label>
                            <select
                                id={actionSelectId}
                                name="action"
                                value={action}
                                onChange={(event) =>
                                    setAction(event.target.value)
                                }
                                className={FILTER_SELECT_CLASS}
                            >
                                <option value="">Semua Aksi</option>
                                {availableActions.map((act) => (
                                    <option key={act} value={act}>
                                        {formatAuditAction(act)} ({act})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="lg:col-span-2">
                            <label
                                htmlFor={roleSelectId}
                                className={FILTER_LABEL_CLASS}
                            >
                                Peran Aktor
                            </label>
                            <select
                                id={roleSelectId}
                                name="actor_role"
                                value={actorRole}
                                onChange={(event) =>
                                    setActorRole(
                                        event.target.value as UserRole | '',
                                    )
                                }
                                className={FILTER_SELECT_CLASS}
                            >
                                <option value="">Semua Peran</option>
                                <option value="PETUGAS">PETUGAS</option>
                                <option value="PEGAWAI">PEGAWAI</option>
                                <option value="PENGANTAR">PENGANTAR</option>
                            </select>
                        </div>

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
            </div>

            {/* Audit Logs Paginated Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                {logs.data.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="Log audit tidak ditemukan"
                            description={
                                hasActiveFilters
                                    ? 'Tidak ada catatan audit yang sesuai dengan filter pencarian, jenis aksi, atau peran saat ini.'
                                    : 'Belum ada catatan aktivitas audit yang terekam.'
                            }
                            actionLabel={
                                hasActiveFilters ? 'Reset Filter' : undefined
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
                            aria-labelledby={logsCaptionId}
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                                <caption id={logsCaptionId} className="sr-only">
                                    Tabel jejak audit seluruh perubahan data
                                    operasional CleanWash
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                    <tr>
                                        <th scope="col" className="px-5 py-3.5">
                                            Waktu (WIB)
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Aksi Audit
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Aktor &amp; Peran
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Subjek
                                        </th>
                                        <th scope="col" className="px-5 py-3.5">
                                            Ringkasan &amp; Payload
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D8E2E6] bg-white text-xs">
                                    {logs.data.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="align-top transition hover:bg-[#F8FAFC]"
                                        >
                                            <th
                                                scope="row"
                                                className="whitespace-nowrap px-5 py-3.5 text-left font-normal text-[#475569] tabular-nums"
                                            >
                                                <p className="font-medium text-[#0F172A]">
                                                    {formatTanggal(
                                                        log.created_at,
                                                        { withTime: true },
                                                    )}
                                                </p>
                                                <p className="mt-0.5 font-mono text-[11px] text-[#5B697A]">
                                                    Log #{log.id}
                                                </p>
                                            </th>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-[#0F172A]">
                                                    {formatAuditAction(
                                                        log.action,
                                                    )}
                                                </p>
                                                <span className="mt-1 inline-block rounded-md border border-[#D8E2E6] bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#475569]">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                <p className="font-semibold text-[#0F172A]">
                                                    {log.user?.name ?? 'Sistem'}
                                                </p>
                                                <div className="mt-1">
                                                    <RoleBadge
                                                        role={log.actor_role}
                                                    />
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                {renderSubjectCell(log)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-[#475569]">
                                                    {summarizeAuditEntry(log)}
                                                </p>
                                                {(log.payload_before !== null ||
                                                    log.payload_after !==
                                                        null) && (
                                                    <details className="mt-1.5">
                                                        <summary className="cursor-pointer text-[11px] font-semibold text-[#0F766E] hover:text-[#115E59] hover:underline">
                                                            Lihat detail payload
                                                        </summary>
                                                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                            {log.payload_before !==
                                                                null && (
                                                                <pre className="max-w-xs overflow-x-auto rounded-lg border border-[#D8E2E6] bg-[#F8FAFC] p-2 font-mono text-[10px] text-[#475569]">
                                                                    {JSON.stringify(
                                                                        log.payload_before,
                                                                        null,
                                                                        2,
                                                                    )}
                                                                </pre>
                                                            )}
                                                            {log.payload_after !==
                                                                null && (
                                                                <pre className="max-w-xs overflow-x-auto rounded-lg border border-[#D8E2E6] bg-[#F8FAFC] p-2 font-mono text-[10px] text-[#475569]">
                                                                    {JSON.stringify(
                                                                        log.payload_after,
                                                                        null,
                                                                        2,
                                                                    )}
                                                                </pre>
                                                            )}
                                                        </div>
                                                    </details>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            paginated={logs}
                            itemLabel="entri audit"
                        />
                    </>
                )}
            </section>
        </AppLayout>
    );
}
