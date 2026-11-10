import { useForm } from '@inertiajs/react';
import { useEffect, useId, type FormEvent } from 'react';
import Modal from '@/Components/Modal';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    StatusBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import { formatRupiah, parseDecimalToCents } from '@/lib/format';
import type {
    ItemPengantaranSummary,
    PelangganItem,
    StatusPembayaran,
    StatusTransaksi,
} from '@/types';

export interface SerahTerimaModalTarget {
    nomor_nota: string;
    status_transaksi: StatusTransaksi;
    status_pembayaran: StatusPembayaran;
    total_harga: string;
    total_dibayar: string;
    sisa_tagihan: string;
    sedang_diantar_kurir: boolean;
    pengantaran_aktif: ItemPengantaranSummary | null;
    pelanggan: Pick<PelangganItem, 'nama' | 'no_telepon' | 'boleh_bayar_akhir'>;
}

interface SerahTerimaModalProps {
    target: SerahTerimaModalTarget | null;
    onClose: () => void;
    onSwitchToPelunasan?: (target: SerahTerimaModalTarget) => void;
    redirectTo?: 'transaksi.show' | 'serah-terima';
}

export default function SerahTerimaModal({
    target,
    onClose,
    onSwitchToPelunasan,
    redirectTo,
}: SerahTerimaModalProps) {
    const formId = useId();
    const catatanInputId = `${formId}-catatan`;
    const catatanErrorId = `${formId}-catatan-err`;

    const { data, setData, post, processing, errors, clearErrors, transform } =
        useForm({
            catatan: '',
        });

    useEffect(() => {
        if (!target) {
            return;
        }

        clearErrors();
        setData({
            catatan: '',
        });
    }, [target?.nomor_nota, target?.sisa_tagihan]);

    const sisaCents = target
        ? Math.max(0, parseDecimalToCents(target.sisa_tagihan))
        : 0;
    const hasOutstanding = sisaCents > 0;
    const bolehBayarAkhir = target?.pelanggan.boleh_bayar_akhir ?? false;
    const blockedByKK06 = hasOutstanding && !bolehBayarAkhir;
    const piutangDicatat = hasOutstanding && bolehBayarAkhir;
    const blockedByKurir = target?.sedang_diantar_kurir ?? false;
    const notSelesai = target !== null && target.status_transaksi !== 'SELESAI';
    const hasWaitingCourierItem =
        target?.pengantaran_aktif?.status_terima_pelanggan === 'MENUNGGU';
    const canSubmit =
        target !== null && !notSelesai && !blockedByKurir && !blockedByKK06;

    const handleClose = () => {
        if (processing) {
            return;
        }
        clearErrors();
        onClose();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!target || !canSubmit) {
            return;
        }

        transform((formData) => ({
            catatan:
                formData.catatan.trim() !== ''
                    ? formData.catatan.trim()
                    : null,
            ...(redirectTo ? { redirect_to: redirectTo } : {}),
        }));

        post(`/transaksi/${target.nomor_nota}/serah-terima`, {
            preserveScroll: true,
            onSuccess: () => {
                clearErrors();
                onClose();
            },
        });
    };

    const errorRecord = errors as Record<string, string | undefined>;
    const generalError =
        errorRecord.serah_terima ??
        errorRecord.status_pembayaran ??
        errorRecord.status_transaksi;

    return (
        <Modal
            open={target !== null}
            onClose={handleClose}
            closeDisabled={processing}
            maxWidth="lg"
            title={
                target
                    ? `Serah Terima Loket (KK-06) — ${target.nomor_nota}`
                    : 'Serah Terima Loket'
            }
            subtitle={
                target
                    ? `${target.pelanggan.nama} (${target.pelanggan.no_telepon})`
                    : undefined
            }
            footer={
                <>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={processing}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Tutup
                    </button>
                    {blockedByKK06 && target && onSwitchToPelunasan && (
                        <button
                            type="button"
                            onClick={() => {
                                handleClose();
                                onSwitchToPelunasan(target);
                            }}
                            disabled={processing}
                            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:opacity-50"
                        >
                            Beralih ke Pelunasan &rarr;
                        </button>
                    )}
                    <button
                        type="submit"
                        form={formId}
                        disabled={processing || !canSubmit}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing
                            ? 'Memproses...'
                            : piutangDicatat
                              ? 'Serahkan & Catat Piutang'
                              : 'Konfirmasi Serah Terima'}
                    </button>
                </>
            }
        >
            {target && (
                <form
                    id={formId}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    {generalError && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                        >
                            {generalError}
                        </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <TransactionStatusBadge
                                status={target.status_transaksi}
                            />
                            <PaymentStatusBadge
                                status={target.status_pembayaran}
                            />
                            <PayLaterBadge allowed={bolehBayarAkhir} />
                            {piutangDicatat && (
                                <StatusBadge tone="amber">
                                    Piutang Dicatat (BELUM_LUNAS)
                                </StatusBadge>
                            )}
                        </div>

                        <dl className="mt-3 space-y-1.5">
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">Total Harga</dt>
                                <dd className="font-semibold tabular-nums text-slate-900">
                                    {formatRupiah(target.total_harga)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">
                                    Total Dibayar
                                </dt>
                                <dd className="font-semibold tabular-nums text-sky-700">
                                    {formatRupiah(target.total_dibayar)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-slate-200 pt-1.5">
                                <dt className="font-semibold text-slate-800">
                                    Sisa Tagihan
                                </dt>
                                <dd
                                    className={`text-sm font-bold tabular-nums ${
                                        hasOutstanding
                                            ? 'text-amber-700'
                                            : 'text-emerald-700'
                                    }`}
                                >
                                    {formatRupiah(target.sisa_tagihan)}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {notSelesai && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900"
                        >
                            <p className="font-bold">
                                Transaksi Belum Siap Diserahkan
                            </p>
                            <p className="mt-1">
                                Serah terima hanya diizinkan untuk nota berstatus{' '}
                                <strong>SELESAI</strong> (status saat ini:{' '}
                                <strong>{target.status_transaksi}</strong>).
                            </p>
                        </div>
                    )}

                    {blockedByKurir && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900"
                        >
                            <p className="font-bold">
                                Sedang Dibawa Kurir Pengantaran
                            </p>
                            <p className="mt-1">
                                Nota ini sedang berstatus{' '}
                                <strong>
                                    {target.pengantaran_aktif
                                        ?.status_terima_pelanggan ??
                                        'DALAM_PERJALANAN'}
                                </strong>{' '}
                                oleh kurir{' '}
                                <strong>
                                    {target.pengantaran_aktif?.pengantaran
                                        ?.nama_petugas_antar ?? 'pengantaran'}
                                </strong>
                                . Selesaikan atau tandai gagal pengantaran
                                terlebih dahulu sebelum serah terima di loket.
                            </p>
                        </div>
                    )}

                    {blockedByKK06 && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-950"
                        >
                            <p className="font-bold">
                                Serah Terima Diblokir — Wajib Lunas (KK-06)
                            </p>
                            <p className="mt-1 leading-relaxed">
                                Pelanggan <strong>{target.pelanggan.nama}</strong>{' '}
                                masih memiliki sisa tagihan{' '}
                                <strong className="tabular-nums">
                                    {formatRupiah(target.sisa_tagihan)}
                                </strong>{' '}
                                dan <strong>tidak memiliki hak bayar akhir</strong>{' '}
                                (<code>boleh_bayar_akhir = false</code>).
                                Pelanggan wajib melunasi tagihan sebelum pakaian
                                dapat diserahkan.
                            </p>
                        </div>
                    )}

                    {piutangDicatat && !blockedByKurir && !notSelesai && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                            <p className="font-bold">
                                Peringatan Piutang Hak Bayar Akhir (KK-06)
                            </p>
                            <p className="mt-1 leading-relaxed">
                                Pelanggan memiliki hak bayar akhir (
                                <code>boleh_bayar_akhir = true</code>). Pakaian
                                diperbolehkan diserahkan sekarang dengan sisa
                                piutang sebesar{' '}
                                <strong className="tabular-nums">
                                    {formatRupiah(target.sisa_tagihan)}
                                </strong>
                                ; status transaksi akan menjadi{' '}
                                <strong>DIAMBIL</strong> dan status pembayaran
                                tercatat <strong>BELUM_LUNAS</strong>.
                            </p>
                        </div>
                    )}

                    {!hasOutstanding && !blockedByKurir && !notSelesai && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
                            <p className="font-bold">
                                Tagihan Lunas — Siap Diserahkan
                            </p>
                            <p className="mt-1">
                                Seluruh tagihan sudah terbayar penuh. Konfirmasi
                                akan mengubah status transaksi menjadi{' '}
                                <strong>DIAMBIL</strong> dan mencatat waktu
                                pengambilan WIB.
                            </p>
                        </div>
                    )}

                    {hasWaitingCourierItem && !blockedByKurir && !notSelesai && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950">
                            <p className="font-semibold">
                                Penutupan Otomatis Jadwal Kurir (MENUNGGU)
                            </p>
                            <p className="mt-1">
                                Nota ini terdaftar pada jadwal pengantaran #
                                {target.pengantaran_aktif?.id_pengantaran}{' '}
                                berstatus <strong>MENUNGGU</strong>. Menyerahkan
                                pakaian di loket akan menutup item pengantaran
                                tersebut secara otomatis agar kurir tidak mencari
                                cucian di outlet.
                            </p>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor={catatanInputId}
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Catatan Serah Terima (Opsional)
                        </label>
                        <textarea
                            id={catatanInputId}
                            name="catatan"
                            rows={2}
                            maxLength={500}
                            disabled={!canSubmit || processing}
                            value={data.catatan}
                            onChange={(event) =>
                                setData('catatan', event.target.value)
                            }
                            placeholder="mis. Diambil langsung oleh pemilik / perwakilan keluarga..."
                            aria-invalid={Boolean(errors.catatan)}
                            aria-describedby={
                                errors.catatan ? catatanErrorId : undefined
                            }
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        {errors.catatan && (
                            <p
                                id={catatanErrorId}
                                role="alert"
                                className="mt-1 text-xs font-medium text-rose-600"
                            >
                                {errors.catatan}
                            </p>
                        )}
                    </div>
                </form>
            )}
        </Modal>
    );
}
