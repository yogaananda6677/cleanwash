import { useForm } from '@inertiajs/react';
import { AlertTriangle, Info } from 'lucide-react';
import { useEffect, useId, type FormEvent } from 'react';
import Modal from '@/Components/Modal';
import {
    centsToDecimalString,
    estimateCompensationPreview,
    formatRupiah,
} from '@/lib/format';
import type {
    EligibleInsidenTransaksiOption,
    JenisInsiden,
    UserRole,
} from '@/types';

interface LaporkanInsidenModalProps {
    open: boolean;
    onClose: () => void;
    role: UserRole | undefined;
    submitMode: 'global' | 'transaksi';
    fixedTransaksi?: EligibleInsidenTransaksiOption | null;
    transaksiOptions?: EligibleInsidenTransaksiOption[];
}

export default function LaporkanInsidenModal({
    open,
    onClose,
    role,
    submitMode,
    fixedTransaksi = null,
    transaksiOptions = [],
}: LaporkanInsidenModalProps) {
    const formId = useId();
    const notaFieldId = `${formId}-nota`;
    const detailFieldId = `${formId}-detail`;
    const keteranganFieldId = `${formId}-keterangan`;
    const keteranganErrorId = `${formId}-keterangan-err`;
    const nilaiFieldId = `${formId}-nilai`;
    const nilaiErrorId = `${formId}-nilai-err`;

    const isPetugas = role === 'PETUGAS';

    const { data, setData, post, processing, errors, clearErrors, transform } =
        useForm<{
            nomor_nota: string;
            id_detail: string;
            jenis_insiden: JenisInsiden;
            keterangan: string;
            nilai_kompensasi: string;
        }>({
            nomor_nota: '',
            id_detail: '',
            jenis_insiden: 'RUSAK',
            keterangan: '',
            nilai_kompensasi: '',
        });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();

        if (submitMode === 'transaksi' && fixedTransaksi) {
            setData({
                nomor_nota: fixedTransaksi.nomor_nota,
                id_detail: String(
                    fixedTransaksi.detail_pakaian[0]?.id_detail ?? '',
                ),
                jenis_insiden: 'RUSAK',
                keterangan: '',
                nilai_kompensasi: '',
            });
            return;
        }

        const firstOption = transaksiOptions[0] ?? null;
        setData({
            nomor_nota: firstOption?.nomor_nota ?? '',
            id_detail: String(firstOption?.detail_pakaian[0]?.id_detail ?? ''),
            jenis_insiden: 'RUSAK',
            keterangan: '',
            nilai_kompensasi: '',
        });
    }, [open, submitMode, fixedTransaksi?.nomor_nota]);

    const activeTransaksi =
        submitMode === 'transaksi'
            ? fixedTransaksi
            : (transaksiOptions.find(
                  (item) => item.nomor_nota === data.nomor_nota,
              ) ?? null);

    const activeDetails = activeTransaksi?.detail_pakaian ?? [];
    const selectedDetail =
        activeDetails.find(
            (item) => String(item.id_detail) === data.id_detail,
        ) ??
        activeDetails[0] ??
        null;

    const compensationPreview =
        activeTransaksi && selectedDetail
            ? estimateCompensationPreview({
                  subtotalLayanan: activeTransaksi.subtotal_layanan,
                  itemJumlahPotong: selectedDetail.jumlah_potong,
                  totalPotongNota: activeTransaksi.total_potong,
                  jenisInsiden: data.jenis_insiden,
              })
            : null;

    const handleNotaChange = (nextNota: string) => {
        const matched = transaksiOptions.find(
            (item) => item.nomor_nota === nextNota,
        );
        setData((prev) => ({
            ...prev,
            nomor_nota: nextNota,
            id_detail: String(matched?.detail_pakaian[0]?.id_detail ?? ''),
        }));
    };

    const handleClose = () => {
        if (processing) {
            return;
        }
        clearErrors();
        onClose();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!activeTransaksi || !selectedDetail) {
            return;
        }

        const targetUrl =
            submitMode === 'transaksi'
                ? `/transaksi/${activeTransaksi.nomor_nota}/insiden`
                : '/insiden';

        transform((formData) => ({
            nomor_nota: formData.nomor_nota,
            id_detail: Number(formData.id_detail),
            jenis_insiden: formData.jenis_insiden,
            keterangan: formData.keterangan,
            ...(isPetugas && formData.nilai_kompensasi.trim() !== ''
                ? { nilai_kompensasi: formData.nilai_kompensasi.trim() }
                : {}),
        }));

        post(targetUrl, {
            preserveScroll: true,
            onSuccess: () => {
                clearErrors();
                onClose();
            },
        });
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeDisabled={processing}
            maxWidth="lg"
            title="Laporkan Insiden Pakaian"
            subtitle={
                activeTransaksi
                    ? `Nota ${activeTransaksi.nomor_nota} — ${activeTransaksi.pelanggan_nama}`
                    : 'Pilih transaksi dan item pakaian yang mengalami kerusakan atau kehilangan'
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
                        disabled={
                            processing || !activeTransaksi || !selectedDetail
                        }
                        className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-[#BE123C] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <AlertTriangle
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            {processing
                                ? 'Menyimpan...'
                                : isPetugas
                                  ? 'Catat & Potong Kompensasi'
                                  : 'Ajukan Laporan Insiden'}
                        </span>
                    </button>
                </>
            }
        >
            {!activeTransaksi && submitMode === 'global' ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] p-4 text-xs text-[#78350F]">
                    <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                        aria-hidden="true"
                    />
                    <p>
                        Belum ada transaksi berstatus <strong>AKTIF</strong>{' '}
                        atau <strong>SELESAI</strong> yang dapat dilaporkan
                        insidennya.
                    </p>
                </div>
            ) : (
                <form
                    id={formId}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    {submitMode === 'global' ? (
                        <div>
                            <label
                                htmlFor={notaFieldId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Transaksi (Nota AKTIF / SELESAI){' '}
                                <span
                                    aria-hidden="true"
                                    className="text-rose-600"
                                >
                                    *
                                </span>
                            </label>
                            <select
                                id={notaFieldId}
                                name="nomor_nota"
                                required
                                autoFocus
                                value={data.nomor_nota}
                                onChange={(event) =>
                                    handleNotaChange(event.target.value)
                                }
                                aria-invalid={Boolean(errors.nomor_nota)}
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                            >
                                {transaksiOptions.map((option) => (
                                    <option
                                        key={option.nomor_nota}
                                        value={option.nomor_nota}
                                    >
                                        {option.nomor_nota} —{' '}
                                        {option.pelanggan_nama} (
                                        {option.layanan_nama},{' '}
                                        {option.status_transaksi})
                                    </option>
                                ))}
                            </select>
                            {errors.nomor_nota && (
                                <p
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {errors.nomor_nota}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-3.5 py-2.5 text-xs">
                            <p className="font-semibold text-[#0F172A]">
                                <span className="font-mono">
                                    {activeTransaksi?.nomor_nota}
                                </span>{' '}
                                &bull; {activeTransaksi?.layanan_nama}
                            </p>
                            <p className="mt-0.5 text-[#475569]">
                                Pelanggan: {activeTransaksi?.pelanggan_nama}{' '}
                                &bull; Subtotal Layanan:{' '}
                                <span className="font-mono font-semibold tabular-nums">
                                    {formatRupiah(
                                        activeTransaksi?.subtotal_layanan,
                                    )}
                                </span>
                            </p>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor={detailFieldId}
                            className="block text-xs font-semibold text-[#0F172A]"
                        >
                            Item Detail Pakaian Terdampak{' '}
                            <span aria-hidden="true" className="text-rose-600">
                                *
                            </span>
                        </label>
                        <select
                            id={detailFieldId}
                            name="id_detail"
                            required
                            autoFocus={submitMode === 'transaksi'}
                            value={data.id_detail}
                            onChange={(event) =>
                                setData('id_detail', event.target.value)
                            }
                            aria-invalid={Boolean(errors.id_detail)}
                            className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        >
                            {activeDetails.map((detail) => (
                                <option
                                    key={detail.id_detail}
                                    value={detail.id_detail}
                                >
                                    {detail.jenis_pakaian} (
                                    {detail.jumlah_potong} pcs) —{' '}
                                    {detail.kondisi_pakaian}
                                </option>
                            ))}
                        </select>
                        {errors.id_detail && (
                            <p
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-rose-600"
                            >
                                {errors.id_detail}
                            </p>
                        )}
                    </div>

                    <fieldset>
                        <legend className="text-xs font-semibold text-[#0F172A]">
                            Jenis Insiden{' '}
                            <span aria-hidden="true" className="text-rose-600">
                                *
                            </span>
                        </legend>
                        <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            <label
                                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition ${
                                    data.jenis_insiden === 'RUSAK'
                                        ? 'border-[#B45309] bg-[#FFFBEB] ring-1 ring-amber-300'
                                        : 'border-[#7C8C9D] bg-white hover:bg-[#F8FAFC]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="jenis_insiden"
                                    value="RUSAK"
                                    checked={data.jenis_insiden === 'RUSAK'}
                                    onChange={() =>
                                        setData('jenis_insiden', 'RUSAK')
                                    }
                                    className="mt-0.5 accent-[#B45309]"
                                />
                                <span>
                                    <span className="block font-semibold text-[#0F172A]">
                                        Rusak (KK-04)
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-[#475569]">
                                        Estimasi kompensasi 5&times; basis
                                        prorata item
                                    </span>
                                </span>
                            </label>

                            <label
                                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition ${
                                    data.jenis_insiden === 'HILANG'
                                        ? 'border-[#BE123C] bg-[#FFF1F2] ring-1 ring-rose-300'
                                        : 'border-[#7C8C9D] bg-white hover:bg-[#F8FAFC]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="jenis_insiden"
                                    value="HILANG"
                                    checked={data.jenis_insiden === 'HILANG'}
                                    onChange={() =>
                                        setData('jenis_insiden', 'HILANG')
                                    }
                                    className="mt-0.5 accent-[#BE123C]"
                                />
                                <span>
                                    <span className="block font-semibold text-[#0F172A]">
                                        Hilang (KK-05)
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-[#475569]">
                                        Estimasi kompensasi 10&times; basis
                                        prorata item
                                    </span>
                                </span>
                            </label>
                        </div>
                        {errors.jenis_insiden && (
                            <p
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-rose-600"
                            >
                                {errors.jenis_insiden}
                            </p>
                        )}
                    </fieldset>

                    {compensationPreview && selectedDetail && activeTransaksi && (
                        <div className="rounded-xl border border-blue-200 border-l-4 border-l-[#2563EB] bg-[#EFF6FF] px-4 py-3 text-xs text-[#1D4ED8]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 font-semibold">
                                    <Info
                                        className="h-4 w-4 shrink-0 text-[#2563EB]"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Pratinjau Estimasi Kompensasi (
                                        {compensationPreview.multiplier}
                                        &times;):
                                    </span>
                                </span>
                                <span className="font-mono text-sm font-bold tabular-nums text-[#2563EB]">
                                    {formatRupiah(
                                        compensationPreview.estimasiDecimal,
                                    )}
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[#1D4ED8]">
                                Prorata {selectedDetail.jumlah_potong}/
                                {activeTransaksi.total_potong} potong dari
                                subtotal{' '}
                                <span className="font-mono tabular-nums">
                                    {formatRupiah(
                                        activeTransaksi.subtotal_layanan,
                                    )}
                                </span>{' '}
                                (basis{' '}
                                <span className="font-mono tabular-nums">
                                    {formatRupiah(
                                        centsToDecimalString(
                                            compensationPreview.basisCents,
                                        ),
                                    )}
                                </span>
                                ). Nilai resmi dihitung server saat penyimpanan.
                            </p>
                        </div>
                    )}

                    {isPetugas ? (
                        <div>
                            <label
                                htmlFor={nilaiFieldId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Override Nilai Kompensasi (Opsional)
                            </label>
                            <input
                                id={nilaiFieldId}
                                name="nilai_kompensasi"
                                type="number"
                                min="0.01"
                                step="0.01"
                                inputMode="decimal"
                                value={data.nilai_kompensasi}
                                onChange={(event) =>
                                    setData(
                                        'nilai_kompensasi',
                                        event.target.value,
                                    )
                                }
                                placeholder={
                                    compensationPreview
                                        ? `Kosongkan untuk pakai estimasi (${compensationPreview.estimasiDecimal})`
                                        : 'Nominal Rupiah kompensasi'
                                }
                                aria-invalid={Boolean(errors.nilai_kompensasi)}
                                aria-describedby={
                                    errors.nilai_kompensasi
                                        ? nilaiErrorId
                                        : undefined
                                }
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-[#0F172A] placeholder-[#5B697A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                            />
                            <p className="mt-1 text-[11px] text-[#5B697A]">
                                Sebagai Petugas, laporan langsung berstatus{' '}
                                <span className="font-semibold text-[#065F46]">
                                    TERKONFIRMASI
                                </span>{' '}
                                dan langsung memotong sisa tagihan transaksi.
                            </p>
                            {errors.nilai_kompensasi && (
                                <p
                                    id={nilaiErrorId}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {errors.nilai_kompensasi}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#78350F]">
                            <AlertTriangle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                aria-hidden="true"
                            />
                            <p>
                                Laporan yang diajukan oleh Pegawai akan
                                berstatus <strong>MENUNGGU_KONFIRMASI</strong>{' '}
                                hingga Petugas Kasir menyetujui nominal
                                kompensasi dan memotong saldo nota.
                            </p>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor={keteranganFieldId}
                            className="block text-xs font-semibold text-[#0F172A]"
                        >
                            Kronologi / Keterangan Insiden{' '}
                            <span aria-hidden="true" className="text-rose-600">
                                *
                            </span>
                        </label>
                        <textarea
                            id={keteranganFieldId}
                            name="keterangan"
                            required
                            minLength={5}
                            maxLength={1000}
                            rows={3}
                            value={data.keterangan}
                            onChange={(event) =>
                                setData('keterangan', event.target.value)
                            }
                            placeholder="Jelaskan kerusakan/kehilangan yang terjadi (minimal 5 karakter)..."
                            aria-invalid={Boolean(errors.keterangan)}
                            aria-describedby={
                                errors.keterangan
                                    ? keteranganErrorId
                                    : undefined
                            }
                            className="mt-1.5 block min-h-[5.5rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#5B697A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />
                        {errors.keterangan && (
                            <p
                                id={keteranganErrorId}
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-rose-600"
                            >
                                {errors.keterangan}
                            </p>
                        )}
                    </div>
                </form>
            )}
        </Modal>
    );
}
