import { useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Info, Wallet } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import Modal from '@/Components/Modal';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import {
    centsToDecimalString,
    formatRupiah,
    parseDecimalToCents,
} from '@/lib/format';
import type {
    PelangganItem,
    StatusPembayaran,
    StatusTransaksi,
} from '@/types';

export interface PelunasanModalTarget {
    nomor_nota: string;
    status_transaksi: StatusTransaksi;
    status_pembayaran: StatusPembayaran;
    total_harga: string;
    total_dibayar: string;
    sisa_tagihan: string;
    pelanggan: Pick<PelangganItem, 'nama' | 'no_telepon' | 'boleh_bayar_akhir'>;
}

interface PelunasanModalProps {
    target: PelunasanModalTarget | null;
    onClose: () => void;
    redirectTo?: 'transaksi.show' | 'serah-terima';
}

const VALID_DECIMAL_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

function validateNominalInput(rawValue: string, sisaCents: number): string | null {
    const trimmed = rawValue.trim();
    if (trimmed === '') {
        return 'Nominal pelunasan wajib diisi.';
    }

    if (!VALID_DECIMAL_PATTERN.test(trimmed)) {
        return 'Format nominal tidak valid (maksimal 2 angka di belakang koma).';
    }

    const nominalCents = parseDecimalToCents(trimmed);
    if (nominalCents <= 0) {
        return 'Nominal pelunasan harus lebih besar dari Rp 0.';
    }

    if (nominalCents > sisaCents) {
        return `Nominal pelunasan tidak boleh melebihi sisa tagihan (${formatRupiah(centsToDecimalString(sisaCents))}).`;
    }

    return null;
}

