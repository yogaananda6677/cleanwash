import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Clock,
    PackageCheck,
    Truck,
    Wallet,
} from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmptyState from '@/Components/EmptyState';
import FilterToolbar from '@/Components/FilterToolbar';
import MetadataRow from '@/Components/MetadataRow';
import Pagination from '@/Components/Pagination';
import PelunasanModal, {
    type PelunasanModalTarget,
} from '@/Components/PelunasanModal';
import SerahTerimaModal, {
    type SerahTerimaModalTarget,
} from '@/Components/SerahTerimaModal';
import StatTile from '@/Components/StatTile';
import {
    ItemPengantaranStatusBadge,
    PayLaterBadge,
    PaymentStatusBadge,
    SpeedTierBadge,
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
    const hasPiutangNominal =
        parseDecimalToCents(summary.total_piutang_nominal) > 0;

    return (
        <AppLayout
            title="Loket Serah Terima & Pelunasan"
            subtitle="Verifikasi pengambilan pakaian (KK-06), pelunasan tagihan, dan pemantauan piutang pelanggan boleh_bayar_akhir"
            headerActions={
                <Link
                    href="/audit"
                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                >
                    <span>Lihat Audit &amp; Piutang</span>
                    <ArrowRight
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                    />
                </Link>
            }
        >
            <Head title="Loket Serah Terima & Pelunasan" />

            {/* 4 StatTile KPI Cards */}
            <section
                aria-label="Ringkasan antrean loket serah terima"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatTile
                    label="Siap Diambil (SELESAI)"
                    value={summary.siap_ambil_count}
                    hint="Nota selesai produksi menunggu pengambilan"
                    tone="brand"
                    icon={
                        <PackageCheck className="h-4 w-4" aria-hidden="true" />
                    }
                    onClick={() => handleModeChange('SIAP_AMBIL')}
                    active={mode === 'SIAP_AMBIL'}
                />

                <StatTile
                    label="Sedang Diantar Kurir"
                    value={summary.sedang_diantar_count}
                    hint="Nota SELESAI berstatus DIAMBIL / DALAM_PERJALANAN"
                    tone="indigo"
                    icon={<Truck className="h-4 w-4" aria-hidden="true" />}
                />

                <StatTile
                    label="Nota Piutang Aktif (KK-06)"
                    value={summary.piutang_count}
                    hint="Sudah DIAMBIL dengan status BELUM_LUNAS"
                    tone={summary.piutang_count > 0 ? 'amber' : 'neutral'}
                    icon={<Clock className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => handleModeChange('PIUTANG')}
                    active={mode === 'PIUTANG'}
                />

                <StatTile
                    label="Total Nominal Piutang"
                    value={formatRupiah(summary.total_piutang_nominal)}
                    hint="Akumulasi sisa tagihan pelanggan bayar akhir"
                    tone={hasPiutangNominal ? 'rose' : 'emerald'}
                    icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
                    href="/audit"
                    hrefLabel="Lihat ringkasan audit"
                />
            </section>

            {/* Modern Tablist Strip */}
            <section className="mt-5 rounded-2xl border border-[#D8E2E6] bg-white p-4 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:px-5 sm:py-4">
                <div
                    role="tablist"
                    aria-label="Mode antrean loket serah terima"
                    className="flex flex-wrap gap-2"
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
                                className={`inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                                    active
                                        ? 'bg-[#0F766E] text-white shadow-xs'
                                        : 'border border-[#7C8C9D] bg-white text-[#0F172A] hover:bg-[#F8FAFC]'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.key === 'SIAP_AMBIL' && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                                            active
                                                ? 'bg-[#115E59] text-white'
                                                : 'bg-[#EEF2F5] text-[#0F172A]'
                                        }`}
                                    >
                                        {summary.siap_ambil_count}
                                    </span>
                                )}
                                {tab.key === 'PIUTANG' && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                                            active
                                                ? 'bg-[#115E59] text-white'
                                                : 'bg-[#FFFBEB] text-[#78350F]'
                                        }`}
                                    >
                                        {summary.piutang_count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Search FilterToolbar */}
            <FilterToolbar
                className="mt-4"
                onSubmit={handleSearchSubmit}
                ariaLabel="Pencarian transaksi loket serah terima"
                searchId={searchInputId}
                searchLabel="Cari Nomor Nota atau Pelanggan"
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Cari nomor nota (CW-...), nama pelanggan, atau no. telepon..."
                submitLabel="Cari"
                onReset={handleResetFilters}
                hasActiveFilters={hasSearchFilter}
            />

            {/* Queue Table */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
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
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                                <caption
                                    id={tableCaptionId}
                                    className="sr-only"
                                >
                                    Antrean transaksi loket serah terima dan
                                    pelunasan kasir mode {mode}
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
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
                                <tbody className="divide-y divide-[#D8E2E6]/70 bg-white">
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
                                                    className="align-top transition hover:bg-[#F8FAFC]"
                                                >
                                                    <th
                                                        scope="row"
                                                        className="whitespace-nowrap px-5 py-4 text-left font-normal"
                                                    >
                                                        <Link
                                                            href={`/transaksi/${item.nomor_nota}`}
                                                            className="font-mono text-sm font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
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
                                                        <p className="mt-1 text-[11px] tabular-nums text-[#5B697A]">
                                                            {item.diambil_pada
                                                                ? `Diambil: ${formatTanggal(item.diambil_pada, { withTime: true })}`
                                                                : `Masuk: ${formatTanggal(item.tanggal_penerimaan, { withTime: true })}`}
                                                        </p>
                                                    </th>

                                                    <td className="px-5 py-4 text-xs">
                                                        <p className="font-semibold text-[#0F172A]">
                                                            {
                                                                item.pelanggan
                                                                    .nama
                                                            }
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
                                                                !item.pelanggan
                                                                    .boleh_bayar_akhir &&
                                                                    'Wajib Lunas',
                                                            ]}
                                                        />
                                                        {item.pelanggan
                                                            .boleh_bayar_akhir && (
                                                            <div className="mt-1.5">
                                                                <PayLaterBadge
                                                                    allowed
                                                                />
                                                            </div>
                                                        )}
                                                        {blockedByKK06 && (
                                                            <p className="mt-1 text-[11px] font-semibold text-[#9F1239]">
                                                                Terblokir KK-06
                                                                (perlu pelunasan)
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 text-xs">
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
                                                                        item
                                                                            .layanan
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
                                                                        item
                                                                            .layanan
                                                                            .satuan
                                                                    }
                                                                </span>,
                                                            ]}
                                                        />

                                                        {item.pengantaran_aktif && (
                                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                                                                        className="text-[11px] font-semibold text-[#0F766E] hover:text-[#115E59] hover:underline"
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
                                                        <p className="text-[#5B697A]">
                                                            Total:{' '}
                                                            <span className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                                                {formatRupiah(
                                                                    item.total_harga,
                                                                )}
                                                            </span>
                                                        </p>
                                                        <p className="mt-0.5 text-[#5B697A]">
                                                            Dibayar:{' '}
                                                            <span className="font-mono font-semibold tabular-nums text-[#0F766E]">
                                                                {formatRupiah(
                                                                    item.total_dibayar,
                                                                )}
                                                            </span>
                                                        </p>
                                                        <p
                                                            className={`mt-1 font-mono text-sm font-bold tabular-nums ${
                                                                sisaCents > 0
                                                                    ? 'text-[#78350F]'
                                                                    : 'text-[#065F46]'
                                                            }`}
                                                        >
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
                                                                    className="inline-flex min-h-[2.375rem] items-center justify-center rounded-xl bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59]"
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
                                                                    className={`inline-flex min-h-[2.375rem] items-center justify-center rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                                                                        item.bisa_serah_terima_loket
                                                                            ? 'bg-emerald-700 text-white shadow-xs hover:bg-emerald-800'
                                                                            : 'border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
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
                                                                className="inline-flex min-h-[1.75rem] items-center gap-1 text-xs font-semibold text-[#0F766E] hover:text-[#115E59] hover:underline"
                                                            >
                                                                <span>
                                                                    Detail Nota
                                                                </span>
                                                                <ArrowRight
                                                                    className="h-3 w-3 shrink-0"
                                                                    aria-hidden="true"
                                                                />
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
