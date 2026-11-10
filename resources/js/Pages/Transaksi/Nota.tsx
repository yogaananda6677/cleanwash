import { Head, Link } from '@inertiajs/react';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    PaymentTypeBadge,
    ProductionStageBadge,
    SpeedTierBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import {
    formatRupiah,
    formatTanggal,
    parseDecimalToCents,
} from '@/lib/format';
import type { TransaksiNotaProps } from '@/types';

export default function TransaksiNota({ transaksi }: TransaksiNotaProps) {
    const totalPotong = transaksi.detail_pakaian.reduce(
        (acc, item) => acc + item.jumlah_potong,
        0,
    );

    const latestStage =
        transaksi.riwayat_status_produksi[
            transaksi.riwayat_status_produksi.length - 1
        ] ?? null;

    const completedStages = new Set(
        transaksi.riwayat_status_produksi.map((item) => item.tahap_status),
    );

    const voucherApplied =
        transaksi.voucher !== null ||
        parseDecimalToCents(transaksi.nilai_voucher_snapshot) > 0;
    const hasKompensasi =
        parseDecimalToCents(transaksi.total_kompensasi) > 0;
    const hasBiayaPembatalan =
        parseDecimalToCents(transaksi.biaya_pembatalan) > 0;
    const hasSisaTagihan =
        parseDecimalToCents(transaksi.sisa_tagihan) > 0;

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 print:min-h-0 print:bg-white print:p-0">
            <Head title={`Cetak Nota ${transaksi.nomor_nota}`} />

            <div className="mx-auto max-w-4xl print:max-w-none">
                {/* Baris aksi navigasi & cetak (disembunyikan saat print) */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs print:hidden">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={`/transaksi/${transaksi.nomor_nota}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            &larr; Kembali ke Detail
                        </Link>
                        <Link
                            href="/transaksi"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Daftar Transaksi
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="hidden text-xs text-slate-500 sm:inline">
                            Pratinjau cetak siap kertas A4
                        </span>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.75}
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
                                />
                            </svg>
                            Cetak Nota
                        </button>
                    </div>
                </div>

                {/* Lembar Nota Resmi CleanWash */}
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
                    {/* Header Brand & Nomor Nota */}
                    <header className="flex flex-col justify-between gap-4 border-b-2 border-slate-900 pb-5 sm:flex-row sm:items-start print:flex-row print:items-start">
                        <div className="flex items-start gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-lg font-extrabold tracking-tight text-white">
                                CW
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-sky-700">
                                    Nota Transaksi Resmi
                                </p>
                                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                                    CleanWash Laundry
                                </h1>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Sistem Manajemen Operasional Laundry &bull;
                                    Waktu Referensi WIB (Asia/Jakarta)
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:text-right print:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Nomor Nota
                            </p>
                            <p className="mt-0.5 font-mono text-lg font-extrabold text-slate-900">
                                {transaksi.nomor_nota}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:justify-end print:justify-end">
                                <PaymentStatusBadge
                                    status={transaksi.status_pembayaran}
                                />
                                <TransactionStatusBadge
                                    status={transaksi.status_transaksi}
                                />
                            </div>
                        </div>
                    </header>

                    {/* Identitas Pelanggan & Metadata Penerimaan */}
                    <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 p-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Identitas Pelanggan
                            </h2>
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">Nama</dt>
                                    <dd className="text-right font-bold text-slate-900">
                                        {transaksi.pelanggan.nama}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">
                                        No. Telepon
                                    </dt>
                                    <dd className="text-right font-mono text-slate-800">
                                        {transaksi.pelanggan.no_telepon}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="shrink-0 text-slate-500">
                                        Alamat
                                    </dt>
                                    <dd className="text-right text-slate-700">
                                        {transaksi.pelanggan.alamat}
                                    </dd>
                                </div>
                                {transaksi.pelanggan.boleh_bayar_akhir && (
                                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                                        <dt className="text-slate-500">
                                            Penanda Pelanggan
                                        </dt>
                                        <dd>
                                            <PayLaterBadge allowed />
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Informasi Penerimaan &amp; Status
                            </h2>
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">
                                        Tanggal Penerimaan
                                    </dt>
                                    <dd className="text-right font-semibold text-slate-900">
                                        {formatTanggal(
                                            transaksi.tanggal_penerimaan,
                                            { withTime: true },
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">
                                        Petugas Penerima
                                    </dt>
                                    <dd className="text-right font-semibold text-slate-900">
                                        {transaksi.petugas.nama_petugas}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-500">
                                        Status Pembayaran
                                    </dt>
                                    <dd>
                                        <PaymentStatusBadge
                                            status={transaksi.status_pembayaran}
                                        />
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-slate-500">
                                        Tahap Produksi Terkini
                                    </dt>
                                    <dd className="text-right">
                                        {latestStage ? (
                                            <div className="inline-flex flex-col items-end gap-0.5">
                                                <ProductionStageBadge
                                                    stage={
                                                        latestStage.tahap_status
                                                    }
                                                />
                                                <span className="text-[10px] text-slate-500">
                                                    {formatTanggal(
                                                        latestStage.waktu_update,
                                                        { withTime: true },
                                                    )}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-500">
                                                —
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                {transaksi.diambil_pada && (
                                    <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
                                        <dt className="text-slate-500">
                                            Waktu Serah Terima
                                        </dt>
                                        <dd className="text-right text-slate-700">
                                            {formatTanggal(
                                                transaksi.diambil_pada,
                                                { withTime: true },
                                            )}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </section>

                    {/* Rincian Layanan */}
                    <section className="mt-5 rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Rincian Layanan
                            </h2>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {transaksi.layanan.tahap_layanan.map(
                                    (tahap) => {
                                        const done = completedStages.has(
                                            tahap.nama_tahap,
                                        );
                                        return (
                                            <span
                                                key={tahap.id_tahap}
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                                                    done
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                        : 'bg-slate-50 text-slate-500 ring-slate-200'
                                                }`}
                                            >
                                                {tahap.urutan}.{' '}
                                                {tahap.nama_tahap}
                                            </span>
                                        );
                                    },
                                )}
                            </div>
                        </div>

                        <div className="mt-3 overflow-x-auto">
                            <table className="min-w-full text-left text-xs">
                                <thead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="py-1.5 pr-4">
                                            Nama Layanan
                                        </th>
                                        <th className="px-4 py-1.5">
                                            Kecepatan
                                        </th>
                                        <th className="px-4 py-1.5 text-right">
                                            Volume / Kuantitas
                                        </th>
                                        <th className="px-4 py-1.5 text-right">
                                            Tarif Satuan (Snapshot)
                                        </th>
                                        <th className="py-1.5 pl-4 text-right">
                                            Subtotal Layanan
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="border-t border-slate-100">
                                    <tr>
                                        <td className="py-2.5 pr-4">
                                            <p className="font-bold text-slate-900">
                                                {transaksi.layanan.nama_layanan}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Metode hitung:{' '}
                                                {
                                                    transaksi.layanan
                                                        .metode_hitung
                                                }{' '}
                                                &bull;{' '}
                                                {transaksi.layanan.perlu_setrika
                                                    ? 'Dengan setrika'
                                                    : 'Tanpa setrika'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <SpeedTierBadge
                                                tier={
                                                    transaksi.layanan
                                                        .tingkat_kecepatan
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                                            {transaksi.berat_atau_jumlah}{' '}
                                            {transaksi.layanan.satuan}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                                            {formatRupiah(
                                                transaksi.harga_satuan_snapshot,
                                            )}
                                            /{transaksi.layanan.satuan}
                                        </td>
                                        <td className="py-2.5 pl-4 text-right font-bold tabular-nums text-slate-900">
                                            {formatRupiah(
                                                transaksi.subtotal_layanan,
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Tabel DetailPakaian */}
                    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Rincian Item Pakaian (
                                {transaksi.detail_pakaian.length} baris)
                            </h2>
                            <span className="text-xs font-bold text-slate-700">
                                Total: {totalPotong} potong
                            </span>
                        </div>
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="w-12 px-4 py-2">No.</th>
                                    <th className="px-4 py-2">Jenis Pakaian</th>
                                    <th className="px-4 py-2 text-right">
                                        Jumlah Potong
                                    </th>
                                    <th className="px-4 py-2">
                                        Kondisi Pakaian
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transaksi.detail_pakaian.map((detail, idx) => (
                                    <tr key={detail.id_detail}>
                                        <td className="px-4 py-2.5 text-slate-500">
                                            {idx + 1}
                                        </td>
                                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                                            {detail.jenis_pakaian}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-800">
                                            {detail.jumlah_potong} pcs
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-700">
                                            {detail.kondisi_pakaian}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* Catatan Khusus (bila ada) */}
                    {transaksi.catatan_khusus !== null &&
                        transaksi.catatan_khusus.trim() !== '' && (
                            <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs">
                                <h2 className="font-bold uppercase tracking-wider text-amber-900">
                                    Catatan Khusus
                                </h2>
                                <p className="mt-1 whitespace-pre-line text-amber-950">
                                    {transaksi.catatan_khusus}
                                </p>
                            </section>
                        )}

                    {/* Riwayat Pembayaran / DP + Ringkasan Finansial */}
                    <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-12 print:grid-cols-12">
                        <div className="overflow-hidden rounded-xl border border-slate-200 md:col-span-7 print:col-span-7">
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                    Riwayat Pembayaran / DP
                                </h2>
                            </div>
                            {transaksi.pembayaran.length === 0 ? (
                                <div className="p-4 text-xs text-slate-500">
                                    Belum ada pembayaran tercatat (status{' '}
                                    <span className="font-semibold text-slate-700">
                                        {transaksi.status_pembayaran}
                                    </span>
                                    ).
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                    <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2">
                                                Tanggal
                                            </th>
                                            <th className="px-4 py-2">Jenis</th>
                                            <th className="px-4 py-2">
                                                Petugas
                                            </th>
                                            <th className="px-4 py-2 text-right">
                                                Nominal
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transaksi.pembayaran.map((bayar) => (
                                            <tr key={bayar.id_pembayaran}>
                                                <td className="whitespace-nowrap px-4 py-2 text-slate-700">
                                                    {formatTanggal(
                                                        bayar.tanggal_bayar,
                                                        { withTime: true },
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-2">
                                                    <PaymentTypeBadge
                                                        type={bayar.jenis_bayar}
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-slate-600">
                                                    {bayar.petugas
                                                        ?.nama_petugas ?? '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums text-slate-900">
                                                    {formatRupiah(
                                                        bayar.nominal_bayar,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-5 print:col-span-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Ringkasan Finansial
                            </h2>
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-600">
                                        Subtotal Layanan
                                    </dt>
                                    <dd className="font-semibold tabular-nums text-slate-900">
                                        {formatRupiah(
                                            transaksi.subtotal_layanan,
                                        )}
                                    </dd>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-slate-600">
                                        <span>Potongan Voucher</span>
                                        {voucherApplied &&
                                            transaksi.voucher && (
                                                <span className="ml-1.5 inline-block rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                                    {
                                                        transaksi.voucher
                                                            .nomor_voucher
                                                    }
                                                </span>
                                            )}
                                    </dt>
                                    <dd
                                        className={`font-semibold tabular-nums ${
                                            voucherApplied
                                                ? 'text-emerald-700'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        {voucherApplied
                                            ? `-${formatRupiah(transaksi.nilai_voucher_snapshot)}`
                                            : formatRupiah('0.00')}
                                    </dd>
                                </div>

                                {hasKompensasi && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-slate-600">
                                            Potongan Kompensasi
                                        </dt>
                                        <dd className="font-semibold tabular-nums text-emerald-700">
                                            -
                                            {formatRupiah(
                                                transaksi.total_kompensasi,
                                            )}
                                        </dd>
                                    </div>
                                )}

                                {hasBiayaPembatalan && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-slate-600">
                                            Biaya Pembatalan
                                        </dt>
                                        <dd className="font-semibold tabular-nums text-rose-700">
                                            +
                                            {formatRupiah(
                                                transaksi.biaya_pembatalan,
                                            )}
                                        </dd>
                                    </div>
                                )}

                                <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-sm">
                                    <dt className="font-bold text-slate-900">
                                        Total Harga
                                    </dt>
                                    <dd className="font-extrabold tabular-nums text-slate-900">
                                        {formatRupiah(transaksi.total_harga)}
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3">
                                    <dt className="text-slate-600">
                                        Total Dibayar
                                    </dt>
                                    <dd className="font-semibold tabular-nums text-sky-700">
                                        {formatRupiah(transaksi.total_dibayar)}
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-sm">
                                    <dt className="font-bold text-slate-900">
                                        Sisa Tagihan
                                    </dt>
                                    <dd
                                        className={`font-extrabold tabular-nums ${
                                            hasSisaTagihan
                                                ? 'text-amber-700'
                                                : 'text-emerald-700'
                                        }`}
                                    >
                                        {formatRupiah(transaksi.sisa_tagihan)}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </section>

                    {/* Footer Nota Resmi & Tanda Tangan */}
                    <footer className="mt-6 border-t border-dashed border-slate-300 pt-4 text-[11px] text-slate-500">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row print:flex-row">
                            <div className="max-w-md space-y-1">
                                <p className="font-semibold text-slate-700">
                                    Ketentuan Layanan CleanWash:
                                </p>
                                <p>
                                    1. Harap tunjukkan Nomor Nota ini saat
                                    pengambilan atau verifikasi pengantaran.
                                </p>
                                <p>
                                    2. Periksa jumlah potong dan kondisi
                                    pakaian bersama petugas saat serah terima.
                                </p>
                                {transaksi.pelanggan.boleh_bayar_akhir && (
                                    <p className="font-medium text-indigo-700">
                                        3. Hak Bayar Akhir aktif untuk pelanggan
                                        ini; sisa piutang dicatat resmi pada
                                        nota.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-8 text-center">
                                <div>
                                    <p className="text-slate-500">
                                        Petugas Penerima
                                    </p>
                                    <div className="mt-10 border-t border-slate-300 pt-1 font-semibold text-slate-800">
                                        {transaksi.petugas.nama_petugas}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-slate-500">Pelanggan</p>
                                    <div className="mt-10 border-t border-slate-300 pt-1 font-semibold text-slate-800">
                                        {transaksi.pelanggan.nama}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </footer>
                </article>
            </div>
        </div>
    );
}
