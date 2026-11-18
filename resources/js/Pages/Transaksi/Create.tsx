import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Plus,
    ReceiptText,
    Trash2,
} from 'lucide-react';
import { Fragment, useMemo, useState, type FormEvent } from 'react';
import MetadataRow from '@/Components/MetadataRow';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    SpeedTierBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    calculatePreviewTotals,
    centsToDecimalString,
    formatRupiah,
    formatTahapProduksi,
    formatTanggal,
} from '@/lib/format';
import type {
    TransaksiCreateProps,
    VoucherValidateResponse,
} from '@/types';

interface DetailPakaianFormRow {
    jenis_pakaian: string;
    jumlah_potong: string;
    kondisi_pakaian: string;
}

interface TransaksiCreateForm {
    id_pelanggan: string;
    id_layanan: string;
    berat_atau_jumlah: string;
    nomor_voucher: string;
    nominal_dp: string;
    catatan_khusus: string;
    detail_pakaian: DetailPakaianFormRow[];
}

type VoucherCheckState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'valid'; response: VoucherValidateResponse }
    | { status: 'invalid'; response: VoucherValidateResponse };

const REASON_LABELS: Record<
    NonNullable<VoucherValidateResponse['reason']>,
    string
> = {
    NOT_FOUND: 'Tidak Ditemukan',
    EXPIRED: 'Kedaluwarsa',
    ALREADY_USED: 'Sudah Digunakan',
};

const CONTROL_INPUT_CLASS =
    'mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20';

function createEmptyDetailRow(): DetailPakaianFormRow {
    return {
        jenis_pakaian: '',
        jumlah_potong: '1',
        kondisi_pakaian: 'Baik',
    };
}

