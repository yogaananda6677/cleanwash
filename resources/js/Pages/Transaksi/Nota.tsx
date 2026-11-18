import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Printer } from 'lucide-react';
import CleanWashLogo from '@/Components/CleanWashLogo';
import { Fragment, useId } from 'react';
import MetadataRow from '@/Components/MetadataRow';
import {
    JenisInsidenBadge,
    PayLaterBadge,
    PaymentStatusBadge,
    PaymentTypeBadge,
    ProductionStageBadge,
    SpeedTierBadge,
    StatusBadge,
    StatusKonfirmasiBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import {
    formatRupiah,
    formatTahapProduksi,
    formatTanggal,
    parseDecimalToCents,
} from '@/lib/format';
import type { TransaksiNotaProps } from '@/types';

export default function TransaksiNota({
    transaksi,
    isPublicView = false,
}: TransaksiNotaProps) {
    const layananCaptionId = useId();
    const pakaianCaptionId = useId();
    const riwayatCaptionId = useId();
    const insidenCaptionId = useId();
    const pembayaranCaptionId = useId();

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

    const orderedPipelineStages = transaksi.layanan.tahap_layanan
        .slice()
        .sort((a, b) => a.urutan - b.urutan)
        .filter(
            (tahap) =>
                transaksi.layanan.perlu_setrika ||
                tahap.nama_tahap !== 'DISETRIKA',
        );

    const isDibatalkan = transaksi.status_transaksi === 'DIBATALKAN';
    const voucherApplied =
        transaksi.voucher !== null ||
        parseDecimalToCents(transaksi.nilai_voucher_snapshot) > 0;
    const hasKompensasi =
        parseDecimalToCents(transaksi.total_kompensasi) > 0;
    const hasBiayaPembatalan =
        parseDecimalToCents(transaksi.biaya_pembatalan) > 0;
    const hasSisaTagihan =
        parseDecimalToCents(transaksi.sisa_tagihan) > 0;
    const hasKelebihanBayarTunai =
        parseDecimalToCents(transaksi.kelebihan_bayar_tunai) > 0;
    const hasKelebihanGantiRugi =
        parseDecimalToCents(transaksi.total_kelebihan_ganti_rugi) > 0;
    const hasTotalPengembalian =
        parseDecimalToCents(transaksi.total_pengembalian_pelanggan) > 0;

    return (
        <div className="min-h-screen bg-[#F5F7F8] px-4 py-6 text-[#0F172A] sm:px-6 print:min-h-0 print:bg-white print:p-0">
            <Head title={`Cetak Nota ${transaksi.nomor_nota}`} />

            <div className="mx-auto max-w-4xl print:max-w-none">
                {/* Baris aksi navigasi & cetak (disembunyikan saat print) */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D8E2E6] bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(15,41,51,0.04)] print:hidden">
                    <div className="flex flex-wrap items-center gap-2">
                        {isPublicView ? (
                            <Link
                                href="/"
                                className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                            >
                                &larr; Beranda CleanWash
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={`/transaksi/${transaksi.nomor_nota}`}
                                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                                >
                                    &larr; Kembali ke Detail
                                </Link>
                                <Link
                                    href="/transaksi"
                                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                                >
                                    Daftar Transaksi
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="hidden text-xs text-[#5B697A] sm:inline">
                            Pratinjau cetak siap kertas A4
                        </span>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                        >
                            <Printer
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Cetak Nota</span>
                        </button>
                    </div>
                </div>

                {/* Lembar Nota Resmi CleanWash */}
                <article className="rounded-2xl border border-[#D8E2E6] bg-white p-6 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
                    {/* Header Brand & Nomor Nota */}
                    <header className="flex flex-col justify-between gap-4 border-b-2 border-[#0B132B] pb-5 sm:flex-row sm:items-start print:flex-row print:items-start">
                        <div className="flex items-start gap-4">
                            <CleanWashLogo
                                variant="mark"
                                theme="light"
                                size="lg"
                            />
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB]">
                                    Nota Transaksi Resmi
                                </p>
                                <h1
                                    id="main-content"
                                    tabIndex={-1}
                                    className="text-xl font-extrabold tracking-tight text-[#0F172A] focus:outline-none"
                                >
                                    CleanWash Laundry
                                </h1>
                                <p className="mt-0.5 text-xs text-[#5B697A]">
                                    Sistem Manajemen Operasional Laundry &bull;
                                    Waktu Referensi WIB (Asia/Jakarta)
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-4 py-3 text-left sm:text-right print:text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5B697A]">
                                Nomor Nota
                            </p>
                            <p className="mt-0.5 font-mono text-lg font-extrabold tabular-nums text-[#0F172A]">
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

                    {/* Ringkasan Pembatalan Transaksi (KK-08) */}
                    {isDibatalkan && (
                        <section className="mt-5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-bold uppercase tracking-wider text-[#9F1239]">
                                        Status Pembatalan Transaksi
                                    </h2>
                                    <TransactionStatusBadge
                                        status={transaksi.status_transaksi}
                                    />
                                </div>
                                <span className="font-mono font-bold tabular-nums text-[#9F1239]">
                                    Biaya Pembatalan:{' '}
                                    {formatRupiah(transaksi.biaya_pembatalan)}
                                </span>
                            </div>
                            <p className="mt-1.5 text-[#9F1239]">
                                {hasBiayaPembatalan
                                    ? `Transaksi dibatalkan setelah proses pencucian dimulai (KK-08) dengan biaya proses sebesar ${formatRupiah(transaksi.biaya_pembatalan)}.`
                                    : 'Transaksi dibatalkan pada tahap DITERIMA sebelum proses pencucian dimulai (bebas biaya pembatalan Rp 0).'}
                            </p>
                        </section>
                    )}

                    {/* Identitas Pelanggan & Metadata Penerimaan */}
                    <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
                        <div className="rounded-xl border border-[#D8E2E6] p-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                                Identitas Pelanggan
                            </h2>
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-[#5B697A]">Nama</dt>
                                    <dd className="text-right font-bold text-[#0F172A]">
                                        {transaksi.pelanggan.nama}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-[#5B697A]">
                                        No. Telepon
                                    </dt>
                                    <dd className="text-right font-mono tabular-nums text-[#0F172A]">
                                        {transaksi.pelanggan.no_telepon}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="shrink-0 text-[#5B697A]">
                                        Alamat
                                    </dt>
                                    <dd className="text-right text-[#475569]">
                                        {transaksi.pelanggan.alamat}
                                    </dd>
                                </div>
                                {transaksi.pelanggan.boleh_bayar_akhir && (
                                    <div className="flex items-center justify-between gap-3 border-t border-[#D8E2E6] pt-2">
                                        <dt className="text-[#5B697A]">
                                            Penanda Pelanggan
                                        </dt>
                                        <dd>
                                            <PayLaterBadge allowed />
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        <div className="rounded-xl border border-[#D8E2E6] p-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                                Informasi Penerimaan &amp; Status
                            </h2>
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-[#5B697A]">
                                        Tanggal Penerimaan
                                    </dt>
                                    <dd className="text-right font-semibold tabular-nums text-[#0F172A]">
                                        {formatTanggal(
                                            transaksi.tanggal_penerimaan,
                                            { withTime: true },
                                        )}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-[#5B697A]">
                                        Petugas Penerima
                                    </dt>
                                    <dd className="text-right font-semibold text-[#0F172A]">
                                        {transaksi.petugas.nama_petugas}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-[#5B697A]">
                                        Status Pembayaran
                                    </dt>
                                    <dd>
                                        <PaymentStatusBadge
                                            status={transaksi.status_pembayaran}
                                        />
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <dt className="text-[#5B697A]">
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
                                                <span className="text-[10px] tabular-nums text-[#5B697A]">
                                                    {formatTanggal(
                                                        latestStage.waktu_update,
                                                        { withTime: true },
                                                    )}
                                                </span>
                                                {latestStage.pegawai && (
                                                    <span className="text-[10px] font-medium text-[#475569]">
                                                        Pelaksana:{' '}
                                                        {
                                                            latestStage.pegawai
                                                                .nama_pegawai
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[#5B697A]">
                                                —
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                {transaksi.diambil_pada && (
                                    <div className="flex justify-between gap-3 border-t border-[#D8E2E6] pt-2">
                                        <dt className="text-[#5B697A]">
                                            Waktu Serah Terima
                                        </dt>
                                        <dd className="text-right tabular-nums text-[#475569]">
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
                    <section className="mt-5 rounded-xl border border-[#D8E2E6] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8E2E6] pb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                                Rincian Layanan
                            </h2>
                            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-medium">
                                {orderedPipelineStages.map((tahap, idx) => {
                                    const done = completedStages.has(
                                        tahap.nama_tahap,
                                    );
                                    return (
                                        <Fragment key={tahap.id_tahap}>
                                            {idx > 0 && (
                                                <li aria-hidden="true">
                                                    <ArrowRight className="h-3 w-3 text-[#7C8C9D]" />
                                                </li>
                                            )}
                                            <li
                                                className={
                                                    done
                                                        ? 'font-semibold text-[#065F46]'
                                                        : 'text-[#5B697A]'
                                                }
                                            >
                                                {tahap.urutan}.{' '}
                                                {formatTahapProduksi(
                                                    tahap.nama_tahap,
                                                )}
                                            </li>
                                        </Fragment>
                                    );
                                })}
                            </ol>
                        </div>

                        <div
                            tabIndex={0}
                            role="region"
                            aria-labelledby={layananCaptionId}
                            className="mt-3 overflow-x-auto"
                        >
                            <table className="min-w-full text-left text-xs">
                                <caption
                                    id={layananCaptionId}
                                    className="sr-only"
                                >
                                    Rincian layanan transaksi{' '}
                                    {transaksi.nomor_nota}
                                </caption>
                                <thead className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                                    <tr>
                                        <th scope="col" className="py-1.5 pr-4">
                                            Nama Layanan
                                        </th>
                                        <th scope="col" className="px-4 py-1.5">
                                            Kecepatan
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-1.5 text-right"
                                        >
                                            Volume / Kuantitas
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-1.5 text-right"
                                        >
                                            Tarif Satuan (Snapshot)
                                        </th>
                                        <th
                                            scope="col"
                                            className="py-1.5 pl-4 text-right"
                                        >
                                            Subtotal Layanan
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="border-t border-[#D8E2E6]">
                                    <tr>
                                        <th
                                            scope="row"
                                            className="py-2.5 pr-4 text-left font-normal"
                                        >
                                            <p className="font-bold text-[#0F172A]">
                                                {transaksi.layanan.nama_layanan}
                                            </p>
                                            <MetadataRow
                                                className="mt-0.5 text-[11px]"
                                                items={[
                                                    `Metode hitung: ${transaksi.layanan.metode_hitung}`,
                                                    transaksi.layanan
                                                        .perlu_setrika
                                                        ? 'Dengan setrika'
                                                        : 'Tanpa setrika',
                                                ]}
                                            />
                                        </th>
                                        <td className="px-4 py-2.5">
                                            <SpeedTierBadge
                                                tier={
                                                    transaksi.layanan
                                                        .tingkat_kecepatan
                                                }
                                                variant="text"
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                            {transaksi.berat_atau_jumlah}{' '}
                                            {transaksi.layanan.satuan}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                            {formatRupiah(
                                                transaksi.harga_satuan_snapshot,
                                            )}
                                            /{transaksi.layanan.satuan}
                                        </td>
                                        <td className="py-2.5 pl-4 text-right font-mono font-bold tabular-nums text-[#0F172A]">
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
                    <section className="mt-5 overflow-hidden rounded-xl border border-[#D8E2E6]">
                        <div className="flex items-center justify-between border-b border-[#D8E2E6] bg-[#F8FAFC] px-4 py-2.5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                                Rincian Item Pakaian (
                                {transaksi.detail_pakaian.length} baris)
                            </h2>
                            <span className="text-xs font-bold tabular-nums text-[#0F172A]">
                                Total: {totalPotong} potong
                            </span>
                        </div>
                        <div
                            tabIndex={0}
                            role="region"
                            aria-labelledby={pakaianCaptionId}
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-xs">
                                <caption
                                    id={pakaianCaptionId}
                                    className="sr-only"
                                >
                                    Daftar rincian item pakaian nota{' '}
                                    {transaksi.nomor_nota}
                                </caption>
                                <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="w-12 px-4 py-2"
                                        >
                                            No.
                                        </th>
                                        <th scope="col" className="px-4 py-2">
                                            Jenis Pakaian
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-2 text-right"
                                        >
                                            Jumlah Potong
                                        </th>
                                        <th scope="col" className="px-4 py-2">
                                            Kondisi Pakaian
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D8E2E6]/70">
                                    {transaksi.detail_pakaian.map(
                                        (detail, idx) => (
                                            <tr key={detail.id_detail}>
                                                <td className="px-4 py-2.5 tabular-nums text-[#5B697A]">
                                                    {idx + 1}
                                                </td>
                                                <th
                                                    scope="row"
                                                    className="px-4 py-2.5 text-left font-semibold text-[#0F172A]"
                                                >
                                                    {detail.jenis_pakaian}
                                                </th>
                                                <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                                    {detail.jumlah_potong} pcs
                                                </td>
                                                <td className="px-4 py-2.5 text-[#475569]">
                                                    {detail.kondisi_pakaian}
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Riwayat Status Produksi + Pelaksana Pegawai */}
                    {transaksi.riwayat_status_produksi.length > 0 && (
                        <section className="mt-5 overflow-hidden rounded-xl border border-[#D8E2E6]">
                            <div className="flex items-center justify-between border-b border-[#D8E2E6] bg-[#F8FAFC] px-4 py-2.5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                                    Riwayat Status Produksi
                                </h2>
                                <span className="text-[11px] font-medium tabular-nums text-[#5B697A]">
                                    {transaksi.riwayat_status_produksi.length}{' '}
                                    tahap tercatat
                                </span>
                            </div>
                            <div
                                tabIndex={0}
                                role="region"
                                aria-labelledby={riwayatCaptionId}
                                className="overflow-x-auto"
                            >
                                <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-xs">
                                    <caption
                                        id={riwayatCaptionId}
                                        className="sr-only"
                                    >
                                        Riwayat perpindahan status produksi nota{' '}
                                        {transaksi.nomor_nota}
                                    </caption>
                                    <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Tahap
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Waktu Update
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Pegawai Pelaksana
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Catatan
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D8E2E6]/70">
                                        {transaksi.riwayat_status_produksi.map(
                                            (riwayat) => (
                                                <tr
                                                    key={
                                                        riwayat.id_status_produksi
                                                    }
                                                >
                                                    <th
                                                        scope="row"
                                                        className="whitespace-nowrap px-4 py-2 text-left font-normal"
                                                    >
                                                        <ProductionStageBadge
                                                            stage={
                                                                riwayat.tahap_status
                                                            }
                                                        />
                                                    </th>
                                                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[#475569]">
                                                        {formatTanggal(
                                                            riwayat.waktu_update,
                                                            { withTime: true },
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 font-medium text-[#0F172A]">
                                                        {riwayat.pegawai
                                                            ? riwayat.pegawai
                                                                  .nama_pegawai
                                                            : riwayat.id_pegawai !==
                                                                null
                                                              ? `Pegawai #${riwayat.id_pegawai}`
                                                              : 'Kasir (Penerimaan)'}
                                                    </td>
                                                    <td className="px-4 py-2 text-[#475569]">
                                                        {riwayat.catatan ?? '—'}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Laporan Insiden & Kompensasi (KK-04, KK-05) */}
                    {transaksi.laporan_insiden.length > 0 && (
                        <section className="mt-5 overflow-hidden rounded-xl border border-amber-300">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-[#FFFBEB] px-4 py-2.5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#78350F]">
                                    Rincian Laporan Insiden &amp; Kompensasi (
                                    {transaksi.laporan_insiden.length})
                                </h2>
                                {transaksi.insiden_pending_count > 0 && (
                                    <StatusBadge tone="amber">
                                        {transaksi.insiden_pending_count}{' '}
                                        Menunggu Konfirmasi
                                    </StatusBadge>
                                )}
                            </div>
                            <div
                                tabIndex={0}
                                role="region"
                                aria-labelledby={insidenCaptionId}
                                className="overflow-x-auto"
                            >
                                <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-xs">
                                    <caption
                                        id={insidenCaptionId}
                                        className="sr-only"
                                    >
                                        Rincian laporan insiden dan kompensasi
                                        nota {transaksi.nomor_nota}
                                    </caption>
                                    <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Jenis Insiden
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Item Pakaian
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Keterangan
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2"
                                            >
                                                Status Konfirmasi
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2 text-right"
                                            >
                                                Nilai Kompensasi
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-4 py-2 text-right"
                                            >
                                                Kelebihan Ganti Rugi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D8E2E6]/70">
                                        {transaksi.laporan_insiden.map(
                                            (laporan) => {
                                                const isPending =
                                                    laporan.status_konfirmasi ===
                                                    'MENUNGGU_KONFIRMASI';
                                                return (
                                                    <tr
                                                        key={
                                                            laporan.id_laporan
                                                        }
                                                    >
                                                        <td className="whitespace-nowrap px-4 py-2.5">
                                                            <JenisInsidenBadge
                                                                jenis={
                                                                    laporan.jenis_insiden
                                                                }
                                                            />
                                                        </td>
                                                        <th
                                                            scope="row"
                                                            className="px-4 py-2.5 text-left font-semibold text-[#0F172A]"
                                                        >
                                                            {
                                                                laporan
                                                                    .detail_pakaian
                                                                    .jenis_pakaian
                                                            }{' '}
                                                            (
                                                            {
                                                                laporan
                                                                    .detail_pakaian
                                                                    .jumlah_potong
                                                            }{' '}
                                                            pcs)
                                                        </th>
                                                        <td className="px-4 py-2.5 text-[#475569]">
                                                            <p>
                                                                {
                                                                    laporan.keterangan
                                                                }
                                                            </p>
                                                            {(laporan.pegawai_pelapor ||
                                                                laporan.petugas) && (
                                                                <p className="mt-0.5 text-[10px] text-[#5B697A]">
                                                                    Pelapor:{' '}
                                                                    {laporan
                                                                        .pegawai_pelapor
                                                                        ?.nama_pegawai ??
                                                                        'Petugas'}
                                                                    {laporan.petugas &&
                                                                        ` • Konfirmator: ${laporan.petugas.nama_petugas}`}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-2.5">
                                                            <StatusKonfirmasiBadge
                                                                status={
                                                                    laporan.status_konfirmasi
                                                                }
                                                            />
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                                            {isPending
                                                                ? `Menunggu (Est. ${formatRupiah(laporan.estimasi_kompensasi)})`
                                                                : formatRupiah(
                                                                      laporan.nilai_kompensasi,
                                                                  )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#78350F]">
                                                            {formatRupiah(
                                                                laporan.kelebihan_ganti_rugi,
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Catatan Khusus (bila ada) */}
                    {transaksi.catatan_khusus !== null &&
                        transaksi.catatan_khusus.trim() !== '' && (
                            <section className="mt-5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-4 py-3 text-xs">
                                <h2 className="font-bold uppercase tracking-wider text-[#78350F]">
                                    Catatan Khusus
                                </h2>
                                <p className="mt-1 whitespace-pre-line text-[#78350F]">
                                    {transaksi.catatan_khusus}
                                </p>
                            </section>
                        )}

                    {/* Riwayat Pembayaran / DP + Ringkasan Finansial */}
                    <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-12 print:grid-cols-12">
                        <div className="overflow-hidden rounded-xl border border-[#D8E2E6] md:col-span-7 print:col-span-7">
                            <div className="border-b border-[#D8E2E6] bg-[#F8FAFC] px-4 py-2.5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                                    Riwayat Pembayaran / DP
                                </h2>
                            </div>
                            {transaksi.pembayaran.length === 0 ? (
                                <div className="p-4 text-xs text-[#5B697A]">
                                    Belum ada pembayaran tercatat (status{' '}
                                    <span className="font-semibold text-[#0F172A]">
                                        {transaksi.status_pembayaran}
                                    </span>
                                    ).
                                </div>
                            ) : (
                                <div
                                    tabIndex={0}
                                    role="region"
                                    aria-labelledby={pembayaranCaptionId}
                                    className="overflow-x-auto"
                                >
                                    <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-xs">
                                        <caption
                                            id={pembayaranCaptionId}
                                            className="sr-only"
                                        >
                                            Riwayat pembayaran nota{' '}
                                            {transaksi.nomor_nota}
                                        </caption>
                                        <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2"
                                                >
                                                    Tanggal
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2"
                                                >
                                                    Jenis
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2"
                                                >
                                                    Petugas
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2 text-right"
                                                >
                                                    Nominal
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#D8E2E6]/70">
                                            {transaksi.pembayaran.map(
                                                (bayar) => (
                                                    <tr
                                                        key={
                                                            bayar.id_pembayaran
                                                        }
                                                    >
                                                        <td className="whitespace-nowrap px-4 py-2 tabular-nums text-[#475569]">
                                                            {formatTanggal(
                                                                bayar.tanggal_bayar,
                                                                {
                                                                    withTime: true,
                                                                },
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-2">
                                                            <PaymentTypeBadge
                                                                type={
                                                                    bayar.jenis_bayar
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 text-[#475569]">
                                                            {bayar.petugas
                                                                ?.nama_petugas ??
                                                                '—'}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-2 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                                            {formatRupiah(
                                                                bayar.nominal_bayar,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-4 md:col-span-5 print:col-span-5">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                                Ringkasan Finansial
                            </h2>
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-[#475569]">
                                        Subtotal Layanan
                                    </dt>
                                    <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                        {formatRupiah(
                                            transaksi.subtotal_layanan,
                                        )}
                                    </dd>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-[#475569]">
                                        <span>Potongan Voucher</span>
                                        {voucherApplied &&
                                            transaksi.voucher && (
                                                <span className="ml-1.5 inline-block rounded bg-[#ECFDF5] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#065F46] ring-1 ring-emerald-200">
                                                    {
                                                        transaksi.voucher
                                                            .nomor_voucher
                                                    }
                                                </span>
                                            )}
                                    </dt>
                                    <dd
                                        className={`font-mono font-semibold tabular-nums ${
                                            voucherApplied
                                                ? 'text-[#065F46]'
                                                : 'text-[#5B697A]'
                                        }`}
                                    >
                                        {voucherApplied
                                            ? `-${formatRupiah(transaksi.nilai_voucher_snapshot)}`
                                            : formatRupiah('0.00')}
                                    </dd>
                                </div>

                                {hasKompensasi && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-[#475569]">
                                            Total Kompensasi
                                        </dt>
                                        <dd className="font-mono font-semibold tabular-nums text-[#065F46]">
                                            -
                                            {formatRupiah(
                                                transaksi.total_kompensasi,
                                            )}
                                        </dd>
                                    </div>
                                )}

                                {(hasBiayaPembatalan || isDibatalkan) && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-[#475569]">
                                            Biaya Pembatalan
                                        </dt>
                                        <dd className="font-mono font-semibold tabular-nums text-[#9F1239]">
                                            {formatRupiah(
                                                transaksi.biaya_pembatalan,
                                            )}
                                        </dd>
                                    </div>
                                )}

                                <div className="flex justify-between gap-3 border-t border-[#D8E2E6] pt-2 text-sm">
                                    <dt className="font-bold text-[#0F172A]">
                                        Total Harga
                                    </dt>
                                    <dd className="font-mono font-extrabold tabular-nums text-[#0F172A]">
                                        {formatRupiah(transaksi.total_harga)}
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3">
                                    <dt className="text-[#475569]">
                                        Total Dibayar
                                    </dt>
                                    <dd className="font-mono font-semibold tabular-nums text-[#2563EB]">
                                        {formatRupiah(transaksi.total_dibayar)}
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 border-t border-[#D8E2E6] pt-2 text-sm">
                                    <dt className="font-bold text-[#0F172A]">
                                        Sisa Tagihan
                                    </dt>
                                    <dd
                                        className={`font-mono font-extrabold tabular-nums ${
                                            hasSisaTagihan
                                                ? 'text-[#78350F]'
                                                : 'text-[#065F46]'
                                        }`}
                                    >
                                        {formatRupiah(transaksi.sisa_tagihan)}
                                    </dd>
                                </div>

                                {(hasKelebihanBayarTunai ||
                                    hasKelebihanGantiRugi ||
                                    hasTotalPengembalian) && (
                                    <div className="mt-2 space-y-1.5 rounded-lg border border-emerald-200 bg-[#ECFDF5] p-2.5 text-xs">
                                        {hasKelebihanBayarTunai && (
                                            <div className="flex justify-between gap-3 text-[#065F46]">
                                                <dt>Kelebihan Bayar Tunai</dt>
                                                <dd className="font-mono font-semibold tabular-nums">
                                                    {formatRupiah(
                                                        transaksi.kelebihan_bayar_tunai,
                                                    )}
                                                </dd>
                                            </div>
                                        )}
                                        {hasKelebihanGantiRugi && (
                                            <div className="flex justify-between gap-3 text-[#065F46]">
                                                <dt>
                                                    Total Kelebihan Ganti Rugi
                                                </dt>
                                                <dd className="font-mono font-semibold tabular-nums">
                                                    {formatRupiah(
                                                        transaksi.total_kelebihan_ganti_rugi,
                                                    )}
                                                </dd>
                                            </div>
                                        )}
                                        {hasTotalPengembalian && (
                                            <div className="flex justify-between gap-3 border-t border-emerald-200 pt-1.5 font-bold text-[#065F46]">
                                                <dt>
                                                    Total Pengembalian Pelanggan
                                                </dt>
                                                <dd className="font-mono tabular-nums">
                                                    {formatRupiah(
                                                        transaksi.total_pengembalian_pelanggan,
                                                    )}
                                                </dd>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </dl>
                        </div>
                    </section>

                    {/* Footer Nota Resmi & Tanda Tangan */}
                    <footer className="mt-6 border-t border-dashed border-[#7C8C9D] pt-4 text-[11px] text-[#5B697A]">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row print:flex-row">
                            <div className="max-w-md space-y-1">
                                <p className="font-semibold text-[#0F172A]">
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
                                    <p className="font-medium text-[#3730A3]">
                                        3. Hak Bayar Akhir aktif untuk pelanggan
                                        ini; sisa piutang dicatat resmi pada
                                        nota.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-8 text-center">
                                <div>
                                    <p className="text-[#5B697A]">
                                        Petugas Penerima
                                    </p>
                                    <div className="mt-10 border-t border-[#7C8C9D] pt-1 font-semibold text-[#0F172A]">
                                        {transaksi.petugas.nama_petugas}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[#5B697A]">Pelanggan</p>
                                    <div className="mt-10 border-t border-[#7C8C9D] pt-1 font-semibold text-[#0F172A]">
                                        {transaksi.pelanggan.nama}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 border-t border-[#D8E2E6] pt-2 flex items-center justify-between text-[10px] text-[#7C8C9D]">
                            <p>Sistem Informasi Manajemen Operasional Laundry CleanWash</p>
                            <p>Copyright &copy; 2026 CleanWash &bull; Developed by <strong className="text-[#0F172A]">Yoga</strong></p>
                        </div>
                    </footer>
                </article>
            </div>
        </div>
    );
}
