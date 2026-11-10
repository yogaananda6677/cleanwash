import { useForm } from '@inertiajs/react';
import { useEffect, useId, type FormEvent } from 'react';
import Modal from '@/Components/Modal';
import { JenisInsidenBadge } from '@/Components/StatusBadge';
import {
    centsToDecimalString,
    formatRupiah,
    parseDecimalToCents,
} from '@/lib/format';
import type { DetailPakaianItem, JenisInsiden } from '@/types';

export interface KonfirmasiKompensasiTarget {
    id_laporan: number;
    nomor_nota: string;
    jenis_insiden: JenisInsiden;
    keterangan: string;
    estimasi_kompensasi: string;
    pelanggan_nama: string;
    detail_pakaian: DetailPakaianItem;
    pegawai_pelapor?: {
        nama_pegawai: string;
    } | null;
    sisa_tagihan: string;
    total_harga: string;
    total_dibayar: string;
}

interface KonfirmasiKompensasiModalProps {
    target: KonfirmasiKompensasiTarget | null;
    onClose: () => void;
}

export default function KonfirmasiKompensasiModal({
    target,
    onClose,
}: KonfirmasiKompensasiModalProps) {
    const formId = useId();
    const nilaiFieldId = `${formId}-nilai`;
    const nilaiErrorId = `${formId}-nilai-err`;
    const catatanFieldId = `${formId}-catatan`;
    const catatanErrorId = `${formId}-catatan-err`;

    const { data, setData, post, processing, errors, clearErrors, transform } =
        useForm({
            nilai_kompensasi: '',
            keterangan_konfirmasi: '',
        });

    useEffect(() => {
        if (!target) {
            return;
        }

        clearErrors();
        setData({
            nilai_kompensasi: target.estimasi_kompensasi,
            keterangan_konfirmasi: '',
        });
    }, [target?.id_laporan]);

    const handleClose = () => {
        if (processing) {
            return;
        }
        clearErrors();
        onClose();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!target) {
            return;
        }

        transform((formData) => ({
            nilai_kompensasi:
                formData.nilai_kompensasi.trim() !== ''
                    ? formData.nilai_kompensasi.trim()
                    : null,
            keterangan_konfirmasi:
                formData.keterangan_konfirmasi.trim() !== ''
                    ? formData.keterangan_konfirmasi.trim()
                    : null,
        }));

        post(`/insiden/${target.id_laporan}/konfirmasi`, {
            preserveScroll: true,
            onSuccess: () => {
                clearErrors();
                onClose();
            },
        });
    };

    const kompensasiCents = target
        ? Math.max(
              0,
              parseDecimalToCents(
                  data.nilai_kompensasi.trim() === ''
                      ? target.estimasi_kompensasi
                      : data.nilai_kompensasi,
              ),
          )
        : 0;
    const sisaSebelumCents = target
        ? Math.max(0, parseDecimalToCents(target.sisa_tagihan))
        : 0;
    const kelebihanCents = Math.max(0, kompensasiCents - sisaSebelumCents);
    const sisaSesudahCents = Math.max(0, sisaSebelumCents - kompensasiCents);

    const laporanError = (errors as Record<string, string | undefined>).laporan;

    return (
        <Modal
            open={target !== null}
            onClose={handleClose}
            closeDisabled={processing}
            maxWidth="lg"
            title={
                target
                    ? `Konfirmasi Kompensasi Laporan #${target.id_laporan}`
                    : 'Konfirmasi Kompensasi'
            }
            subtitle={
                target
                    ? `Nota ${target.nomor_nota} — ${target.pelanggan_nama}`
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
                        Batal
                    </button>
                    <button
                        type="submit"
                        form={formId}
                        disabled={processing || !target}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing
                            ? 'Memproses...'
                            : 'Konfirmasi & Potong Saldo'}
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
                    {laporanError && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                        >
                            {laporanError}
                        </div>
                    )}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">
                                {target.detail_pakaian.jenis_pakaian} (
                                {target.detail_pakaian.jumlah_potong} pcs)
                            </span>
                            <JenisInsidenBadge jenis={target.jenis_insiden} />
                        </div>
                        <p className="mt-1.5 text-slate-700">
                            {target.keterangan}
                        </p>
                        {target.pegawai_pelapor && (
                            <p className="mt-1.5 text-[11px] text-slate-500">
                                Dilaporkan oleh:{' '}
                                {target.pegawai_pelapor.nama_pegawai}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                        <div>
                            <p className="text-slate-500">Total Tagihan</p>
                            <p className="mt-0.5 font-semibold tabular-nums text-slate-900">
                                {formatRupiah(target.total_harga)}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">Sudah Dibayar</p>
                            <p className="mt-0.5 font-semibold tabular-nums text-sky-700">
                                {formatRupiah(target.total_dibayar)}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">Sisa Tagihan</p>
                            <p className="mt-0.5 font-bold tabular-nums text-amber-700">
                                {formatRupiah(target.sisa_tagihan)}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor={nilaiFieldId}
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Nominal Kompensasi Disetujui (Rp){' '}
                            <span aria-hidden="true" className="text-rose-600">
                                *
                            </span>
                        </label>
                        <input
                            id={nilaiFieldId}
                            name="nilai_kompensasi"
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            autoFocus
                            required
                            value={data.nilai_kompensasi}
                            onChange={(event) =>
                                setData('nilai_kompensasi', event.target.value)
                            }
                            aria-invalid={Boolean(errors.nilai_kompensasi)}
                            aria-describedby={
                                errors.nilai_kompensasi
                                    ? nilaiErrorId
                                    : undefined
                            }
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                                Estimasi sistem:{' '}
                                {formatRupiah(target.estimasi_kompensasi)}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setData(
                                        'nilai_kompensasi',
                                        target.estimasi_kompensasi,
                                    )
                                }
                                className="font-semibold text-sky-700 hover:underline"
                            >
                                Gunakan Estimasi
                            </button>
                        </div>
                        {errors.nilai_kompensasi && (
                            <p
                                id={nilaiErrorId}
                                role="alert"
                                className="mt-1 text-xs font-medium text-rose-600"
                            >
                                {errors.nilai_kompensasi}
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-600">
                                Estimasi Sisa Tagihan Setelah Potong:
                            </span>
                            <span className="font-bold tabular-nums text-slate-900">
                                {formatRupiah(
                                    centsToDecimalString(sisaSesudahCents),
                                )}
                            </span>
                        </div>
                    </div>

                    {kelebihanCents > 0 && (
                        <div
                            role="status"
                            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950"
                        >
                            <p className="font-bold">
                                Kelebihan Ganti Rugi Tunai ke Pelanggan
                            </p>
                            <p className="mt-1 leading-relaxed">
                                Nominal kompensasi melebihi sisa tagihan saat
                                ini ({formatRupiah(target.sisa_tagihan)}).
                                Kelebihan sebesar{' '}
                                <strong className="tabular-nums">
                                    {formatRupiah(
                                        centsToDecimalString(kelebihanCents),
                                    )}
                                </strong>{' '}
                                akan dicatat sebagai{' '}
                                <code>kelebihan_ganti_rugi</code> yang wajib
                                dibayarkan tunai kepada pelanggan.
                            </p>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor={catatanFieldId}
                            className="block text-xs font-semibold text-slate-700"
                        >
                            Catatan Konfirmasi Petugas (Opsional)
                        </label>
                        <textarea
                            id={catatanFieldId}
                            name="keterangan_konfirmasi"
                            maxLength={500}
                            rows={2}
                            value={data.keterangan_konfirmasi}
                            onChange={(event) =>
                                setData(
                                    'keterangan_konfirmasi',
                                    event.target.value,
                                )
                            }
                            placeholder="mis. Disetujui sesuai kesepakatan pelanggan..."
                            aria-invalid={Boolean(errors.keterangan_konfirmasi)}
                            aria-describedby={
                                errors.keterangan_konfirmasi
                                    ? catatanErrorId
                                    : undefined
                            }
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        {errors.keterangan_konfirmasi && (
                            <p
                                id={catatanErrorId}
                                role="alert"
                                className="mt-1 text-xs font-medium text-rose-600"
                            >
                                {errors.keterangan_konfirmasi}
                            </p>
                        )}
                    </div>
                </form>
            )}
        </Modal>
    );
}
