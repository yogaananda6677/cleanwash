import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useMemo, useState, type FormEvent } from 'react';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    ProductionStageBadge,
    SpeedTierBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    calculatePreviewTotals,
    centsToDecimalString,
    formatRupiah,
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
            id_pelanggan: pelangganOptions[0]
                ? String(pelangganOptions[0].id_pelanggan)
                : '',
            id_layanan: defaultLayanan ? String(defaultLayanan.id_layanan) : '',
            berat_atau_jumlah:
                defaultLayanan?.metode_hitung === 'JUMLAH' ? '1' : '1.00',
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
            if (nextLayanan?.metode_hitung === 'JUMLAH') {
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
            preserveScroll: true,
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
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    &larr; Daftar Transaksi
                </Link>
            }
        >
            <Head title="Penerimaan Nota Baru" />

            {hasMissingMasterData && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                    <p className="font-semibold">
                        Data master belum siap untuk penerimaan transaksi
                    </p>
                    <p className="mt-1 text-xs">
                        Pastikan minimal terdapat 1 pelanggan dan 1 jenis
                        layanan berstatus aktif sebelum menerbitkan nota baru.
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 gap-6 xl:grid-cols-12"
            >
                {/* Left Column — Cashier Form Inputs */}
                <div className="space-y-6 xl:col-span-8">
                    {/* 1. Pelanggan & Layanan */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                        <h2 className="text-sm font-bold text-slate-900">
                            1. Identitas Pelanggan &amp; Layanan
                        </h2>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="transaksi-pelanggan"
                                    className="block text-xs font-semibold text-slate-700"
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
                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                >
                                    <option value="" disabled>
                                        Pilih pelanggan...
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
                                        <PayLaterBadge
                                            allowed={
                                                selectedPelanggan.boleh_bayar_akhir
                                            }
                                        />
                                        {selectedPelanggan.boleh_bayar_akhir && (
                                            <span className="text-[11px] text-indigo-700">
                                                Pelanggan diizinkan ambil
                                                pakaian sebelum lunas (KK-06).
                                            </span>
                                        )}
                                    </div>
                                )}
                                {errorMap.id_pelanggan && (
                                    <p className="mt-1 text-xs font-medium text-rose-600">
                                        {errorMap.id_pelanggan}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="transaksi-layanan"
                                    className="block text-xs font-semibold text-slate-700"
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
                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                >
                                    <option value="" disabled>
                                        Pilih jenis layanan...
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
                                    <p className="mt-1 text-xs font-medium text-rose-600">
                                        {errorMap.id_layanan}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="transaksi-kuantitas"
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    {isQuantityByPieces
                                        ? 'Jumlah (pcs)'
                                        : 'Berat (kg)'}
                                </label>
                                <div className="relative mt-1">
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
                                        className="block w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-14 text-sm tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-500">
                                        {selectedLayanan?.satuan ?? 'kg'}
                                    </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {isQuantityByPieces
                                        ? 'Wajib bilangan bulat minimal 1 pcs untuk layanan metode JUMLAH.'
                                        : 'Dapat memasukkan berat desimal hingga 2 angka di belakang koma (mis. 2.50 kg).'}
                                </p>
                                {errorMap.berat_atau_jumlah && (
                                    <p className="mt-1 text-xs font-medium text-rose-600">
                                        {errorMap.berat_atau_jumlah}
                                    </p>
                                )}
                            </div>

                            {selectedLayanan && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-800">
                                            Tarif:{' '}
                                            {formatRupiah(
                                                selectedLayanan.harga_satuan,
                                            )}
                                            /{selectedLayanan.satuan}
                                        </span>
                                        <SpeedTierBadge
                                            tier={
                                                selectedLayanan.tingkat_kecepatan
                                            }
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-600">
                                        {selectedLayanan.perlu_setrika
                                            ? 'Layanan termasuk tahap penyetrikaan.'
                                            : 'Tanpa tahap penyetrikaan (mis. sepatu/tas).'}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {selectedLayanan.tahap_layanan.map(
                                            (tahap) => (
                                                <ProductionStageBadge
                                                    key={tahap.id_tahap}
                                                    stage={tahap.nama_tahap}
                                                    order={tahap.urutan}
                                                />
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. Rincian Detail Pakaian */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">
                                    2. Rincian Item Pakaian (DetailPakaian)
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Minimal 1 baris item untuk identifikasi saat
                                    produksi maupun laporan insiden.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddDetailRow}
                                className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                            >
                                + Tambah Item
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
                                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-600">
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
                                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                                                >
                                                    Hapus Baris
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                                            <div className="sm:col-span-5">
                                                <label
                                                    htmlFor={`detail-jenis-${index}`}
                                                    className="block text-[11px] font-semibold text-slate-700"
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
                                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
                                                    className="block text-[11px] font-semibold text-slate-700"
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
                                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
                                                    className="block text-[11px] font-semibold text-slate-700"
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
                                                    className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
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

                    {/* 3. Voucher, DP & Catatan */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                        <h2 className="text-sm font-bold text-slate-900">
                            3. Voucher, Uang Muka (DP) &amp; Catatan
                        </h2>

                        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="transaksi-voucher"
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    Kode Voucher (Opsional)
                                </label>
                                <div className="mt-1 flex gap-2">
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
                                        className="block w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm uppercase text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCheckVoucher}
                                        disabled={
                                            voucherCheck.status === 'loading'
                                        }
                                        className="shrink-0 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        {voucherCheck.status === 'loading'
                                            ? 'Mengecek...'
                                            : 'Cek Voucher'}
                                    </button>
                                </div>

                                {voucherCheck.status === 'valid' && (
                                    <div className="mt-2.5 flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                                        <div>
                                            <p className="font-semibold">
                                                Voucher{' '}
                                                <span className="font-mono">
                                                    {
                                                        voucherCheck.response
                                                            .nomor_voucher
                                                    }
                                                </span>{' '}
                                                valid!
                                            </p>
                                            <p className="mt-0.5">
                                                Potongan:{' '}
                                                <span className="font-bold">
                                                    {formatRupiah(
                                                        voucherCheck.response
                                                            .nilai,
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
                                        <button
                                            type="button"
                                            onClick={handleClearVoucher}
                                            className="shrink-0 font-semibold text-emerald-700 underline hover:text-emerald-900"
                                        >
                                            Hapus Voucher
                                        </button>
                                    </div>
                                )}

                                {voucherCheck.status === 'invalid' && (
                                    <div
                                        role="alert"
                                        className="mt-2.5 flex items-start justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900"
                                    >
                                        <div>
                                            {voucherCheck.response.reason && (
                                                <span className="mb-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                                                    {
                                                        REASON_LABELS[
                                                            voucherCheck
                                                                .response.reason
                                                        ]
                                                    }
                                                </span>
                                            )}
                                            <p className="font-medium">
                                                {voucherCheck.response.message}
                                            </p>
                                        </div>
                                        {data.nomor_voucher.trim() !== '' && (
                                            <button
                                                type="button"
                                                onClick={handleClearVoucher}
                                                className="shrink-0 font-semibold text-rose-700 underline hover:text-rose-900"
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
                                    className="block text-xs font-semibold text-slate-700"
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
                                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleQuickDp('ZERO')}
                                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                        Rp 0
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickDp('HALF')}
                                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                        50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickDp('FULL')}
                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
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
                                className="block text-xs font-semibold text-slate-700"
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {errorMap.catatan_khusus && (
                                <p className="mt-1 text-xs font-medium text-rose-600">
                                    {errorMap.catatan_khusus}
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column — Sticky Preview Summary */}
                <aside className="xl:col-span-4">
                    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                        <h2 className="text-sm font-bold text-slate-900">
                            Ringkasan Estimasi Tagihan
                        </h2>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            Pratinjau kalkulasi presisi integer. Nilai resmi dan
                            penguncian voucher atomik ditetapkan oleh server saat
                            nota diterbitkan.
                        </p>

                        <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-xs text-slate-500">
                                    Pelanggan
                                </dt>
                                <dd className="text-right text-xs font-semibold text-slate-900">
                                    {selectedPelanggan?.nama ?? '—'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-xs text-slate-500">
                                    Layanan
                                </dt>
                                <dd className="text-right text-xs font-semibold text-slate-900">
                                    {selectedLayanan
                                        ? `${selectedLayanan.nama_layanan} (${selectedLayanan.tingkat_kecepatan})`
                                        : '—'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-xs text-slate-500">
                                    Subtotal ({data.berat_atau_jumlah || 0}{' '}
                                    {selectedLayanan?.satuan ?? 'kg'})
                                </dt>
                                <dd className="font-semibold tabular-nums text-slate-900">
                                    {formatRupiah(preview.subtotalDecimal)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-xs text-slate-500">
                                    Potongan Voucher
                                </dt>
                                <dd className="font-semibold tabular-nums text-emerald-700">
                                    -{formatRupiah(preview.voucherDecimal)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                                <dt className="text-sm font-bold text-slate-900">
                                    Estimasi Total
                                </dt>
                                <dd className="text-lg font-bold tabular-nums text-slate-900">
                                    {formatRupiah(preview.totalDecimal)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-xs text-slate-500">
                                    Dibayar Awal (DP)
                                </dt>
                                <dd className="font-semibold tabular-nums text-sky-700">
                                    {formatRupiah(preview.dpDecimal)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                <dt className="text-xs font-semibold text-slate-700">
                                    Estimasi Sisa Tagihan
                                </dt>
                                <dd className="text-base font-bold tabular-nums text-amber-700">
                                    {formatRupiah(preview.sisaDecimal)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-xs text-slate-500">
                                    Estimasi Status
                                </dt>
                                <dd>
                                    <PaymentStatusBadge
                                        status={preview.previewStatus}
                                    />
                                </dd>
                            </div>
                        </dl>

                        {preview.isOverpaid && (
                            <div
                                role="alert"
                                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
                            >
                                Nominal DP melebihi estimasi total tagihan.
                                Kurangi nominal DP agar sesuai total.
                            </div>
                        )}

                        <div className="mt-6 space-y-2.5">
                            <button
                                type="submit"
                                disabled={
                                    processing ||
                                    hasMissingMasterData ||
                                    preview.isOverpaid
                                }
                                className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing
                                    ? 'Menyimpan Transaksi...'
                                    : 'Terbitkan Nota & Simpan'}
                            </button>
                            <Link
                                href="/transaksi"
                                className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
