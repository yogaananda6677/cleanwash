import { Head, Link, router, useForm } from '@inertiajs/react';
import { useId, useMemo, useState, type FormEvent } from 'react';
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
                preserveScroll: true,
                onSuccess: () => {
                    rescheduleForm.clearErrors();
                    setRescheduleTarget(null);
                },
            },
        );
    };

    const totalItems = Math.max(1, pengantaran.total_item);
    const progressPct = Math.round(
        (pengantaran.item_selesai_count / totalItems) * 100,
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
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        &larr; Kembali
                    </Link>
                    {isAssignedKurir &&
                        pengantaran.status_pengantaran === 'DIJADWALKAN' && (
                            <button
                                type="button"
                                onClick={handleStartSession}
                                disabled={startingSession}
                                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:opacity-50"
                            >
                                {startingSession
                                    ? 'Memulai...'
                                    : 'Mulai Pengantaran'}
                            </button>
                        )}
                </div>
            }
        >
            <Head title={`Sesi Pengantaran #${pengantaran.id_pengantaran}`} />

            {/* Session Overview Header Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xl font-bold text-slate-900">
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
                        <p className="mt-1 text-xs text-slate-500">
                            Kurir:{' '}
                            <strong className="text-slate-800">
                                {
                                    pengantaran.petugas_pengantaran
                                        .nama_petugas_antar
                                }
                            </strong>{' '}
                            &bull; Tanggal Antar:{' '}
                            <strong className="text-slate-800">
                                {formatTanggal(pengantaran.tanggal_pengantaran)}
                            </strong>{' '}
                            &bull; Terakhir diperbarui:{' '}
                            {formatTanggal(pengantaran.updated_at, {
                                withTime: true,
                            })}
                        </p>
                    </div>

                    <div className="w-full sm:w-64">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                                Progres Penyelesaian
                            </span>
                            <span className="font-bold tabular-nums text-slate-900">
                                {pengantaran.item_selesai_count}/
                                {pengantaran.total_item} item ({progressPct}%)
                            </span>
                        </div>
                        <progress
                            value={pengantaran.item_selesai_count}
                            max={totalItems}
                            aria-label="Progres penyelesaian item pengantaran"
                            className="mt-2 h-2.5 w-full overflow-hidden rounded-full accent-emerald-600"
                        />
                    </div>
                </div>

                {isAssignedKurir &&
                    pengantaran.status_pengantaran === 'DIJADWALKAN' && (
                        <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950 sm:flex-row sm:items-center">
                            <p>
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
                                className="shrink-0 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:opacity-50"
                            >
                                {startingSession
                                    ? 'Memulai...'
                                    : 'Mulai Pengantaran'}
                            </button>
                        </div>
                    )}
            </section>

            {/* Delivery Items Cards */}
            <section className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                        Daftar Pengantaran Pelanggan ({pengantaran.items.length}{' '}
                        nota)
                    </h2>
                    <p className="text-xs text-slate-500">
                        Urutan status item: Menunggu &rarr; Diambil &rarr; Dalam
                        Perjalanan &rarr; Diterima / Gagal (KK-06, KK-07)
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
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                        >
                            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                            #{idx + 1}
                                        </span>
                                        {isPetugas ? (
                                            <Link
                                                href={`/transaksi/${item.nomor_nota}`}
                                                className="font-mono text-base font-bold text-sky-700 hover:text-sky-800 hover:underline"
                                            >
                                                {item.nomor_nota}
                                            </Link>
                                        ) : (
                                            <span className="font-mono text-base font-bold text-slate-900">
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
                                        <PayLaterBadge
                                            allowed={
                                                item.transaksi.pelanggan
                                                    .boleh_bayar_akhir
                                            }
                                        />
                                    </div>

                                    <p className="mt-2 text-sm font-bold text-slate-900">
                                        {item.transaksi.pelanggan.nama}{' '}
                                        <span className="font-mono text-xs font-normal text-slate-500">
                                            ({item.transaksi.pelanggan.no_telepon}
                                            )
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-600">
                                        Alamat:{' '}
                                        <strong className="font-medium text-slate-800">
                                            {item.transaksi.pelanggan.alamat}
                                        </strong>
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        <span>
                                            {item.transaksi.layanan.nama_layanan}
                                        </span>
                                        <SpeedTierBadge
                                            tier={
                                                item.transaksi.layanan
                                                    .tingkat_kecepatan
                                            }
                                        />
                                        <span>
                                            &bull;{' '}
                                            {item.transaksi.berat_atau_jumlah}{' '}
                                            {item.transaksi.layanan.satuan}
                                        </span>
                                        <span>
                                            &bull;{' '}
                                            {
                                                item.transaksi
                                                    .detail_pakaian_count
                                            }{' '}
                                            baris pakaian
                                        </span>
                                    </div>
                                </div>

                                <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs lg:min-w-60">
                                    <dl className="space-y-1">
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-slate-500">
                                                Total Tagihan
                                            </dt>
                                            <dd className="font-semibold tabular-nums text-slate-900">
                                                {formatRupiah(
                                                    item.transaksi.total_harga,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-slate-500">
                                                Sudah Dibayar
                                            </dt>
                                            <dd className="font-semibold tabular-nums text-sky-700">
                                                {formatRupiah(
                                                    item.transaksi
                                                        .total_dibayar,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-4 border-t border-slate-200 pt-1">
                                            <dt className="font-semibold text-slate-700">
                                                Sisa Tagihan
                                            </dt>
                                            <dd
                                                className={`font-bold tabular-nums ${
                                                    sisaCents > 0
                                                        ? 'text-amber-700'
                                                        : 'text-emerald-700'
                                                }`}
                                            >
                                                {formatRupiah(
                                                    item.transaksi.sisa_tagihan,
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                    <p className="mt-2 border-t border-slate-200 pt-1.5 text-[11px] text-slate-500">
                                        Update:{' '}
                                        {formatTanggal(item.waktu_update, {
                                            withTime: true,
                                        })}
                                    </p>
                                    {item.transaksi.diambil_pada && (
                                        <p className="mt-0.5 text-[11px] text-emerald-700">
                                            Diserahkan:{' '}
                                            {formatTanggal(
                                                item.transaksi.diambil_pada,
                                                { withTime: true },
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Contextual Warnings & Failure Reason */}
                            <div className="mt-3 space-y-2 empty:hidden">
                                {blockedByKK06 && (
                                    <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
                                        <strong>
                                            Peringatan Wajib Lunas (KK-06):
                                        </strong>{' '}
                                        Pelanggan masih memiliki sisa tagihan{' '}
                                        <strong className="tabular-nums">
                                            {formatRupiah(
                                                item.transaksi.sisa_tagihan,
                                            )}
                                        </strong>{' '}
                                        dan tidak memiliki hak bayar akhir (
                                        <code>boleh_bayar_akhir = false</code>).
                                        Status <strong>DITERIMA</strong> akan
                                        ditolak sistem; arahkan pelanggan
                                        melunasi di kasir terlebih dahulu atau
                                        tandai pengantaran sebagai{' '}
                                        <strong>GAGAL</strong>.
                                    </div>
                                )}

                                {payLaterActive && (
                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs text-indigo-950">
                                        <strong>
                                            Hak Bayar Akhir Aktif (KK-06):
                                        </strong>{' '}
                                        Pelanggan diperbolehkan menerima pakaian
                                        dengan sisa piutang{' '}
                                        <strong className="tabular-nums">
                                            {formatRupiah(
                                                item.transaksi.sisa_tagihan,
                                            )}
                                        </strong>{' '}
                                        (otomatis tercatat{' '}
                                        <strong>BELUM_LUNAS</strong> saat
                                        diterima).
                                    </div>
                                )}

                                {item.status_terima_pelanggan === 'GAGAL' &&
                                    item.alasan_gagal && (
                                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900">
                                            <strong>Alasan Gagal:</strong>{' '}
                                            {item.alasan_gagal}
                                        </div>
                                    )}
                            </div>

                            {/* Actions Row */}
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
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
                                                            className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                                        >
                                                            Tandai Gagal
                                                        </button>
                                                    );
                                                }

                                                const isDiterima =
                                                    nextStatus === 'DITERIMA';
                                                const btnClass = isDiterima
                                                    ? blockedByKK06
                                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                    : 'bg-sky-600 hover:bg-sky-700 text-white';

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
                                                        className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${btnClass}`}
                                                    >
                                                        {isUpdatingThis
                                                            ? 'Memperbarui...'
                                                            : (ACTION_BUTTON_LABELS[
                                                                  nextStatus
                                                              ] ??
                                                              `Ubah ke ${formatStatusItemPengantaran(nextStatus)}`)}
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
                                                className="rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100"
                                            >
                                                Jadwalkan Ulang (KK-07)
                                            </button>
                                        )}

                                    {item.status_terima_pelanggan === 'GAGAL' &&
                                        !item.bisa_jadwalkan_ulang && (
                                            <span className="text-xs font-medium text-slate-500">
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
                                        className="text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline"
                                    >
                                        Detail Nota &amp; Pembayaran &rarr;
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
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={failFormId}
                            disabled={failForm.processing || !failTarget}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {failForm.processing
                                ? 'Menyimpan...'
                                : 'Simpan Status Gagal'}
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
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900">
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
                                className="block text-xs font-semibold text-slate-700"
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
                                className="mt-0.5 text-[11px] text-slate-500"
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
                                className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {activeFailError && (
                                <p
                                    id={failReasonErrorId}
                                    role="alert"
                                    className="mt-1 text-xs font-medium text-rose-600"
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
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={rescheduleFormId}
                            disabled={
                                rescheduleForm.processing || !rescheduleTarget
                            }
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {rescheduleForm.processing
                                ? 'Menjadwalkan...'
                                : 'Buat Jadwal Ulang'}
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
                                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                            >
                                {rescheduleGeneralError}
                            </div>
                        )}

                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs text-indigo-950">
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
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Alasan Gagal Sebelumnya
                                </p>
                                <p className="mt-0.5 text-slate-800">
                                    {rescheduleTarget.alasan_gagal}
                                </p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor={rescheduleDateId}
                                className="block text-xs font-semibold text-slate-700"
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {rescheduleForm.errors.tanggal_pengantaran && (
                                <p
                                    id={rescheduleDateErrId}
                                    role="alert"
                                    className="mt-1 text-xs font-medium text-rose-600"
                                >
                                    {rescheduleForm.errors.tanggal_pengantaran}
                                </p>
                            )}
                        </div>

                        {isPetugas ? (
                            <div>
                                <label
                                    htmlFor={rescheduleKurirId}
                                    className="block text-xs font-semibold text-slate-700"
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
                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
                                        className="mt-1 text-xs font-medium text-rose-600"
                                    >
                                        {rescheduleForm.errors.id_petugas_antar}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                                Kurir bertugas:{' '}
                                <strong className="text-slate-900">
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
