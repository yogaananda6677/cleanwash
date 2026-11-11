import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    Info,
    MapPin,
    PackageCheck,
    Phone,
    Truck,
    XCircle,
} from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import MetadataRow from '@/Components/MetadataRow';
import Modal from '@/Components/Modal';
import {
    ItemPengantaranStatusBadge,
    PayLaterBadge,
    PaymentStatusBadge,
    PengantaranStatusBadge,
    SpeedTierBadge,
    StatusBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    formatRupiah,
    formatStatusItemPengantaran,
    formatTanggal,
    getTodayJakartaDateString,
    parseDecimalToCents,
} from '@/lib/format';
import type {
    ItemPengantaranDetail,
    PengantaranShowProps,
    StatusItemPengantaran,
} from '@/types';

const ACTION_BUTTON_LABELS: Partial<Record<StatusItemPengantaran, string>> = {
    DIAMBIL: 'Ambil dari Outlet',
    DALAM_PERJALANAN: 'Mulai Dalam Perjalanan',
    DITERIMA: 'Tandai Diterima Pelanggan',
};

export default function PengantaranShow({
    auth,
    pengantaran,
    kurirOptions,
}: PengantaranShowProps) {
    const isPetugas = auth.user?.role === 'PETUGAS';
    const isPengantar = auth.user?.role === 'PENGANTAR';
    const isAssignedKurir =
        isPengantar &&
        auth.user?.actor_id === pengantaran.id_petugas_antar;

    const failFormId = useId();
    const failReasonInputId = `${failFormId}-alasan`;
    const failReasonHintId = `${failFormId}-alasan-hint`;
    const failReasonErrorId = `${failFormId}-alasan-err`;

    const rescheduleFormId = useId();
    const rescheduleDateId = `${rescheduleFormId}-tanggal`;
    const rescheduleDateErrId = `${rescheduleFormId}-tanggal-err`;
    const rescheduleKurirId = `${rescheduleFormId}-kurir`;
    const rescheduleKurirErrId = `${rescheduleFormId}-kurir-err`;

    const [startingSession, setStartingSession] = useState(false);
    const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
    const [failTarget, setFailTarget] =
        useState<ItemPengantaranDetail | null>(null);
    const [failClientError, setFailClientError] = useState<string | null>(null);
    const [rescheduleTarget, setRescheduleTarget] =
        useState<ItemPengantaranDetail | null>(null);

    const activeKurirOptions = useMemo(
        () => kurirOptions.filter((kurir) => kurir.is_active),
        [kurirOptions],
    );
    const todayJakarta = getTodayJakartaDateString();

    const failForm = useForm({
        alasan_gagal: '',
    });

    const rescheduleForm = useForm({
        tanggal_pengantaran: todayJakarta,
        id_petugas_antar: '',
    });

    const handleStartSession = () => {
        if (
            startingSession ||
            !isAssignedKurir ||
            pengantaran.status_pengantaran !== 'DIJADWALKAN'
        ) {
            return;
        }

        setStartingSession(true);
        router.post(
            `/pengantaran/${pengantaran.id_pengantaran}/mulai`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setStartingSession(false),
            },
        );
    };

    const handleAdvanceItemStatus = (
        item: ItemPengantaranDetail,
        nextStatus: Exclude<StatusItemPengantaran, 'MENUNGGU' | 'GAGAL'>,
    ) => {
        if (updatingItemId !== null || !isAssignedKurir) {
            return;
        }

        setUpdatingItemId(item.id_item_antar);
        router.post(
            `/pengantaran/item/${item.id_item_antar}/status`,
            {
                status_terima_pelanggan: nextStatus,
            },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingItemId(null),
            },
        );
    };

    const openFailModal = (item: ItemPengantaranDetail) => {
        failForm.clearErrors();
        setFailClientError(null);
        failForm.setData({ alasan_gagal: '' });
        setFailTarget(item);
    };

    const closeFailModal = () => {
        if (failForm.processing) {
            return;
        }
        failForm.clearErrors();
        setFailClientError(null);
        setFailTarget(null);
    };

    const handleFailSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!failTarget) {
            return;
        }

        const trimmed = failForm.data.alasan_gagal.trim();
        if (trimmed.length < 5) {
            setFailClientError(
                'Alasan gagal pengantaran wajib diisi minimal 5 karakter.',
            );
            return;
        }

        failForm.transform(() => ({
            status_terima_pelanggan: 'GAGAL',
            alasan_gagal: trimmed,
        }));

        failForm.post(`/pengantaran/item/${failTarget.id_item_antar}/status`, {
            preserveScroll: true,
            onSuccess: () => {
                failForm.clearErrors();
                setFailClientError(null);
                setFailTarget(null);
            },
        });
    };

    const openRescheduleModal = (item: ItemPengantaranDetail) => {
        rescheduleForm.clearErrors();
        const currentKurirActive = activeKurirOptions.some(
            (k) => k.id_petugas_antar === pengantaran.id_petugas_antar,
        );
        const defaultKurirId = isPetugas
            ? currentKurirActive
                ? String(pengantaran.id_petugas_antar)
                : activeKurirOptions[0]
                  ? String(activeKurirOptions[0].id_petugas_antar)
                  : ''
            : '';

        rescheduleForm.setData({
            tanggal_pengantaran: getTodayJakartaDateString(),
            id_petugas_antar: defaultKurirId,
        });
        setRescheduleTarget(item);
    };

    const closeRescheduleModal = () => {
        if (rescheduleForm.processing) {
            return;
        }
        rescheduleForm.clearErrors();
        setRescheduleTarget(null);
    };

    const handleRescheduleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!rescheduleTarget) {
            return;
        }

        rescheduleForm.transform((formData) => ({
            tanggal_pengantaran: formData.tanggal_pengantaran,
            ...(isPetugas && formData.id_petugas_antar.trim() !== ''
                ? { id_petugas_antar: Number(formData.id_petugas_antar) }
                : {}),
        }));

        rescheduleForm.post(
            `/pengantaran/item/${rescheduleTarget.id_item_antar}/jadwalkan-ulang`,
            {
                preserveScroll: 'errors',
                onSuccess: () => {
                    rescheduleForm.clearErrors();
                    setRescheduleTarget(null);
                },
            },
        );
    };

    const totalItems = Math.max(1, pengantaran.total_item);
    const progressPct = Math.min(
        100,
        Math.round((pengantaran.item_selesai_count / totalItems) * 100),
    );

    const failErrorsRecord = failForm.errors as Record<
        string,
        string | undefined
    >;
    const activeFailError =
        failErrorsRecord.alasan_gagal ??
        failErrorsRecord.status_terima_pelanggan ??
        failClientError;

    const rescheduleErrorsRecord = rescheduleForm.errors as Record<
        string,
        string | undefined
    >;
    const rescheduleGeneralError =
        rescheduleErrorsRecord.item ?? rescheduleErrorsRecord.nomor_nota;

    return (
        <AppLayout
            title={`Sesi Pengantaran #${pengantaran.id_pengantaran}`}
            subtitle={`Kurir: ${pengantaran.petugas_pengantaran.nama_petugas_antar} • Jadwal ${formatTanggal(pengantaran.tanggal_pengantaran)}`}
            headerActions={
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/pengantaran"
                        className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                    >
                        <ArrowLeft
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Kembali</span>
                    </Link>
                    {isAssignedKurir &&
                        pengantaran.status_pengantaran === 'DIJADWALKAN' && (
                            <button
                                type="button"
                                onClick={handleStartSession}
                                disabled={startingSession}
                                className="inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:opacity-50"
                            >
                                <Truck
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    {startingSession
                                        ? 'Memulai...'
                                        : 'Mulai Pengantaran'}
                                </span>
                            </button>
                        )}
                </div>
            }
        >
            <Head title={`Sesi Pengantaran #${pengantaran.id_pengantaran}`} />

            {/* Session Overview Header Card */}
            <section className="rounded-2xl border border-[#D8E2E6] bg-white p-4 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xl font-bold text-[#0F172A]">
                                Sesi #{pengantaran.id_pengantaran}
                            </span>
                            <PengantaranStatusBadge
                                status={pengantaran.status_pengantaran}
                            />
                            {pengantaran.item_gagal_count > 0 && (
                                <StatusBadge tone="rose">
                                    {pengantaran.item_gagal_count} Item Gagal
                                </StatusBadge>
                            )}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#475569]">
                            Kurir:{' '}
                            <strong className="text-[#0F172A]">
                                {
                                    pengantaran.petugas_pengantaran
                                        .nama_petugas_antar
                                }
                            </strong>{' '}
                            &bull; Tanggal Antar:{' '}
                            <strong className="text-[#0F172A]">
                                {formatTanggal(pengantaran.tanggal_pengantaran)}
                            </strong>{' '}
                            &bull; Terakhir diperbarui:{' '}
                            <span className="font-mono text-[11px] tabular-nums text-[#5B697A]">
                                {formatTanggal(pengantaran.updated_at, {
                                    withTime: true,
                                })}
                            </span>
                        </p>
                    </div>

                    <div className="w-full shrink-0 sm:w-64">
                        <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#475569]">
                                Progres Penyelesaian
                            </span>
                            <span className="font-mono font-bold tabular-nums text-[#0F172A]">
                                {pengantaran.item_selesai_count}/
                                {pengantaran.total_item} item ({progressPct}%)
                            </span>
                        </div>
                        <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={totalItems}
                            aria-valuenow={pengantaran.item_selesai_count}
                            aria-label="Progres penyelesaian item pengantaran"
                            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#EEF2F5]"
                        >
                            <div
                                className="h-full rounded-full bg-[#0D9488] transition-all"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {isAssignedKurir &&
                    pengantaran.status_pengantaran === 'DIJADWALKAN' && (
                        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-teal-200 border-l-4 border-l-[#0F766E] bg-[#F0FDFA] px-4 py-3 text-xs text-[#115E59] sm:flex-row sm:items-center">
                            <p className="leading-relaxed">
                                Sesi ini masih berstatus{' '}
                                <strong>DIJADWALKAN</strong>. Klik{' '}
                                <strong>Mulai Pengantaran</strong> saat Anda
                                memulai penjemputan/rute agar status sesi
                                tercatat <strong>BERJALAN</strong>.
                            </p>
                            <button
                                type="button"
                                onClick={handleStartSession}
                                disabled={startingSession}
                                className="inline-flex min-h-[2.75rem] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:opacity-50 sm:w-auto"
                            >
                                <Truck
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    {startingSession
                                        ? 'Memulai...'
                                        : 'Mulai Pengantaran'}
                                </span>
                            </button>
                        </div>
                    )}
            </section>

            {/* Delivery Items Cards (Mobile-First 390px Ergonomics) */}
            <section className="mt-6 space-y-4">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                    <h2 className="text-sm font-bold tracking-tight text-[#0F172A]">
                        Daftar Pengantaran Pelanggan ({pengantaran.items.length}{' '}
                        nota)
                    </h2>
                    <p className="text-xs text-[#5B697A]">
                        Alur item: Menunggu &rarr; Diambil &rarr; Dalam
                        Perjalanan &rarr; Diterima / Gagal
                    </p>
                </div>

                {pengantaran.items.map((item, idx) => {
                    const sisaCents = parseDecimalToCents(
                        item.transaksi.sisa_tagihan,
                    );
                    const isTerminal =
                        item.status_terima_pelanggan === 'DITERIMA' ||
                        item.status_terima_pelanggan === 'GAGAL';
                    const blockedByKK06 =
                        !isTerminal &&
                        sisaCents > 0 &&
                        !item.transaksi.pelanggan.boleh_bayar_akhir;
                    const payLaterActive =
                        !isTerminal &&
                        sisaCents > 0 &&
                        item.transaksi.pelanggan.boleh_bayar_akhir;
                    const isUpdatingThis =
                        updatingItemId === item.id_item_antar;

                    return (
                        <article
                            key={item.id_item_antar}
                            className="rounded-2xl border border-[#D8E2E6] bg-white p-4 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-5"
                        >
                            {/* Top Identity & Billing Box */}
                            <div className="flex flex-col justify-between gap-4 border-b border-[#D8E2E6] pb-4 lg:flex-row lg:items-start">
                                <div className="min-w-0 flex-1">
                                    {/* Sequence + Nota + Max 3 Badges */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex min-h-[1.5rem] items-center rounded-lg bg-[#EEF2F5] px-2 py-0.5 font-mono text-xs font-bold text-[#334155]">
                                            #{idx + 1}
                                        </span>
                                        {isPetugas ? (
                                            <Link
                                                href={`/transaksi/${item.nomor_nota}`}
                                                className="font-mono text-base font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
                                            >
                                                {item.nomor_nota}
                                            </Link>
                                        ) : (
                                            <span className="font-mono text-base font-bold text-[#0F172A]">
                                                {item.nomor_nota}
                                            </span>
                                        )}
                                        <ItemPengantaranStatusBadge
                                            status={item.status_terima_pelanggan}
                                        />
                                        <TransactionStatusBadge
                                            status={
                                                item.transaksi.status_transaksi
                                            }
                                        />
                                        <PaymentStatusBadge
                                            status={
                                                item.transaksi.status_pembayaran
                                            }
                                        />
                                    </div>

                                    {/* Customer Name & Phone (Top Visual Hierarchy for Courier) */}
                                    <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                                        <h3 className="text-base font-bold text-[#0F172A]">
                                            {item.transaksi.pelanggan.nama}
                                        </h3>
                                        <span className="inline-flex items-center gap-1 font-mono text-xs text-[#475569]">
                                            <Phone
                                                className="h-3.5 w-3.5 shrink-0 text-[#5B697A]"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {
                                                    item.transaksi.pelanggan
                                                        .no_telepon
                                                }
                                            </span>
                                        </span>
                                    </div>

                                    {/* Highlighted Delivery Address Block */}
                                    <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3">
                                        <MapPin
                                            className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                                            aria-hidden="true"
                                        />
                                        <div className="min-w-0">
                                            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#5B697A]">
                                                Alamat Pengantaran
                                            </p>
                                            <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-[#0F172A]">
                                                {
                                                    item.transaksi.pelanggan
                                                        .alamat
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* Clean MetadataRow (Reguler, Wajib Lunas, Qty) */}
                                    <MetadataRow
                                        className="mt-2.5"
                                        items={[
                                            <span
                                                key="layanan"
                                                className="font-medium text-[#0F172A]"
                                            >
                                                {
                                                    item.transaksi.layanan
                                                        .nama_layanan
                                                }
                                            </span>,
                                            <SpeedTierBadge
                                                key="tier"
                                                tier={
                                                    item.transaksi.layanan
                                                        .tingkat_kecepatan
                                                }
                                                variant="text"
                                            />,
                                            <span
                                                key="qty"
                                                className="font-mono font-semibold tabular-nums text-[#0F172A]"
                                            >
                                                {
                                                    item.transaksi
                                                        .berat_atau_jumlah
                                                }{' '}
                                                {item.transaksi.layanan.satuan}
                                            </span>,
                                            <span key="items">
                                                {
                                                    item.transaksi
                                                        .detail_pakaian_count
                                                }{' '}
                                                baris pakaian
                                            </span>,
                                            item.transaksi.pelanggan
                                                .boleh_bayar_akhir ? (
                                                <span
                                                    key="paylater"
                                                    className="font-semibold text-[#3730A3]"
                                                >
                                                    Boleh Bayar Akhir
                                                </span>
                                            ) : (
                                                <PayLaterBadge
                                                    key="paylater"
                                                    allowed={false}
                                                    variant="text"
                                                />
                                            ),
                                        ]}
                                    />
                                </div>

                                {/* Billing Summary Box */}
                                <div className="w-full shrink-0 rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs lg:w-64">
                                    <dl className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-4">
                                            <dt className="text-[#5B697A]">
                                                Total Tagihan
                                            </dt>
                                            <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                                {formatRupiah(
                                                    item.transaksi.total_harga,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <dt className="text-[#5B697A]">
                                                Sudah Dibayar
                                            </dt>
                                            <dd className="font-mono font-semibold tabular-nums text-[#0F766E]">
                                                {formatRupiah(
                                                    item.transaksi
                                                        .total_dibayar,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 border-t border-[#D8E2E6] pt-1.5">
                                            <dt className="font-semibold text-[#0F172A]">
                                                Sisa Tagihan
                                            </dt>
                                            <dd
                                                className={`font-mono text-sm font-bold tabular-nums ${
                                                    sisaCents > 0
                                                        ? 'text-[#78350F]'
                                                        : 'text-[#065F46]'
                                                }`}
                                            >
                                                {formatRupiah(
                                                    item.transaksi.sisa_tagihan,
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                    <p className="mt-2 border-t border-[#D8E2E6] pt-1.5 text-[11px] text-[#5B697A]">
                                        Update:{' '}
                                        <span className="font-mono tabular-nums">
                                            {formatTanggal(item.waktu_update, {
                                                withTime: true,
                                            })}
                                        </span>
                                    </p>
                                    {item.transaksi.diambil_pada && (
                                        <p className="mt-0.5 text-[11px] font-medium text-[#065F46]">
                                            Diserahkan:{' '}
                                            <span className="font-mono tabular-nums">
                                                {formatTanggal(
                                                    item.transaksi.diambil_pada,
                                                    { withTime: true },
                                                )}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Contextual Warnings & Failure Reason */}
                            <div className="mt-3 space-y-2 empty:hidden">
                                {blockedByKK06 && (
                                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-3.5 py-2.5 text-xs leading-relaxed text-[#78350F]">
                                        <AlertTriangle
                                            className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                            aria-hidden="true"
                                        />
                                        <p>
                                            <strong>
                                                Peringatan Wajib Lunas (KK-06):
                                            </strong>{' '}
                                            Pelanggan masih memiliki sisa
                                            tagihan{' '}
                                            <strong className="font-mono tabular-nums">
                                                {formatRupiah(
                                                    item.transaksi.sisa_tagihan,
                                                )}
                                            </strong>{' '}
                                            dan tidak memiliki hak bayar akhir
                                            (<code>boleh_bayar_akhir = false</code>
                                            ). Status <strong>DITERIMA</strong>{' '}
                                            akan ditolak sistem; arahkan
                                            pelanggan melunasi di kasir terlebih
                                            dahulu atau tandai pengantaran
                                            sebagai <strong>GAGAL</strong>.
                                        </p>
                                    </div>
                                )}

                                {payLaterActive && (
                                    <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 border-l-4 border-l-[#4338CA] bg-[#EEF2FF] px-3.5 py-2.5 text-xs leading-relaxed text-[#3730A3]">
                                        <Info
                                            className="mt-0.5 h-4 w-4 shrink-0 text-[#4338CA]"
                                            aria-hidden="true"
                                        />
                                        <p>
                                            <strong>
                                                Hak Bayar Akhir Aktif (KK-06):
                                            </strong>{' '}
                                            Pelanggan diperbolehkan menerima
                                            pakaian dengan sisa piutang{' '}
                                            <strong className="font-mono tabular-nums">
                                                {formatRupiah(
                                                    item.transaksi.sisa_tagihan,
                                                )}
                                            </strong>{' '}
                                            (otomatis tercatat{' '}
                                            <strong>BELUM_LUNAS</strong> saat
                                            diterima).
                                        </p>
                                    </div>
                                )}

                                {item.status_terima_pelanggan === 'GAGAL' &&
                                    item.alasan_gagal && (
                                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs leading-relaxed text-[#9F1239]">
                                            <XCircle
                                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                                aria-hidden="true"
                                            />
                                            <p className="break-words">
                                                <strong>Alasan Gagal:</strong>{' '}
                                                {item.alasan_gagal}
                                            </p>
                                        </div>
                                    )}
                            </div>

                            {/* Touch-Friendly Action Bar */}
                            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                    {isAssignedKurir &&
                                        item.status_berikutnya.map(
                                            (nextStatus) => {
                                                if (nextStatus === 'GAGAL') {
                                                    return (
                                                        <button
                                                            key={nextStatus}
                                                            type="button"
                                                            disabled={
                                                                updatingItemId !==
                                                                null
                                                            }
                                                            onClick={() =>
                                                                openFailModal(
                                                                    item,
                                                                )
                                                            }
                                                            className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-[#9F1239] transition hover:bg-rose-100 disabled:opacity-50 sm:w-auto"
                                                        >
                                                            <XCircle
                                                                className="h-4 w-4 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                Tandai Gagal
                                                            </span>
                                                        </button>
                                                    );
                                                }

                                                const isDiterima =
                                                    nextStatus === 'DITERIMA';
                                                const btnClass = isDiterima
                                                    ? blockedByKK06
                                                        ? 'bg-[#B45309] hover:bg-amber-800 text-white'
                                                        : 'bg-[#047857] hover:bg-emerald-800 text-white'
                                                    : 'bg-[#0F766E] hover:bg-[#115E59] text-white';

                                                return (
                                                    <button
                                                        key={nextStatus}
                                                        type="button"
                                                        disabled={
                                                            updatingItemId !==
                                                            null
                                                        }
                                                        onClick={() =>
                                                            handleAdvanceItemStatus(
                                                                item,
                                                                nextStatus as Exclude<
                                                                    StatusItemPengantaran,
                                                                    | 'MENUNGGU'
                                                                    | 'GAGAL'
                                                                >,
                                                            )
                                                        }
                                                        className={`inline-flex min-h-[2.75rem] w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${btnClass}`}
                                                    >
                                                        {isDiterima ? (
                                                            <CheckCircle2
                                                                className="h-4 w-4 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                        ) : nextStatus ===
                                                          'DIAMBIL' ? (
                                                            <PackageCheck
                                                                className="h-4 w-4 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <Truck
                                                                className="h-4 w-4 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        <span>
                                                            {isUpdatingThis
                                                                ? 'Memperbarui...'
                                                                : (ACTION_BUTTON_LABELS[
                                                                      nextStatus
                                                                  ] ??
                                                                  `Ubah ke ${formatStatusItemPengantaran(nextStatus)}`)}
                                                        </span>
                                                    </button>
                                                );
                                            },
                                        )}

                                    {(isPetugas || isAssignedKurir) &&
                                        item.bisa_jadwalkan_ulang && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openRescheduleModal(item)
                                                }
                                                className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-[#EEF2FF] px-4 py-2 text-xs font-semibold text-[#3730A3] transition hover:bg-indigo-100 sm:w-auto"
                                            >
                                                <CalendarClock
                                                    className="h-4 w-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Jadwalkan Ulang (KK-07)
                                                </span>
                                            </button>
                                        )}

                                    {item.status_terima_pelanggan === 'GAGAL' &&
                                        !item.bisa_jadwalkan_ulang && (
                                            <span className="text-xs font-medium text-[#5B697A]">
                                                {item.transaksi
                                                    .status_transaksi ===
                                                'DIAMBIL'
                                                    ? 'Nota sudah diambil/diserahkan.'
                                                    : 'Sudah dijadwalkan ulang pada sesi lain.'}
                                            </span>
                                        )}
                                </div>

                                {isPetugas && (
                                    <Link
                                        href={`/transaksi/${item.nomor_nota}`}
                                        className="inline-flex min-h-[2.5rem] items-center gap-1 text-xs font-semibold text-[#0F766E] hover:text-[#115E59] hover:underline"
                                    >
                                        <span>Detail Nota &amp; Pembayaran</span>
                                        <ArrowRight
                                            className="h-3.5 w-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                )}
                            </div>
                        </article>
                    );
                })}
            </section>

            {/* Modal Tandai Gagal */}
            <Modal
                open={failTarget !== null}
                onClose={closeFailModal}
                closeDisabled={failForm.processing}
                maxWidth="md"
                title={
                    failTarget
                        ? `Tandai Pengantaran Gagal — ${failTarget.nomor_nota}`
                        : 'Tandai Pengantaran Gagal'
                }
                subtitle={
                    failTarget
                        ? `Pelanggan: ${failTarget.transaksi.pelanggan.nama}`
                        : undefined
                }
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeFailModal}
                            disabled={failForm.processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={failFormId}
                            disabled={failForm.processing || !failTarget}
                            className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-[#BE123C] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <XCircle
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>
                                {failForm.processing
                                    ? 'Menyimpan...'
                                    : 'Simpan Status Gagal'}
                            </span>
                        </button>
                    </>
                }
            >
                {failTarget && (
                    <form
                        id={failFormId}
                        onSubmit={handleFailSubmit}
                        className="space-y-4"
                        noValidate
                    >
                        <div className="rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs leading-relaxed text-[#9F1239]">
                            Menandai item ini <strong>GAGAL</strong> hanya
                            berlaku untuk nota{' '}
                            <strong className="font-mono">
                                {failTarget.nomor_nota}
                            </strong>{' '}
                            tanpa memengaruhi item pelanggan lain pada sesi ini
                            (KK-07). Setelah disimpan, nota dapat dijadwalkan
                            ulang secara terpisah.
                        </div>

                        <div>
                            <label
                                htmlFor={failReasonInputId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Alasan Gagal Pengantaran{' '}
                                <span
                                    aria-hidden="true"
                                    className="text-rose-600"
                                >
                                    *
                                </span>
                            </label>
                            <p
                                id={failReasonHintId}
                                className="mt-0.5 text-[11px] text-[#5B697A]"
                            >
                                Wajib diisi minimal 5 karakter (maks. 1000
                                karakter).
                            </p>
                            <textarea
                                id={failReasonInputId}
                                name="alasan_gagal"
                                required
                                autoFocus
                                minLength={5}
                                maxLength={1000}
                                rows={3}
                                value={failForm.data.alasan_gagal}
                                onChange={(event) => {
                                    setFailClientError(null);
                                    failForm.clearErrors('alasan_gagal');
                                    failForm.setData(
                                        'alasan_gagal',
                                        event.target.value,
                                    );
                                }}
                                placeholder="mis. Rumah pelanggan kosong atau pelanggan meminta pengantaran ulang..."
                                aria-invalid={Boolean(activeFailError)}
                                aria-describedby={
                                    activeFailError
                                        ? `${failReasonHintId} ${failReasonErrorId}`
                                        : failReasonHintId
                                }
                                className="mt-1.5 block min-h-[5.5rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                            {activeFailError && (
                                <p
                                    id={failReasonErrorId}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {activeFailError}
                                </p>
                            )}
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Jadwalkan Ulang (KK-07) */}
            <Modal
                open={rescheduleTarget !== null}
                onClose={closeRescheduleModal}
                closeDisabled={rescheduleForm.processing}
                maxWidth="md"
                title={
                    rescheduleTarget
                        ? `Jadwalkan Ulang (KK-07) — ${rescheduleTarget.nomor_nota}`
                        : 'Jadwalkan Ulang Pengantaran'
                }
                subtitle={
                    rescheduleTarget
                        ? `Pelanggan: ${rescheduleTarget.transaksi.pelanggan.nama}`
                        : undefined
                }
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeRescheduleModal}
                            disabled={rescheduleForm.processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={rescheduleFormId}
                            disabled={
                                rescheduleForm.processing || !rescheduleTarget
                            }
                            className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <CalendarClock
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>
                                {rescheduleForm.processing
                                    ? 'Menjadwalkan...'
                                    : 'Buat Jadwal Ulang'}
                            </span>
                        </button>
                    </>
                }
            >
                {rescheduleTarget && (
                    <form
                        id={rescheduleFormId}
                        onSubmit={handleRescheduleSubmit}
                        className="space-y-4"
                    >
                        {rescheduleGeneralError && (
                            <div
                                role="alert"
                                className="rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs font-medium text-[#9F1239]"
                            >
                                {rescheduleGeneralError}
                            </div>
                        )}

                        <div className="rounded-xl border border-indigo-200 border-l-4 border-l-[#4338CA] bg-[#EEF2FF] px-3.5 py-2.5 text-xs text-[#3730A3]">
                            <p className="font-semibold">
                                Isolasi Penjadwalan Ulang (KK-07)
                            </p>
                            <p className="mt-1 leading-relaxed">
                                Sistem akan membuat sesi pengantaran baru
                                berstatus <strong>DIJADWALKAN</strong> khusus
                                untuk nota{' '}
                                <strong className="font-mono">
                                    {rescheduleTarget.nomor_nota}
                                </strong>{' '}
                                tanpa mengubah catatan gagal lama maupun item
                                milik pelanggan lain pada sesi #
                                {pengantaran.id_pengantaran}.
                            </p>
                        </div>

                        {rescheduleTarget.alasan_gagal && (
                            <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-3.5 py-2.5 text-xs">
                                <p className="text-[11px] font-semibold text-[#5B697A]">
                                    Alasan Gagal Sebelumnya
                                </p>
                                <p className="mt-0.5 text-[#0F172A]">
                                    {rescheduleTarget.alasan_gagal}
                                </p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor={rescheduleDateId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Tanggal Pengantaran Baru{' '}
                                <span
                                    aria-hidden="true"
                                    className="text-rose-600"
                                >
                                    *
                                </span>
                            </label>
                            <input
                                id={rescheduleDateId}
                                name="tanggal_pengantaran"
                                type="date"
                                required
                                autoFocus
                                min={todayJakarta}
                                value={rescheduleForm.data.tanggal_pengantaran}
                                onChange={(event) =>
                                    rescheduleForm.setData(
                                        'tanggal_pengantaran',
                                        event.target.value,
                                    )
                                }
                                aria-invalid={Boolean(
                                    rescheduleForm.errors.tanggal_pengantaran,
                                )}
                                aria-describedby={
                                    rescheduleForm.errors.tanggal_pengantaran
                                        ? rescheduleDateErrId
                                        : undefined
                                }
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                            {rescheduleForm.errors.tanggal_pengantaran && (
                                <p
                                    id={rescheduleDateErrId}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {rescheduleForm.errors.tanggal_pengantaran}
                                </p>
                            )}
                        </div>

                        {isPetugas ? (
                            <div>
                                <label
                                    htmlFor={rescheduleKurirId}
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    Kurir Pengantaran Tujuan
                                </label>
                                <select
                                    id={rescheduleKurirId}
                                    name="id_petugas_antar"
                                    value={rescheduleForm.data.id_petugas_antar}
                                    onChange={(event) =>
                                        rescheduleForm.setData(
                                            'id_petugas_antar',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(
                                        rescheduleForm.errors.id_petugas_antar,
                                    )}
                                    aria-describedby={
                                        rescheduleForm.errors.id_petugas_antar
                                            ? rescheduleKurirErrId
                                            : undefined
                                    }
                                    className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                >
                                    {activeKurirOptions.map((kurir) => (
                                        <option
                                            key={kurir.id_petugas_antar}
                                            value={kurir.id_petugas_antar}
                                        >
                                            {kurir.nama_petugas_antar}
                                            {kurir.id_petugas_antar ===
                                            pengantaran.id_petugas_antar
                                                ? ' (Kurir sesi asal)'
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                                {rescheduleForm.errors.id_petugas_antar && (
                                    <p
                                        id={rescheduleKurirErrId}
                                        role="alert"
                                        className="mt-1.5 text-xs font-medium text-rose-600"
                                    >
                                        {rescheduleForm.errors.id_petugas_antar}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-3.5 py-2.5 text-xs text-[#475569]">
                                Kurir bertugas:{' '}
                                <strong className="text-[#0F172A]">
                                    {
                                        pengantaran.petugas_pengantaran
                                            .nama_petugas_antar
                                    }
                                </strong>{' '}
                                (dijadwalkan ulang ke jadwal Anda).
                            </div>
                        )}
                    </form>
                )}
            </Modal>
        </AppLayout>
    );
}
