import { useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Info,
    PackageCheck,
    ShieldAlert,
    Truck,
} from 'lucide-react';
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
                        className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
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
                            className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                        >
                            <span>Beralih ke Pelunasan</span>
                            <ArrowRight
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                            />
                        </button>
                    )}
                    <button
                        type="submit"
                        form={formId}
                        disabled={processing || !canSubmit}
                        className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PackageCheck
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            {processing
                                ? 'Memproses...'
                                : piutangDicatat
                                  ? 'Serahkan & Catat Piutang'
                                  : 'Konfirmasi Serah Terima'}
                        </span>
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
                            className="rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs font-medium text-[#9F1239]"
                        >
                            {generalError}
                        </div>
                    )}

                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <TransactionStatusBadge
                                status={target.status_transaksi}
                            />
                            <PaymentStatusBadge
                                status={target.status_pembayaran}
                            />
                            <PayLaterBadge
                                allowed={bolehBayarAkhir}
                                variant={bolehBayarAkhir ? 'badge' : 'text'}
                            />
                            {piutangDicatat && (
                                <StatusBadge tone="amber">
                                    Piutang Dicatat (BELUM_LUNAS)
                                </StatusBadge>
                            )}
                        </div>

                        <dl className="mt-3 space-y-1.5">
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#5B697A]">Total Harga</dt>
                                <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                    {formatRupiah(target.total_harga)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#5B697A]">
                                    Total Dibayar
                                </dt>
                                <dd className="font-mono font-semibold tabular-nums text-[#0F766E]">
                                    {formatRupiah(target.total_dibayar)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-[#D8E2E6] pt-1.5">
                                <dt className="font-semibold text-[#0F172A]">
                                    Sisa Tagihan
                                </dt>
                                <dd
                                    className={`font-mono text-sm font-bold tabular-nums ${
                                        hasOutstanding
                                            ? 'text-[#78350F]'
                                            : 'text-[#065F46]'
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
                            className="flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-xs text-[#9F1239]"
                        >
                            <ShieldAlert
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">
                                    Transaksi Belum Siap Diserahkan
                                </p>
                                <p className="mt-1">
                                    Serah terima hanya diizinkan untuk nota
                                    berstatus <strong>SELESAI</strong> (status
                                    saat ini:{' '}
                                    <strong>{target.status_transaksi}</strong>).
                                </p>
                            </div>
                        </div>
                    )}

                    {blockedByKurir && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-xs text-[#9F1239]"
                        >
                            <Truck
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                aria-hidden="true"
                            />
                            <div>
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
                                            ?.nama_petugas_antar ??
                                            'pengantaran'}
                                    </strong>
                                    . Selesaikan atau tandai gagal pengantaran
                                    terlebih dahulu sebelum serah terima di
                                    loket.
                                </p>
                            </div>
                        </div>
                    )}

                    {blockedByKK06 && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-xs text-[#9F1239]"
                        >
                            <ShieldAlert
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">
                                    Serah Terima Diblokir — Wajib Lunas (KK-06)
                                </p>
                                <p className="mt-1 leading-relaxed">
                                    Pelanggan{' '}
                                    <strong>{target.pelanggan.nama}</strong>{' '}
                                    masih memiliki sisa tagihan{' '}
                                    <strong className="font-mono tabular-nums">
                                        {formatRupiah(target.sisa_tagihan)}
                                    </strong>{' '}
                                    dan{' '}
                                    <strong>
                                        tidak memiliki hak bayar akhir
                                    </strong>{' '}
                                    (<code>boleh_bayar_akhir = false</code>).
                                    Pelanggan wajib melunasi tagihan sebelum
                                    pakaian dapat diserahkan.
                                </p>
                            </div>
                        </div>
                    )}

                    {piutangDicatat && !blockedByKurir && !notSelesai && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-4 py-3 text-xs text-[#78350F]">
                            <AlertTriangle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">
                                    Peringatan Piutang Hak Bayar Akhir (KK-06)
                                </p>
                                <p className="mt-1 leading-relaxed">
                                    Pelanggan memiliki hak bayar akhir (
                                    <code>boleh_bayar_akhir = true</code>).
                                    Pakaian diperbolehkan diserahkan sekarang
                                    dengan sisa piutang sebesar{' '}
                                    <strong className="font-mono tabular-nums">
                                        {formatRupiah(target.sisa_tagihan)}
                                    </strong>
                                    ; status transaksi akan menjadi{' '}
                                    <strong>DIAMBIL</strong> dan status
                                    pembayaran tercatat{' '}
                                    <strong>BELUM_LUNAS</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {!hasOutstanding && !blockedByKurir && !notSelesai && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] px-4 py-3 text-xs text-[#065F46]">
                            <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">
                                    Tagihan Lunas — Siap Diserahkan
                                </p>
                                <p className="mt-1">
                                    Seluruh tagihan sudah terbayar penuh.
                                    Konfirmasi akan mengubah status transaksi
                                    menjadi <strong>DIAMBIL</strong> dan
                                    mencatat waktu pengambilan WIB.
                                </p>
                            </div>
                        </div>
                    )}

                    {hasWaitingCourierItem && !blockedByKurir && !notSelesai && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-teal-200 border-l-4 border-l-[#0F766E] bg-[#F0FDFA] px-4 py-3 text-xs text-[#115E59]">
                            <Info
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-semibold">
                                    Penutupan Otomatis Jadwal Kurir (MENUNGGU)
                                </p>
                                <p className="mt-1">
                                    Nota ini terdaftar pada jadwal pengantaran #
                                    {target.pengantaran_aktif?.id_pengantaran}{' '}
                                    berstatus <strong>MENUNGGU</strong>.
                                    Menyerahkan pakaian di loket akan menutup
                                    item pengantaran tersebut secara otomatis
                                    agar kurir tidak mencari cucian di outlet.
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor={catatanInputId}
                            className="block text-xs font-semibold text-[#0F172A]"
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
                            className="mt-1.5 block min-h-[4.25rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#5B697A] transition focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 disabled:bg-[#EEF2F5] disabled:text-[#5B697A]"
                        />
                        {errors.catatan && (
                            <p
                                id={catatanErrorId}
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-rose-600"
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
