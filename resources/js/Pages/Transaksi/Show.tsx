import { Head, Link } from '@inertiajs/react';
import {
    PayLaterBadge,
    PaymentStatusBadge,
    PaymentTypeBadge,
    ProductionStageBadge,
    SpeedTierBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    formatRupiah,
    formatTanggal,
    parseDecimalToCents,
} from '@/lib/format';
import type { TransaksiShowProps } from '@/types';

export default function TransaksiShow({ transaksi }: TransaksiShowProps) {
    const totalPotong = transaksi.detail_pakaian.reduce(
        (acc, item) => acc + item.jumlah_potong,
        0,
    );

    const hasSnapshotTariffDifference =
        parseDecimalToCents(transaksi.harga_satuan_snapshot) !==
        parseDecimalToCents(transaksi.layanan.harga_satuan);

    const completedStages = new Set(
        transaksi.riwayat_status_produksi.map((item) => item.tahap_status),
    );

    return (
        <AppLayout
            title={`Detail Nota ${transaksi.nomor_nota}`}
            subtitle={`Diterima ${formatTanggal(transaksi.tanggal_penerimaan, { withTime: true })} oleh ${transaksi.petugas.nama_petugas}`}
            headerActions={
                <div className="flex items-center gap-2">
                    <Link
                        href="/transaksi"
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        &larr; Kembali
                    </Link>
                    <Link
                        href={`/transaksi/${transaksi.nomor_nota}/nota`}
                        className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                    >
                        Cetak Nota
                    </Link>
                </div>
            }
        >
            <Head title={`Nota ${transaksi.nomor_nota}`} />

            {/* Top Status Strip */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Nomor Nota Resmi
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-xl font-bold text-slate-900">
                                {transaksi.nomor_nota}
                            </span>
                            <TransactionStatusBadge
                                status={transaksi.status_transaksi}
                            />
                            <PaymentStatusBadge
                                status={transaksi.status_pembayaran}
                            />
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-xs text-slate-500">Sisa Tagihan</p>
                        <p className="text-2xl font-bold tabular-nums text-slate-900">
                            {formatRupiah(transaksi.sisa_tagihan)}
                        </p>
                    </div>
                </div>

                {hasSnapshotTariffDifference && (
                    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
                        <span className="font-semibold">
                            Imutabilitas Tarif Snapshot (KK-09):
                        </span>{' '}
                        Tarif master layanan saat ini{' '}
                        <span className="font-semibold">
                            {formatRupiah(transaksi.layanan.harga_satuan)}/
                            {transaksi.layanan.satuan}
                        </span>
                        , namun transaksi ini tetap dikunci menggunakan tarif
                        saat nota diterbitkan sebesar{' '}
                        <span className="font-semibold">
                            {formatRupiah(transaksi.harga_satuan_snapshot)}/
                            {transaksi.layanan.satuan}
                        </span>
                        .
                    </div>
                )}
            </section>

            {/* Info Grid: Pelanggan + Rincian Biaya */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
                    <h2 className="text-sm font-bold text-slate-900">
                        Identitas Pelanggan &amp; Penerimaan
                    </h2>
                    <dl className="mt-4 space-y-3 text-xs">
                        <div className="flex justify-between gap-4">
                            <dt className="text-slate-500">Nama Pelanggan</dt>
                            <dd className="text-right font-semibold text-slate-900">
                                {transaksi.pelanggan.nama}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-slate-500">No. Telepon</dt>
                            <dd className="text-right font-mono text-slate-800">
                                {transaksi.pelanggan.no_telepon}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-slate-500">Alamat</dt>
                            <dd className="max-w-xs text-right text-slate-700">
                                {transaksi.pelanggan.alamat}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-slate-500">Hak Bayar Akhir</dt>
                            <dd>
                                <PayLaterBadge
                                    allowed={
                                        transaksi.pelanggan.boleh_bayar_akhir
                                    }
                                />
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                            <dt className="text-slate-500">Petugas Penerima</dt>
                            <dd className="text-right font-semibold text-slate-900">
                                {transaksi.petugas.nama_petugas}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-slate-500">
                                Tanggal Penerimaan
                            </dt>
                            <dd className="text-right text-slate-700">
                                {formatTanggal(transaksi.tanggal_penerimaan, {
                                    withTime: true,
                                })}
                            </dd>
                        </div>
                        {transaksi.diambil_pada && (
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">Diambil Pada</dt>
                                <dd className="text-right text-slate-700">
                                    {formatTanggal(transaksi.diambil_pada, {
                                        withTime: true,
                                    })}
                                </dd>
                            </div>
                        )}
                        <div className="border-t border-slate-100 pt-3">
                            <dt className="text-slate-500">Catatan Khusus</dt>
                            <dd className="mt-1 rounded-xl bg-slate-50 p-3 text-slate-700">
                                {transaksi.catatan_khusus ?? 'Tidak ada catatan.'}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-slate-900">
                            Layanan &amp; Ringkasan Tagihan
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">
                                {transaksi.layanan.nama_layanan}
                            </span>
                            <SpeedTierBadge
                                tier={transaksi.layanan.tingkat_kecepatan}
                            />
                        </div>
                    </div>

                    <dl className="mt-4 space-y-2.5 text-sm">
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-slate-500">
                                Kuantitas ({transaksi.layanan.metode_hitung})
                            </dt>
                            <dd className="font-semibold tabular-nums text-slate-900">
                                {transaksi.berat_atau_jumlah}{' '}
                                {transaksi.layanan.satuan}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-slate-500">
                                Tarif Snapshot Nota
                            </dt>
                            <dd className="font-semibold tabular-nums text-slate-900">
                                {formatRupiah(transaksi.harga_satuan_snapshot)}/
                                {transaksi.layanan.satuan}
                                {hasSnapshotTariffDifference && (
                                    <span className="ml-2 text-[11px] font-normal text-slate-500 line-through">
                                        Master:{' '}
                                        {formatRupiah(
                                            transaksi.layanan.harga_satuan,
                                        )}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-slate-100 pt-2.5 text-xs">
                            <dt className="text-slate-500">Subtotal Layanan</dt>
                            <dd className="font-semibold tabular-nums text-slate-900">
                                {formatRupiah(transaksi.subtotal_layanan)}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-slate-500">
                                Potongan Voucher{' '}
                                {transaksi.voucher && (
                                    <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700">
                                        {transaksi.voucher.nomor_voucher}
                                    </span>
                                )}
                            </dt>
                            <dd className="font-semibold tabular-nums text-emerald-700">
                                -{formatRupiah(transaksi.nilai_voucher_snapshot)}
                            </dd>
                        </div>
                        {parseDecimalToCents(transaksi.total_kompensasi) > 0 && (
                            <div className="flex justify-between gap-4 text-xs">
                                <dt className="text-slate-500">
                                    Total Kompensasi
                                </dt>
                                <dd className="font-semibold tabular-nums text-emerald-700">
                                    -{formatRupiah(transaksi.total_kompensasi)}
                                </dd>
                            </div>
                        )}
                        {parseDecimalToCents(transaksi.biaya_pembatalan) > 0 && (
                            <div className="flex justify-between gap-4 text-xs">
                                <dt className="text-slate-500">
                                    Biaya Pembatalan
                                </dt>
                                <dd className="font-semibold tabular-nums text-rose-700">
                                    +{formatRupiah(transaksi.biaya_pembatalan)}
                                </dd>
                            </div>
                        )}
                        <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
                            <dt className="font-bold text-slate-900">
                                Total Tagihan
                            </dt>
                            <dd className="text-base font-bold tabular-nums text-slate-900">
                                {formatRupiah(transaksi.total_harga)}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-slate-500">Total Dibayar</dt>
                            <dd className="font-semibold tabular-nums text-sky-700">
                                {formatRupiah(transaksi.total_dibayar)}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-slate-100 pt-2.5">
                            <dt className="text-sm font-bold text-slate-900">
                                Sisa Tagihan
                            </dt>
                            <dd className="text-base font-bold tabular-nums text-amber-700">
                                {formatRupiah(transaksi.sisa_tagihan)}
                            </dd>
                        </div>
                    </dl>
                </section>
            </div>

            {/* Rincian Pakaian */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h2 className="text-sm font-bold text-slate-900">
                        Rincian Item Pakaian ({transaksi.detail_pakaian.length}{' '}
                        baris)
                    </h2>
                    <span className="text-xs font-semibold text-slate-600">
                        Total {totalPotong} potong
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-3">No.</th>
                                <th className="px-5 py-3">Jenis Pakaian</th>
                                <th className="px-5 py-3 text-right">
                                    Jumlah Potong
                                </th>
                                <th className="px-5 py-3">Kondisi Awal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transaksi.detail_pakaian.map((detail, idx) => (
                                <tr key={detail.id_detail}>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {idx + 1}
                                    </td>
                                    <td className="px-5 py-3 font-medium text-slate-900">
                                        {detail.jenis_pakaian}
                                    </td>
                                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800">
                                        {detail.jumlah_potong} pcs
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-600">
                                        {detail.kondisi_pakaian}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Bottom Grid: Riwayat Pembayaran + Timeline Produksi */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-sm font-bold text-slate-900">
                            Riwayat Pembayaran
                        </h2>
                    </div>
                    {transaksi.pembayaran.length === 0 ? (
                        <div className="p-5 text-xs text-slate-500">
                            Belum ada pembayaran tercatat (status{' '}
                            <span className="font-semibold text-slate-700">
                                {transaksi.status_pembayaran}
                            </span>
                            ).
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">Tanggal</th>
                                        <th className="px-5 py-3">Jenis</th>
                                        <th className="px-5 py-3">Petugas</th>
                                        <th className="px-5 py-3 text-right">
                                            Nominal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transaksi.pembayaran.map((bayar) => (
                                        <tr key={bayar.id_pembayaran}>
                                            <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-700">
                                                {formatTanggal(
                                                    bayar.tanggal_bayar,
                                                    { withTime: true },
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3">
                                                <PaymentTypeBadge
                                                    type={bayar.jenis_bayar}
                                                />
                                            </td>
                                            <td className="px-5 py-3 text-xs text-slate-600">
                                                {bayar.petugas?.nama_petugas ??
                                                    '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                                                {formatRupiah(
                                                    bayar.nominal_bayar,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h2 className="text-sm font-bold text-slate-900">
                        Riwayat &amp; Alur Tahap Produksi
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Tahapan layanan:{' '}
                        {transaksi.layanan.perlu_setrika
                            ? 'Termasuk tahap penyetrikaan'
                            : 'Tanpa tahap penyetrikaan'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {transaksi.layanan.tahap_layanan.map((tahap) => {
                            const done = completedStages.has(tahap.nama_tahap);
                            return (
                                <span
                                    key={tahap.id_tahap}
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                                        done
                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                            : 'bg-slate-50 text-slate-500 ring-slate-200'
                                    }`}
                                >
                                    {tahap.urutan}. {tahap.nama_tahap}
                                </span>
                            );
                        })}
                    </div>

                    <ol className="mt-5 space-y-4 border-l-2 border-slate-200 pl-4">
                        {transaksi.riwayat_status_produksi.map((riwayat) => (
                            <li
                                key={riwayat.id_status_produksi}
                                className="relative"
                            >
                                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-sky-600 ring-4 ring-white" />
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <ProductionStageBadge
                                        stage={riwayat.tahap_status}
                                    />
                                    <span className="text-[11px] text-slate-500">
                                        {formatTanggal(riwayat.waktu_update, {
                                            withTime: true,
                                        })}
                                    </span>
                                </div>
                                {riwayat.catatan && (
                                    <p className="mt-1 text-xs text-slate-600">
                                        {riwayat.catatan}
                                    </p>
                                )}
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    {riwayat.id_pegawai !== null
                                        ? `Pegawai ID #${riwayat.id_pegawai}`
                                        : 'Dicatat saat penerimaan kasir'}
                                </p>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>
        </AppLayout>
    );
}
