import { useForm } from '@inertiajs/react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
                        className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form={formId}
                        disabled={processing || !target}
                        className="inline-flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <CheckCircle2
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            {processing
                                ? 'Memproses...'
                                : 'Konfirmasi & Potong Saldo'}
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
                    {laporanError && (
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3.5 py-2.5 text-xs font-medium text-[#9F1239]"
                        >
                            <AlertCircle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                aria-hidden="true"
                            />
                            <p>{laporanError}</p>
                        </div>
                    )}

                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-[#0F172A]">
                                {target.detail_pakaian.jenis_pakaian} (
                                {target.detail_pakaian.jumlah_potong} pcs)
                            </span>
                            <JenisInsidenBadge jenis={target.jenis_insiden} />
                        </div>
                        <p className="mt-1.5 text-[#475569]">
                            {target.keterangan}
                        </p>
                        {target.pegawai_pelapor && (
                            <p className="mt-1.5 text-[11px] text-[#5B697A]">
                                Dilaporkan oleh:{' '}
                                {target.pegawai_pelapor.nama_pegawai}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#D8E2E6] bg-white p-3.5 text-xs sm:grid-cols-3">
                        <div>
                            <p className="text-[#5B697A]">Total Tagihan</p>
                            <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#0F172A]">
                                {formatRupiah(target.total_harga)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[#5B697A]">Sudah Dibayar</p>
                            <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#2563EB]">
                                {formatRupiah(target.total_dibayar)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[#5B697A]">Sisa Tagihan</p>
                            <p className="mt-0.5 font-mono font-bold tabular-nums text-[#78350F]">
                                {formatRupiah(target.sisa_tagihan)}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor={nilaiFieldId}
                            className="block text-xs font-semibold text-[#0F172A]"
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
                            className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5B697A]">
                            <span>
                                Estimasi sistem:{' '}
                                <span className="font-mono font-medium tabular-nums">
                                    {formatRupiah(target.estimasi_kompensasi)}
                                </span>
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setData(
                                        'nilai_kompensasi',
                                        target.estimasi_kompensasi,
                                    )
                                }
                                className="min-h-[1.75rem] font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                            >
                                Gunakan Estimasi
                            </button>
                        </div>
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

                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-3.5 py-3 text-xs">
                        <div className="flex justify-between gap-4">
                            <span className="text-[#475569]">
                                Estimasi Sisa Tagihan Setelah Potong:
                            </span>
                            <span className="font-mono font-bold tabular-nums text-[#0F172A]">
                                {formatRupiah(
                                    centsToDecimalString(sisaSesudahCents),
                                )}
                            </span>
                        </div>
                    </div>

                    {kelebihanCents > 0 && (
                        <div
                            role="status"
                            className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-4 py-3 text-xs text-[#78350F]"
                        >
                            <AlertTriangle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">
                                    Kelebihan Ganti Rugi Tunai ke Pelanggan
                                </p>
                                <p className="mt-1 leading-relaxed">
                                    Nominal kompensasi melebihi sisa tagihan
                                    saat ini ({formatRupiah(target.sisa_tagihan)}
                                    ). Kelebihan sebesar{' '}
                                    <strong className="font-mono tabular-nums">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                kelebihanCents,
                                            ),
                                        )}
                                    </strong>{' '}
                                    akan dicatat sebagai{' '}
                                    <code>kelebihan_ganti_rugi</code> yang wajib
                                    dibayarkan tunai kepada pelanggan.
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor={catatanFieldId}
                            className="block text-xs font-semibold text-[#0F172A]"
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
                            className="mt-1.5 block min-h-[4.25rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#5B697A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                        />
                        {errors.keterangan_konfirmasi && (
                            <p
                                id={catatanErrorId}
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-rose-600"
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