export default function TransaksiCreate({
    pelangganOptions,
    layananOptions,
}: TransaksiCreateProps) {
    const defaultLayanan = layananOptions[0] ?? null;

    const { data, setData, post, transform, processing, errors } =
        useForm<TransaksiCreateForm>({
            id_pelanggan: '',
            id_layanan: '',
            berat_atau_jumlah: '',
            nomor_voucher: '',
            nominal_dp: '0',
            catatan_khusus: '',
            detail_pakaian: [createEmptyDetailRow()],
        });

    const [voucherCheck, setVoucherCheck] = useState<VoucherCheckState>({
        status: 'idle',
    });

    const errorMap = errors as Record<string, string | undefined>;

    const selectedPelanggan = useMemo(
        () =>
            pelangganOptions.find(
                (item) => String(item.id_pelanggan) === data.id_pelanggan,
            ) ?? null,
        [pelangganOptions, data.id_pelanggan],
    );

    const selectedLayanan = useMemo(
        () =>
            layananOptions.find(
                (item) => String(item.id_layanan) === data.id_layanan,
            ) ?? null,
        [layananOptions, data.id_layanan],
    );

    const orderedLayananStages = useMemo(() => {
        if (!selectedLayanan) {
            return [];
        }
        return selectedLayanan.tahap_layanan
            .slice()
            .sort((a, b) => a.urutan - b.urutan)
            .filter(
                (tahap) =>
                    selectedLayanan.perlu_setrika ||
                    tahap.nama_tahap !== 'DISETRIKA',
            );
    }, [selectedLayanan]);

    const activeVoucherDiscount = useMemo(() => {
        if (voucherCheck.status !== 'valid') {
            return '0.00';
        }

        const checkedCode = (
            voucherCheck.response.nomor_voucher ?? ''
        ).toUpperCase();
        const typedCode = data.nomor_voucher.trim().toUpperCase();

        if (checkedCode === '' || checkedCode !== typedCode) {
            return '0.00';
        }

        return voucherCheck.response.nilai ?? '0.00';
    }, [voucherCheck, data.nomor_voucher]);

    const preview = useMemo(
        () =>
            calculatePreviewTotals({
                quantity: data.berat_atau_jumlah,
                unitPrice: selectedLayanan?.harga_satuan ?? '0.00',
                voucherDiscount: activeVoucherDiscount,
                nominalDp: data.nominal_dp,
            }),
        [
            data.berat_atau_jumlah,
            selectedLayanan,
            activeVoucherDiscount,
            data.nominal_dp,
        ],
    );

    const handleLayananChange = (nextId: string) => {
        const nextLayanan = layananOptions.find(
            (item) => String(item.id_layanan) === nextId,
        );

        setData((prev) => {
            let nextQty = prev.berat_atau_jumlah;
            if (!nextQty || Number.parseFloat(nextQty) <= 0) {
                nextQty =
                    nextLayanan?.metode_hitung === 'JUMLAH' ? '1' : '1.00';
            } else if (nextLayanan?.metode_hitung === 'JUMLAH') {
                const parsed = Number.parseFloat(prev.berat_atau_jumlah);
                nextQty =
                    Number.isFinite(parsed) && parsed >= 1
                        ? String(Math.round(parsed))
                        : '1';
            }

            return {
                ...prev,
                id_layanan: nextId,
                berat_atau_jumlah: nextQty,
            };
        });
    };

    const handleAddDetailRow = () => {
        setData('detail_pakaian', [
            ...data.detail_pakaian,
            createEmptyDetailRow(),
        ]);
    };

    const handleRemoveDetailRow = (index: number) => {
        if (data.detail_pakaian.length <= 1) {
            return;
        }
        setData(
            'detail_pakaian',
            data.detail_pakaian.filter((_, idx) => idx !== index),
        );
    };

    const handleUpdateDetailRow = (
        index: number,
        field: keyof DetailPakaianFormRow,
        value: string,
    ) => {
        setData(
            'detail_pakaian',
            data.detail_pakaian.map((row, idx) =>
                idx === index ? { ...row, [field]: value } : row,
            ),
        );
    };

    const handleCheckVoucher = async () => {
        const normalizedCode = data.nomor_voucher.trim().toUpperCase();
        if (normalizedCode === '') {
            setVoucherCheck({
                status: 'invalid',
                response: {
                    valid: false,
                    message: 'Masukkan kode voucher terlebih dahulu.',
                },
            });
            return;
        }

        setVoucherCheck({ status: 'loading' });

        try {
            const response = await window.axios.post<VoucherValidateResponse>(
                '/voucher/validate',
                { nomor_voucher: normalizedCode },
            );

            setData(
                'nomor_voucher',
                response.data.nomor_voucher ?? normalizedCode,
            );
            setVoucherCheck({ status: 'valid', response: response.data });
        } catch (error) {
            if (axios.isAxiosError<VoucherValidateResponse>(error)) {
                const payload = error.response?.data;
                setVoucherCheck({
                    status: 'invalid',
                    response: {
                        valid: false,
                        reason: payload?.reason,
                        message:
                            payload?.message ??
                            'Voucher gagal divalidasi. Periksa kode voucher.',
                    },
                });
                return;
            }

            setVoucherCheck({
                status: 'invalid',
                response: {
                    valid: false,
                    message:
                        'Terjadi gangguan koneksi saat memeriksa voucher.',
                },
            });
        }
    };

    const handleClearVoucher = () => {
        setData('nomor_voucher', '');
        setVoucherCheck({ status: 'idle' });
    };

    const handleQuickDp = (mode: 'ZERO' | 'HALF' | 'FULL') => {
        if (mode === 'ZERO') {
            setData('nominal_dp', '0');
            return;
        }

        if (mode === 'HALF') {
            setData(
                'nominal_dp',
                centsToDecimalString(Math.floor(preview.totalCents / 2)),
            );
            return;
        }

        setData('nominal_dp', centsToDecimalString(preview.totalCents));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (processing) {
            return;
        }

        transform((formData) => ({
            ...formData,
            id_pelanggan: Number.parseInt(formData.id_pelanggan, 10) || 0,
            id_layanan: Number.parseInt(formData.id_layanan, 10) || 0,
            nomor_voucher: formData.nomor_voucher.trim().toUpperCase() || null,
            nominal_dp:
                formData.nominal_dp.trim() === ''
                    ? '0'
                    : formData.nominal_dp.trim(),
            catatan_khusus: formData.catatan_khusus.trim() || null,
            detail_pakaian: formData.detail_pakaian.map((row) => ({
                jenis_pakaian: row.jenis_pakaian,
                jumlah_potong: Number.parseInt(row.jumlah_potong, 10) || 0,
                kondisi_pakaian: row.kondisi_pakaian,
            })),
        }));

        post('/transaksi', {
            preserveScroll: 'errors',
        });
    };

    const isQuantityByPieces = selectedLayanan?.metode_hitung === 'JUMLAH';
    const hasMissingMasterData =
        pelangganOptions.length === 0 || layananOptions.length === 0;

    return (
        <AppLayout
            title="Penerimaan Nota Baru"
            subtitle="Catat transaksi laundry, rincian item pakaian, validasi voucher live, dan uang muka (DP)"
            headerActions={
                <Link
                    href="/transaksi"
                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                >
                    <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Daftar Transaksi</span>
                </Link>
            }
        >
            <Head title="Penerimaan Nota Baru" />

            {hasMissingMasterData && (
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] p-4 text-sm text-[#78350F]">
                    <AlertTriangle
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]"
                        aria-hidden="true"
                    />
                    <div>
                        <p className="font-bold">
                            Data master belum siap untuk penerimaan transaksi
                        </p>
                        <p className="mt-1 text-xs">
                            Pastikan minimal terdapat 1 pelanggan dan 1 jenis
                            layanan berstatus aktif sebelum menerbitkan nota baru.
                        </p>
                    </div>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 gap-6 xl:grid-cols-12"
            >
                {/* Left Column — 3-Step Cashier Form */}
                <div className="space-y-5 xl:col-span-8">
                    {/* Step 1: Identitas Pelanggan & Layanan */}
                    <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(11,19,43,0.04)] sm:p-6">
                        <div className="flex items-center gap-2.5">
                            <span
                                aria-hidden="true"
                                className="flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-xs font-bold text-white"
                            >
                                1
                            </span>
                            <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                                Identitas Pelanggan &amp; Layanan
                            </h2>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="transaksi-pelanggan"
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    Pelanggan
                                </label>
                                <select
                                    id="transaksi-pelanggan"
                                    required
                                    value={data.id_pelanggan}
                                    onChange={(event) =>
                                        setData(
                                            'id_pelanggan',
                                            event.target.value,
                                        )
                                    }
                                    className={CONTROL_INPUT_CLASS}
                                >
                                    <option value="">
                                        -- Pilih Pelanggan --
                                    </option>
                                    {pelangganOptions.map((pelanggan) => (
                                        <option
                                            key={pelanggan.id_pelanggan}
                                            value={pelanggan.id_pelanggan}
                                        >
                                            {pelanggan.nama} —{' '}
                                            {pelanggan.no_telepon}
                                        </option>
                                    ))}
                                </select>
                                {selectedPelanggan && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-medium text-[#5B697A]">
                                            Hak bayar:
                                        </span>
                                        <PayLaterBadge
                                            allowed={
                                                selectedPelanggan.boleh_bayar_akhir
                                            }
                                            variant={
                                                selectedPelanggan.boleh_bayar_akhir
                                                    ? 'badge'
                                                    : 'text'
                                            }
                                        />
                                        {selectedPelanggan.boleh_bayar_akhir && (
                                            <span className="text-[11px] text-[#3730A3]">
                                                Diizinkan ambil sebelum lunas
                                                (KK-06).
                                            </span>
                                        )}
                                    </div>
                                )}
                                {errorMap.id_pelanggan && (
                                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                                        {errorMap.id_pelanggan}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="transaksi-layanan"
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    Jenis Layanan (Aktif)
                                </label>
                                <select
                                    id="transaksi-layanan"
                                    required
                                    value={data.id_layanan}
                                    onChange={(event) =>
                                        handleLayananChange(event.target.value)
                                    }
                                    className={CONTROL_INPUT_CLASS}
                                >
                                    <option value="">
                                        -- Pilih Jenis Layanan --
                                    </option>
                                    {layananOptions.map((layanan) => (
                                        <option
                                            key={layanan.id_layanan}
                                            value={layanan.id_layanan}
                                        >
                                            {layanan.nama_layanan} (
                                            {layanan.tingkat_kecepatan}) —{' '}
                                            {formatRupiah(layanan.harga_satuan)}
                                            /{layanan.satuan}
                                        </option>
                                    ))}
                                </select>
                                {errorMap.id_layanan && (
                                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                                        {errorMap.id_layanan}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="transaksi-kuantitas"
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    {isQuantityByPieces
                                        ? 'Jumlah (pcs)'
                                        : 'Berat (kg)'}
                                </label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="transaksi-kuantitas"
                                        type="number"
                                        required
                                        step={isQuantityByPieces ? '1' : '0.01'}
                                        min={isQuantityByPieces ? '1' : '0.01'}
                                        inputMode={
                                            isQuantityByPieces
                                                ? 'numeric'
                                                : 'decimal'
                                        }
                                        value={data.berat_atau_jumlah}
                                        onChange={(event) =>
                                            setData(
                                                'berat_atau_jumlah',
                                                event.target.value,
                                            )
                                        }
                                        placeholder={
                                            isQuantityByPieces
                                                ? 'mis. 2'
                                                : 'mis. 2.50'
                                        }
                                        className="block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white py-2 pl-3.5 pr-14 font-mono text-sm font-semibold tabular-nums text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-[#475569]">
                                        {selectedLayanan?.satuan ?? 'kg'}
                                    </span>
                                </div>
                                <p className="mt-1.5 text-[11px] text-[#5B697A]">
                                    {isQuantityByPieces
                                        ? 'Wajib bilangan bulat minimal 1 pcs untuk layanan metode JUMLAH.'
                                        : 'Dapat memasukkan berat desimal hingga 2 angka di belakang koma (mis. 2.50 kg).'}
                                </p>
                                {errorMap.berat_atau_jumlah && (
                                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                                        {errorMap.berat_atau_jumlah}
                                    </p>
                                )}
                            </div>

                            {selectedLayanan && (
                                <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-[#0F172A]">
                                            Tarif:{' '}
                                            <span className="font-mono tabular-nums">
                                                {formatRupiah(
                                                    selectedLayanan.harga_satuan,
                                                )}
                                                /{selectedLayanan.satuan}
                                            </span>
                                        </span>
                                        <SpeedTierBadge
                                            tier={
                                                selectedLayanan.tingkat_kecepatan
                                            }
                                            variant="text"
                                        />
                                    </div>
                                    <MetadataRow
                                        className="mt-1.5"
                                        items={[
                                            selectedLayanan.metode_hitung,
                                            selectedLayanan.perlu_setrika
                                                ? 'Perlu Setrika'
                                                : 'Tanpa Setrika',
                                        ]}
                                    />
                                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-[#5B697A]">
                                        Alur Tahap Produksi
                                    </p>
                                    <ol className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#0F172A]">
                                        {orderedLayananStages.map(
                                            (tahap, idx) => (
                                                <Fragment key={tahap.id_tahap}>
                                                    {idx > 0 && (
                                                        <li aria-hidden="true">
                                                            <ArrowRight className="h-3 w-3 text-[#7C8C9D]" />
                                                        </li>
                                                    )}
                                                    <li>
                                                        {tahap.urutan}.{' '}
                                                        {formatTahapProduksi(
                                                            tahap.nama_tahap,
                                                        )}
                                                    </li>
                                                </Fragment>
                                            ),
                                        )}
                                    </ol>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Step 2: Rincian Item Pakaian */}
                    <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                                <span
                                    aria-hidden="true"
                                    className="mt-0.5 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-xs font-bold text-white"
                                >
                                    2
                                </span>
                                <div>
                                    <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                                        Rincian Item Pakaian (DetailPakaian)
                                    </h2>
                                    <p className="mt-0.5 text-xs text-[#5B697A]">
                                        Minimal 1 baris item untuk identifikasi
                                        saat produksi maupun laporan insiden.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddDetailRow}
                                className="inline-flex min-h-[2.375rem] items-center gap-1.5 rounded-xl border border-blue-200 bg-[#EFF6FF] px-3.5 py-2 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                            >
                                <Plus
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    <span className="sr-only">+ </span>Tambah
                                    Item
                                </span>
                            </button>
                        </div>

                        {errorMap.detail_pakaian && (
                            <p className="mt-3 text-xs font-medium text-rose-600">
                                {errorMap.detail_pakaian}
                            </p>
                        )}

                        <div className="mt-4 space-y-3">
                            {data.detail_pakaian.map((row, index) => {
                                const jenisErr =
                                    errorMap[
                                        `detail_pakaian.${index}.jenis_pakaian`
                                    ];
                                const potongErr =
                                    errorMap[
                                        `detail_pakaian.${index}.jumlah_potong`
                                    ];
                                const kondisiErr =
                                    errorMap[
                                        `detail_pakaian.${index}.kondisi_pakaian`
                                    ];

                                return (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 sm:p-4"
                                    >
                                        <div className="mb-2.5 flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#0F172A]">
                                                Item #{index + 1}
                                            </span>
                                            {data.detail_pakaian.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveDetailRow(
                                                            index,
                                                        )
                                                    }
                                                    className="inline-flex min-h-[2rem] items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#9F1239] transition hover:bg-[#FFF1F2]"
                                                >
                                                    <Trash2
                                                        className="h-3.5 w-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Hapus Baris</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                                            <div className="sm:col-span-5">
                                                <label
                                                    htmlFor={`detail-jenis-${index}`}
                                                    className="block text-[11px] font-semibold text-[#475569]"
                                                >
                                                    Jenis Pakaian / Barang
                                                </label>
                                                <input
                                                    id={`detail-jenis-${index}`}
                                                    type="text"
                                                    required
                                                    maxLength={100}
                                                    value={row.jenis_pakaian}
                                                    onChange={(event) =>
                                                        handleUpdateDetailRow(
                                                            index,
                                                            'jenis_pakaian',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="mis. Kemeja Putih / Sepatu Canvas"
                                                    className={
                                                        CONTROL_INPUT_CLASS
                                                    }
                                                />
                                                {jenisErr && (
                                                    <p className="mt-1 text-xs font-medium text-rose-600">
                                                        {jenisErr}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label
                                                    htmlFor={`detail-potong-${index}`}
                                                    className="block text-[11px] font-semibold text-[#475569]"
                                                >
                                                    Jml Potong
                                                </label>
                                                <input
                                                    id={`detail-potong-${index}`}
                                                    type="number"
                                                    required
                                                    min="1"
                                                    max="10000"
                                                    step="1"
                                                    value={row.jumlah_potong}
                                                    onChange={(event) =>
                                                        handleUpdateDetailRow(
                                                            index,
                                                            'jumlah_potong',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3 py-2 font-mono text-sm tabular-nums text-[#0F172A] shadow-xs transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                                                />
                                                {potongErr && (
                                                    <p className="mt-1 text-xs font-medium text-rose-600">
                                                        {potongErr}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-5">
                                                <label
                                                    htmlFor={`detail-kondisi-${index}`}
                                                    className="block text-[11px] font-semibold text-[#475569]"
                                                >
                                                    Kondisi Awal
                                                </label>
                                                <input
                                                    id={`detail-kondisi-${index}`}
                                                    type="text"
                                                    required
                                                    maxLength={255}
                                                    value={row.kondisi_pakaian}
                                                    onChange={(event) =>
                                                        handleUpdateDetailRow(
                                                            index,
                                                            'kondisi_pakaian',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="mis. Baik / Noda ringan di kerah"
                                                    className={
                                                        CONTROL_INPUT_CLASS
                                                    }
                                                />
                                                {kondisiErr && (
                                                    <p className="mt-1 text-xs font-medium text-rose-600">
                                                        {kondisiErr}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Step 3: Voucher, DP & Catatan */}
                    <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(11,19,43,0.04)] sm:p-6">
                        <div className="flex items-center gap-2.5">
                            <span
                                aria-hidden="true"
                                className="flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-xs font-bold text-white"
                            >
                                3
                            </span>
                            <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                                Voucher, Uang Muka (DP) &amp; Catatan
                            </h2>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="transaksi-voucher"
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    Kode Voucher (Opsional)
                                </label>
                                <div className="mt-1.5 flex gap-2">
                                    <input
                                        id="transaksi-voucher"
                                        type="text"
                                        maxLength={50}
                                        value={data.nomor_voucher}
                                        onChange={(event) => {
                                            setData(
                                                'nomor_voucher',
                                                event.target.value.toUpperCase(),
                                            );
                                            if (
                                                voucherCheck.status !== 'idle'
                                            ) {
                                                setVoucherCheck({
                                                    status: 'idle',
                                                });
                                            }
                                        }}
                                        placeholder="mis. HEMAT10K"
                                        className="block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm uppercase text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCheckVoucher}
                                        disabled={
                                            voucherCheck.status === 'loading'
                                        }
                                        className="inline-flex min-h-[2.625rem] shrink-0 items-center justify-center rounded-xl bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1E293B] disabled:opacity-60"
                                    >
                                        {voucherCheck.status === 'loading'
                                            ? 'Mengecek...'
                                            : 'Cek Voucher'}
                                    </button>
                                </div>

                                {voucherCheck.status === 'valid' && (
                                    <div className="mt-2.5 flex items-start justify-between gap-2 rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] p-3 text-xs text-[#065F46]">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2
                                                className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <p className="font-semibold">
                                                    Voucher{' '}
                                                    <span className="font-mono">
                                                        {
                                                            voucherCheck
                                                                .response
                                                                .nomor_voucher
                                                        }
                                                    </span>{' '}
                                                    valid!
                                                </p>
                                                <p className="mt-0.5">
                                                    Potongan:{' '}
                                                    <span className="font-mono font-bold tabular-nums">
                                                        {formatRupiah(
                                                            voucherCheck
                                                                .response.nilai,
                                                        )}
                                                    </span>{' '}
                                                    (Berlaku s.d.{' '}
                                                    {formatTanggal(
                                                        voucherCheck.response
                                                            .masa_berlaku,
                                                    )}
                                                    )
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClearVoucher}
                                            className="min-h-[1.75rem] shrink-0 font-semibold text-[#065F46] underline hover:text-[#047857]"
                                        >
                                            Hapus Voucher
                                        </button>
                                    </div>
                                )}

                                {voucherCheck.status === 'invalid' && (
                                    <div
                                        role="alert"
                                        className="mt-2.5 flex items-start justify-between gap-2 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] p-3 text-xs text-[#9F1239]"
                                    >
                                        <div className="flex items-start gap-2">
                                            <AlertCircle
                                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                                aria-hidden="true"
                                            />
                                            <div>
                                                {voucherCheck.response
                                                    .reason && (
                                                    <span className="mb-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-[#9F1239]">
                                                        {
                                                            REASON_LABELS[
                                                                voucherCheck
                                                                    .response
                                                                    .reason
                                                            ]
                                                        }
                                                    </span>
                                                )}
                                                <p className="font-medium">
                                                    {
                                                        voucherCheck.response
                                                            .message
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        {data.nomor_voucher.trim() !== '' && (
                                            <button
                                                type="button"
                                                onClick={handleClearVoucher}
                                                className="min-h-[1.75rem] shrink-0 font-semibold text-[#9F1239] underline hover:text-[#BE123C]"
                                            >
                                                Kosongkan
                                            </button>
                                        )}
                                    </div>
                                )}

                                {errorMap.nomor_voucher && (
                                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                                        {errorMap.nomor_voucher}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="transaksi-dp"
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    Nominal Uang Muka / Pembayaran Awal (Rp)
                                </label>
                                <input
                                    id="transaksi-dp"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.nominal_dp}
                                    onChange={(event) =>
                                        setData(
                                            'nominal_dp',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="0"
                                    className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-[#0F172A] shadow-xs transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleQuickDp('ZERO')}
                                        className="min-h-[2.125rem] rounded-lg border border-[#7C8C9D] bg-white px-3 py-1 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                                    >
                                        Rp 0
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickDp('HALF')}
                                        className="min-h-[2.125rem] rounded-lg border border-[#7C8C9D] bg-white px-3 py-1 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickDp('FULL')}
                                        className="min-h-[2.125rem] rounded-lg border border-blue-200 bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
                                    >
                                        Lunas
                                    </button>
                                </div>
                                {errorMap.nominal_dp && (
                                    <p className="mt-1.5 text-xs font-medium text-rose-600">
                                        {errorMap.nominal_dp}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label
                                htmlFor="transaksi-catatan"
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Catatan Khusus (Opsional)
                            </label>
                            <textarea
                                id="transaksi-catatan"
                                rows={2}
                                maxLength={1000}
                                value={data.catatan_khusus}
                                onChange={(event) =>
                                    setData(
                                        'catatan_khusus',
                                        event.target.value,
                                    )
                                }
                                placeholder="mis. Pisahkan pakaian putih, jangan pakai pemutih..."
                                className="mt-1.5 block min-h-[4.5rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                            />
                            {errorMap.catatan_khusus && (
                                <p className="mt-1.5 text-xs font-medium text-rose-600">
                                    {errorMap.catatan_khusus}
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column — Sticky Receipt Calculator */}
                <aside className="xl:col-span-4">
                    <div className="rounded-2xl border border-[#D8E2E6] bg-[#F8FAFC] p-5 shadow-[0_1px_2px_rgba(11,19,43,0.04)] sm:p-6 xl:sticky xl:top-24">
                        <div className="flex items-center gap-2">
                            <ReceiptText
                                className="h-4 w-4 shrink-0 text-[#2563EB]"
                                aria-hidden="true"
                            />
                            <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                                Ringkasan Estimasi Tagihan
                            </h2>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#5B697A]">
                            Pratinjau kalkulasi presisi integer. Nilai resmi dan
                            penguncian voucher atomik ditetapkan oleh server saat
                            nota diterbitkan.
                        </p>

                        {!data.id_pelanggan || !data.id_layanan ? (
                            <div className="mt-5 rounded-2xl border border-dashed border-[#B8C8D0] bg-white p-6 text-center text-xs text-[#5B697A]">
                                <ReceiptText
                                    className="mx-auto h-8 w-8 text-[#9FB7C0] mb-2"
                                    aria-hidden="true"
                                />
                                <p className="font-bold text-sm text-[#0F172A]">
                                    Belum Ada Transaksi Dipilih
                                </p>
                                <p className="mt-1 leading-relaxed">
                                    Silakan pilih pelanggan dan jenis layanan pada formulir untuk melihat rincian estimasi tagihan dan menerbitkan nota.
                                </p>
                            </div>
                        ) : (
                            <dl className="mt-5 space-y-3 border-t border-[#D8E2E6] pt-4 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-xs text-[#5B697A]">
                                        Pelanggan
                                    </dt>
                                    <dd className="text-right text-xs font-semibold text-[#0F172A]">
                                        {selectedPelanggan?.nama ?? '—'}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-xs text-[#5B697A]">
                                        Layanan
                                    </dt>
                                    <dd className="text-right text-xs font-semibold text-[#0F172A]">
                                        {selectedLayanan
                                            ? `${selectedLayanan.nama_layanan} (${selectedLayanan.tingkat_kecepatan})`
                                            : '—'}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-xs text-[#5B697A]">
                                        Subtotal ({data.berat_atau_jumlah || 0}{' '}
                                        {selectedLayanan?.satuan ?? 'kg'})
                                    </dt>
                                    <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                        {formatRupiah(preview.subtotalDecimal)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-xs text-[#5B697A]">
                                        Potongan Voucher
                                    </dt>
                                    <dd className="font-mono font-semibold tabular-nums text-[#065F46]">
                                        -{formatRupiah(preview.voucherDecimal)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2 border-t border-[#D8E2E6] pt-3">
                                    <dt className="text-sm font-bold text-[#0F172A]">
                                        Estimasi Total
                                    </dt>
                                    <dd className="font-mono text-lg font-bold tabular-nums text-[#0F172A]">
                                        {formatRupiah(preview.totalDecimal)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-xs text-[#5B697A]">
                                        Dibayar Awal (DP)
                                    </dt>
                                    <dd className="font-mono font-semibold tabular-nums text-[#2563EB]">
                                        {formatRupiah(preview.dpDecimal)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2 border-t border-[#D8E2E6] pt-3">
                                    <dt className="text-xs font-semibold text-[#0F172A]">
                                        Estimasi Sisa Tagihan
                                    </dt>
                                    <dd
                                        className={`font-mono text-base font-bold tabular-nums ${
                                            preview.sisaCents > 0
                                                ? 'text-[#78350F]'
                                                : 'text-[#065F46]'
                                        }`}
                                    >
                                        {formatRupiah(preview.sisaDecimal)}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-xs text-[#5B697A]">
                                        Estimasi Status
                                    </dt>
                                    <dd>
                                        <PaymentStatusBadge
                                            status={preview.previewStatus}
                                        />
                                    </dd>
                                </div>
                            </dl>
                        )}

                        {preview.isOverpaid && (
                            <div
                                role="alert"
                                className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] p-3 text-xs font-medium text-[#9F1239]"
                            >
                                <AlertCircle
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                    aria-hidden="true"
                                />
                                <p>
                                    Nominal DP melebihi estimasi total tagihan.
                                    Kurangi nominal DP agar sesuai total.
                                </p>
                            </div>
                        )}

                        <div className="mt-6 space-y-2.5">
                            <button
                                type="submit"
                                disabled={
                                    processing ||
                                    hasMissingMasterData ||
                                    preview.isOverpaid ||
                                    !data.id_pelanggan ||
                                    !data.id_layanan ||
                                    !data.berat_atau_jumlah ||
                                    Number.parseFloat(data.berat_atau_jumlah) <= 0
                                }
                                className="flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing
                                    ? 'Menyimpan Transaksi...'
                                    : 'Terbitkan Nota & Simpan'}
                            </button>
                            <Link
                                href="/transaksi"
                                className="flex min-h-[2.5rem] w-full items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                            >
                                Batal
                            </Link>
                        </div>
                    </div>
                </aside>
            </form>
        </AppLayout>
    );
}