export default function PelunasanModal({
    target,
    onClose,
    redirectTo,
}: PelunasanModalProps) {
    const formId = useId();
    const nominalInputId = `${formId}-nominal`;
    const nominalHintId = `${formId}-nominal-hint`;
    const nominalErrorId = `${formId}-nominal-err`;

    const [clientError, setClientError] = useState<string | null>(null);
    const [hasEdited, setHasEdited] = useState(false);

    const { data, setData, post, processing, errors, clearErrors, transform } =
        useForm({
            nominal_bayar: '',
        });

    useEffect(() => {
        if (!target) {
            return;
        }

        clearErrors();
        setClientError(null);
        setHasEdited(false);
        setData({
            nominal_bayar: target.sisa_tagihan,
        });
    }, [target?.nomor_nota, target?.sisa_tagihan]);

    const sisaCents = target
        ? Math.max(0, parseDecimalToCents(target.sisa_tagihan))
        : 0;
    const nominalCents = Math.max(0, parseDecimalToCents(data.nominal_bayar));
    const isExactValid =
        VALID_DECIMAL_PATTERN.test(data.nominal_bayar.trim()) &&
        nominalCents > 0 &&
        nominalCents <= sisaCents;
    const sisaSetelahCents = isExactValid
        ? Math.max(0, sisaCents - nominalCents)
        : sisaCents;

    const handleClose = () => {
        if (processing) {
            return;
        }
        clearErrors();
        setClientError(null);
        onClose();
    };

    const handleFillFull = () => {
        if (!target) {
            return;
        }
        clearErrors();
        setClientError(null);
        setHasEdited(true);
        setData('nominal_bayar', target.sisa_tagihan);
    };

    const handleNominalBlur = () => {
        if (!hasEdited || !target) {
            return;
        }
        setClientError(validateNominalInput(data.nominal_bayar, sisaCents));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!target) {
            return;
        }

        const validationError = validateNominalInput(
            data.nominal_bayar,
            sisaCents,
        );
        if (validationError) {
            setClientError(validationError);
            return;
        }

        const normalizedNominal = centsToDecimalString(
            parseDecimalToCents(data.nominal_bayar),
        );

        transform(() => ({
            nominal_bayar: normalizedNominal,
            ...(redirectTo ? { redirect_to: redirectTo } : {}),
        }));

        post(`/transaksi/${target.nomor_nota}/pembayaran`, {
            preserveScroll: true,
            onSuccess: () => {
                clearErrors();
                setClientError(null);
                onClose();
            },
        });
    };

    const activeError = errors.nominal_bayar ?? clientError;
    const describedByIds = activeError
        ? `${nominalHintId} ${nominalErrorId}`
        : nominalHintId;

    return (
        <Modal
            open={target !== null}
            onClose={handleClose}
            closeDisabled={processing}
            maxWidth="md"
            title={
                target
                    ? `Catat Pelunasan — ${target.nomor_nota}`
                    : 'Catat Pelunasan'
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
                        Batal
                    </button>
                    <button
                        type="submit"
                        form={formId}
                        disabled={processing || !target || sisaCents <= 0}
                        className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            {processing
                                ? 'Menyimpan...'
                                : 'Catat Pembayaran Pelunasan'}
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
                    noValidate
                >
                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <TransactionStatusBadge
                                status={target.status_transaksi}
                            />
                            <PaymentStatusBadge
                                status={target.status_pembayaran}
                            />
                            <PayLaterBadge
                                allowed={target.pelanggan.boleh_bayar_akhir}
                                variant="text"
                            />
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
                                    Sudah Dibayar
                                </dt>
                                <dd className="font-mono font-semibold tabular-nums text-[#2563EB]">
                                    {formatRupiah(target.total_dibayar)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4 border-t border-[#D8E2E6] pt-1.5">
                                <dt className="font-semibold text-[#0F172A]">
                                    Sisa Tagihan
                                </dt>
                                <dd className="font-mono text-sm font-bold tabular-nums text-[#78350F]">
                                    {formatRupiah(target.sisa_tagihan)}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {target.status_transaksi === 'DIBATALKAN' && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs text-[#9F1239]">
                            <AlertCircle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                aria-hidden="true"
                            />
                            <p>
                                Transaksi ini berstatus{' '}
                                <strong>DIBATALKAN</strong> pasca pencucian
                                (KK-08). Pelunasan tetap dapat dicatat untuk
                                melunasi sisa <strong>biaya pembatalan</strong>.
                            </p>
                        </div>
                    )}

                    {target.status_transaksi === 'DIAMBIL' && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 border-l-4 border-l-[#4338CA] bg-[#EEF2FF] px-3.5 py-2.5 text-xs text-[#3730A3]">
                            <Info
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#4338CA]"
                                aria-hidden="true"
                            />
                            <p>
                                Pelunasan piutang pelanggan{' '}
                                <strong>boleh bayar akhir (KK-06)</strong>. Jika
                                dibayar penuh, status pembayaran otomatis
                                berubah menjadi <strong>LUNAS</strong>.
                            </p>
                        </div>
                    )}

                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label
                                htmlFor={nominalInputId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Nominal Bayar Pelunasan (Rp){' '}
                                <span
                                    aria-hidden="true"
                                    className="text-rose-600"
                                >
                                    *
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={handleFillFull}
                                disabled={sisaCents <= 0 || processing}
                                className="inline-flex min-h-[2rem] items-center rounded-lg border border-blue-200 bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE] disabled:opacity-50"
                            >
                                Isi Lunas Penuh (
                                {formatRupiah(target.sisa_tagihan)})
                            </button>
                        </div>

                        <p
                            id={nominalHintId}
                            className="mt-1 text-[11px] text-[#5B697A]"
                        >
                            Masukkan nominal &gt; Rp 0 s.d.{' '}
                            {formatRupiah(target.sisa_tagihan)} (mendukung
                            pelunasan penuh maupun bertahap).
                        </p>

                        <input
                            id={nominalInputId}
                            name="nominal_bayar"
                            type="number"
                            required
                            autoFocus
                            min="0.01"
                            max={target.sisa_tagihan}
                            step="0.01"
                            inputMode="decimal"
                            value={data.nominal_bayar}
                            onChange={(event) => {
                                setHasEdited(true);
                                setClientError(null);
                                clearErrors('nominal_bayar');
                                setData('nominal_bayar', event.target.value);
                            }}
                            onBlur={handleNominalBlur}
                            aria-invalid={Boolean(activeError)}
                            aria-describedby={describedByIds}
                            className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-[#0F172A] placeholder-[#5B697A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />

                        {activeError && (
                            <p
                                id={nominalErrorId}
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-rose-600"
                            >
                                {activeError}
                            </p>
                        )}
                    </div>

                    {isExactValid && (
                        <div className="rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] p-3.5 text-xs text-[#065F46]">
                            <div className="flex items-center gap-1.5 font-semibold">
                                <CheckCircle2
                                    className="h-4 w-4 shrink-0 text-[#047857]"
                                    aria-hidden="true"
                                />
                                <span>Pratinjau Setelah Pembayaran:</span>
                            </div>
                            <dl className="mt-2 space-y-1">
                                <div className="flex justify-between gap-4">
                                    <dt>Dibayar Sekarang</dt>
                                    <dd className="font-mono font-bold tabular-nums">
                                        {formatRupiah(
                                            centsToDecimalString(nominalCents),
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt>Sisa Tagihan Sesudah</dt>
                                    <dd className="font-mono font-bold tabular-nums">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                sisaSetelahCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt>Perkiraan Status Bayar</dt>
                                    <dd className="font-bold">
                                        {sisaSetelahCents === 0
                                            ? 'LUNAS'
                                            : target.status_transaksi ===
                                                'DIAMBIL'
                                              ? 'BELUM_LUNAS (Cicilan Piutang)'
                                              : 'Pembayaran Parsial'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </form>
            )}
        </Modal>
    );
}
