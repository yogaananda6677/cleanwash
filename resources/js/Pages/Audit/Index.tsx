import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
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
                className="font-mono text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline"
            >
                {log.subject_id}
            </Link>
        );
    }

    if (log.subject_type.endsWith('Pengantaran')) {
        return (
            <Link
                href={`/pengantaran/${log.subject_id}`}
                className="font-mono text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline"
            >
                Pengantaran #{log.subject_id}
            </Link>
        );
    }

    return (
        <span className="font-mono text-xs font-semibold text-slate-800">
            {log.subject_id}
        </span>
    );
}

function summarizeAuditEntry(log: AuditLogItem): string {
    const after = log.payload_after ?? {};
    if (log.action === 'SERAH_TERIMA') {
        const kanal = after.kanal ? `Kanal: ${String(after.kanal)}` : 'Serah terima';
        const piutang = after.piutang_dicatat === true ? ' • Piutang dicatat' : '';
        return `${kanal}${piutang}`;
    }
    if (log.action === 'PELUNASAN_RECORDED' && after.nominal_bayar) {
        return `Nominal: ${formatRupiah(String(after.nominal_bayar))}`;
    }
    if (log.action === 'PENGANTARAN_CREATED' && Array.isArray(after.nomor_nota_list)) {
        return `${after.nomor_nota_list.length} nota dijadwalkan`;
    }
    if (log.action === 'ITEM_PENGANTARAN_UPDATED' && after.status_terima_pelanggan) {
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
                    className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
                >
                    Kelola Pelunasan Piutang &rarr;
                </Link>
            }
        >
            <Head title="Audit Trail & Piutang" />

            {/* Piutang Summary Section */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-amber-50/60 px-5 py-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Ringkasan Piutang Pelanggan Hak Bayar Akhir (KK-06)
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-600">
                            Nota berstatus <strong>DIAMBIL</strong> yang masih
                            memiliki sisa tagihan (
                            <strong>BELUM_LUNAS</strong>).
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div className="rounded-xl border border-amber-200 bg-white px-3.5 py-2">
                            <span className="text-slate-500">Total Nota: </span>
                            <strong className="text-sm tabular-nums text-amber-800">
                                {piutangSummary.total_nota_piutang}
                            </strong>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-white px-3.5 py-2">
                            <span className="text-slate-500">
                                Total Nominal:{' '}
                            </span>
                            <strong className="text-sm tabular-nums text-rose-700">
                                {formatRupiah(
                                    piutangSummary.total_nominal_piutang,
                                )}
                            </strong>
                        </div>
                    </div>
                </div>

                {piutangSummary.items.length === 0 ? (
                    <div className="p-5 text-xs text-slate-500">
                        Tidak ada transaksi piutang pelanggan yang belum lunas
                        saat ini.
                    </div>
                ) : (
                    <div
                        tabIndex={0}
                        role="region"
                        aria-labelledby={piutangCaptionId}
                        className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <caption id={piutangCaptionId} className="sr-only">
                                Daftar piutang transaksi diambil belum lunas
                                pelanggan hak bayar akhir
                            </caption>
                            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                            <tbody className="divide-y divide-slate-100 bg-white text-xs">
                                {piutangSummary.items.map((item) => (
                                    <tr
                                        key={item.nomor_nota}
                                        className="hover:bg-slate-50/70"
                                    >
                                        <th
                                            scope="row"
                                            className="whitespace-nowrap px-5 py-3.5 text-left font-normal"
                                        >
                                            <Link
                                                href={`/transaksi/${item.nomor_nota}`}
                                                className="font-mono text-sm font-bold text-sky-700 hover:text-sky-800 hover:underline"
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
                                            <p className="font-semibold text-slate-900">
                                                {item.pelanggan.nama}
                                            </p>
                                            <p className="font-mono text-[11px] text-slate-500">
                                                {item.pelanggan.no_telepon}
                                            </p>
                                            <div className="mt-1">
                                                <PayLaterBadge
                                                    allowed={
                                                        item.pelanggan
                                                            .boleh_bayar_akhir
                                                    }
                                                />
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-medium text-slate-800">
                                                    {item.layanan.nama_layanan}
                                                </span>
                                                <SpeedTierBadge
                                                    tier={
                                                        item.layanan
                                                            .tingkat_kecepatan
                                                    }
                                                />
                                            </div>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                Diambil:{' '}
                                                {formatTanggal(
                                                    item.diambil_pada,
                                                    { withTime: true },
                                                )}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums">
                                            <p className="text-slate-700">
                                                {formatRupiah(item.total_harga)}
                                            </p>
                                            <p className="text-[11px] text-sky-700">
                                                Dibayar:{' '}
                                                {formatRupiah(
                                                    item.total_dibayar,
                                                )}
                                            </p>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold tabular-nums text-amber-700">
                                            {formatRupiah(item.sisa_tagihan)}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                            <Link
                                                href={`/transaksi/${item.nomor_nota}`}
                                                className="inline-flex items-center rounded-xl bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-100"
                                            >
                                                Buka Nota &rarr;
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
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900">
                    Log Aktivitas &amp; Audit Trail Sistem
                </h2>
                <search>
                    <form
                        method="GET"
                        onSubmit={handleSearchSubmit}
                        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end"
                    >
                        <div className="lg:col-span-5">
                            <label
                                htmlFor={searchInputId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Cari Log Audit
                            </label>
                            <input
                                id={searchInputId}
                                name="search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Cari nomor nota/ID subjek, nama aktor, atau kode aksi..."
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                        </div>

                        <div className="lg:col-span-3">
                            <label
                                htmlFor={actionSelectId}
                                className="block text-xs font-semibold text-slate-700"
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
                                className="block text-xs font-semibold text-slate-700"
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            >
                                <option value="">Semua Peran</option>
                                <option value="PETUGAS">PETUGAS</option>
                                <option value="PEGAWAI">PEGAWAI</option>
                                <option value="PENGANTAR">PENGANTAR</option>
                            </select>
                        </div>

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

            {/* Audit Logs Paginated Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
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
                            className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        >
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <caption id={logsCaptionId} className="sr-only">
                                    Tabel jejak audit seluruh perubahan data
                                    operasional CleanWash
                                </caption>
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                                <tbody className="divide-y divide-slate-100 bg-white text-xs">
                                    {logs.data.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="align-top hover:bg-slate-50/70"
                                        >
                                            <th
                                                scope="row"
                                                className="whitespace-nowrap px-5 py-3.5 text-left font-normal text-slate-600 tabular-nums"
                                            >
                                                <p className="font-medium text-slate-800">
                                                    {formatTanggal(
                                                        log.created_at,
                                                        { withTime: true },
                                                    )}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-400">
                                                    Log #{log.id}
                                                </p>
                                            </th>
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-slate-900">
                                                    {formatAuditAction(
                                                        log.action,
                                                    )}
                                                </p>
                                                <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3.5">
                                                <p className="font-semibold text-slate-900">
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
                                                <p className="text-slate-700">
                                                    {summarizeAuditEntry(log)}
                                                </p>
                                                {(log.payload_before !== null ||
                                                    log.payload_after !==
                                                        null) && (
                                                    <details className="mt-1.5">
                                                        <summary className="cursor-pointer text-[11px] font-semibold text-sky-700 hover:underline">
                                                            Lihat detail payload
                                                        </summary>
                                                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                            {log.payload_before !==
                                                                null && (
                                                                <pre className="max-w-xs overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] text-slate-700">
                                                                    {JSON.stringify(
                                                                        log.payload_before,
                                                                        null,
                                                                        2,
                                                                    )}
                                                                </pre>
                                                            )}
                                                            {log.payload_after !==
                                                                null && (
                                                                <pre className="max-w-xs overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] text-slate-700">
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
