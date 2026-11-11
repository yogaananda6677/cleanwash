import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowLeftRight,
    ArrowRight,
    Check,
    CheckCircle2,
    Info,
    PackageCheck,
    Printer,
    ShieldAlert,
    Truck,
    Wallet,
    XCircle,
} from 'lucide-react';
import { Fragment, useId, useState, type FormEvent } from 'react';
import KonfirmasiKompensasiModal, {
    type KonfirmasiKompensasiTarget,
} from '@/Components/KonfirmasiKompensasiModal';
import LaporkanInsidenModal from '@/Components/LaporkanInsidenModal';
import MetadataRow from '@/Components/MetadataRow';
import Modal from '@/Components/Modal';
import PelunasanModal from '@/Components/PelunasanModal';
import SerahTerimaModal from '@/Components/SerahTerimaModal';
import {
    ItemPengantaranStatusBadge,
    JenisInsidenBadge,
    PayLaterBadge,
    PaymentStatusBadge,
    PaymentTypeBadge,
    PengantaranStatusBadge,
    ProductionStageBadge,
    RoleBadge,
    SpeedTierBadge,
    StatusBadge,
    StatusKonfirmasiBadge,
    TransactionStatusBadge,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import {
    calculateMultiplyQuantityCents,
    centsToDecimalString,
    formatAuditAction,
    formatRupiah,
    formatTahapProduksi,
    formatTanggal,
    parseDecimalToCents,
    toEligibleInsidenOption,
} from '@/lib/format';
import type {
    AuditLogItem,
    JenisLayananItem,
    LaporanInsidenItem,
    TahapProduksiCode,
    TransaksiShowProps,
} from '@/types';

function getServiceStages(layanan: JenisLayananItem): TahapProduksiCode[] {
    if (layanan.tahap_layanan.length > 0) {
        return layanan.tahap_layanan
            .slice()
            .sort((a, b) => a.urutan - b.urutan)
            .map((stage) => stage.nama_tahap);
    }

    return layanan.perlu_setrika
        ? ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'DISETRIKA', 'SELESAI']
        : ['DITERIMA', 'DICUCI', 'DIKERINGKAN', 'SELESAI'];
}

function summarizeAuditLog(log: AuditLogItem): string[] {
    const before = log.payload_before ?? {};
    const after = log.payload_after ?? {};
    const highlights: string[] = [];

    if (log.action === 'TIMBANG_ULANG') {
        if (before.berat_atau_jumlah && after.berat_atau_jumlah) {
            highlights.push(
                `Berat: ${String(before.berat_atau_jumlah)} kg → ${String(after.berat_atau_jumlah)} kg`,
            );
        }
        if (after.total_harga !== undefined) {
            highlights.push(
                `Total tagihan: ${formatRupiah(String(after.total_harga))}`,
            );
        }
        if (after.catatan) {
            highlights.push(`Catatan: ${String(after.catatan)}`);
        }
    } else if (log.action === 'PRODUKSI_STATUS_UPDATED') {
        if (before.tahap_status && after.tahap_status) {
            highlights.push(
                `Tahap: ${String(before.tahap_status)} → ${String(after.tahap_status)}`,
            );
        }
        if (after.catatan) {
            highlights.push(`Catatan: ${String(after.catatan)}`);
        }
    } else if (log.action === 'LAYANAN_CHANGED') {
        if (before.nama_layanan && after.nama_layanan) {
            highlights.push(
                `Layanan: ${String(before.nama_layanan)} → ${String(after.nama_layanan)}`,
            );
        }
        if (after.selisih_tagihan !== undefined) {
            highlights.push(
                `Selisih tagihan: ${formatRupiah(String(after.selisih_tagihan))}`,
            );
        }
        if (after.alasan_perubahan) {
            highlights.push(`Alasan: ${String(after.alasan_perubahan)}`);
        }
    } else if (log.action === 'TRANSAKSI_CANCELLED') {
        if (after.biaya_pembatalan !== undefined) {
            highlights.push(
                `Biaya batal: ${formatRupiah(String(after.biaya_pembatalan))}`,
            );
        }
        if (after.voucher_dilepas === true && after.voucher_asal) {
            highlights.push(
                `Voucher ${String(after.voucher_asal)} dilepas (${String(after.voucher_status_sesudah ?? 'TERSEDIA')})`,
            );
        }
        if (after.alasan_pembatalan) {
            highlights.push(`Alasan: ${String(after.alasan_pembatalan)}`);
        }
    } else if (log.action === 'INSIDEN_REPORTED') {
        if (after.jenis_pakaian && after.jenis_insiden) {
            highlights.push(
                `Item: ${String(after.jenis_pakaian)} (${String(after.jenis_insiden)})`,
            );
        }
        if (after.keterangan) {
            highlights.push(`Keterangan: ${String(after.keterangan)}`);
        }
    } else if (log.action === 'KOMPENSASI_CONFIRMED') {
        if (after.nilai_kompensasi !== undefined) {
            highlights.push(
                `Kompensasi: ${formatRupiah(String(after.nilai_kompensasi))}`,
            );
        }
        if (
            after.kelebihan_ganti_rugi !== undefined &&
            parseDecimalToCents(String(after.kelebihan_ganti_rugi)) > 0
        ) {
            highlights.push(
                `Kelebihan ganti rugi: ${formatRupiah(String(after.kelebihan_ganti_rugi))}`,
            );
        }
        if (after.keterangan_konfirmasi) {
            highlights.push(`Catatan: ${String(after.keterangan_konfirmasi)}`);
        }
    } else if (log.action === 'TRANSAKSI_CREATED') {
        if (after.total_harga !== undefined) {
            highlights.push(
                `Total awal: ${formatRupiah(String(after.total_harga))}`,
            );
        }
    } else if (log.action === 'PELUNASAN_RECORDED') {
        if (after.nominal_bayar !== undefined) {
            highlights.push(
                `Pelunasan: ${formatRupiah(String(after.nominal_bayar))}`,
            );
        }
        if (after.sisa_tagihan !== undefined) {
            highlights.push(
                `Sisa sesudah: ${formatRupiah(String(after.sisa_tagihan))}`,
            );
        }
    } else if (log.action === 'SERAH_TERIMA') {
        if (after.kanal) {
            highlights.push(`Kanal: ${String(after.kanal)}`);
        }
        if (
            after.piutang_dicatat === true &&
            after.sisa_tagihan !== undefined
        ) {
            highlights.push(
                `Piutang dicatat: ${formatRupiah(String(after.sisa_tagihan))}`,
            );
        }
        if (after.catatan) {
            highlights.push(`Catatan: ${String(after.catatan)}`);
        }
    } else if (log.action === 'ITEM_PENGANTARAN_UPDATED') {
        if (before.status_terima_pelanggan && after.status_terima_pelanggan) {
            highlights.push(
                `Item antar: ${String(before.status_terima_pelanggan)} → ${String(after.status_terima_pelanggan)}`,
            );
        }
        if (after.alasan_gagal) {
            highlights.push(`Alasan gagal: ${String(after.alasan_gagal)}`);
        }
    } else if (log.action === 'PENGANTARAN_RESCHEDULED') {
        if (after.new_id_pengantaran) {
            highlights.push(
                `Dijadwalkan ulang ke sesi #${String(after.new_id_pengantaran)} (${String(after.tanggal_pengantaran_baru ?? '')})`,
            );
        }
    }

    if (
        before.status_pembayaran &&
        after.status_pembayaran &&
        before.status_pembayaran !== after.status_pembayaran
    ) {
        highlights.push(
            `Status bayar: ${String(before.status_pembayaran)} → ${String(after.status_pembayaran)}`,
        );
    }

    return highlights;
}

export default function TransaksiShow({
    auth,
    transaksi,
    layananOptions,
    auditLogs,
}: TransaksiShowProps) {
    const ubahFormId = useId();
    const ubahLayananSelectId = `${ubahFormId}-layanan`;
    const ubahLayananErrId = `${ubahFormId}-layanan-err`;
    const ubahQtyInputId = `${ubahFormId}-qty`;
    const ubahQtyErrId = `${ubahFormId}-qty-err`;
    const ubahAlasanId = `${ubahFormId}-alasan`;
    const ubahAlasanErrId = `${ubahFormId}-alasan-err`;

    const batalFormId = useId();
    const batalBiayaInputId = `${batalFormId}-biaya`;
    const batalBiayaErrId = `${batalFormId}-biaya-err`;
    const batalAlasanId = `${batalFormId}-alasan`;
    const batalAlasanErrId = `${batalFormId}-alasan-err`;

    const pakaianCaptionId = useId();
    const pembayaranCaptionId = useId();

    const [ubahModalOpen, setUbahModalOpen] = useState(false);
    const [batalModalOpen, setBatalModalOpen] = useState(false);
    const [insidenModalOpen, setInsidenModalOpen] = useState(false);
    const [pelunasanModalOpen, setPelunasanModalOpen] = useState(false);
    const [serahTerimaModalOpen, setSerahTerimaModalOpen] = useState(false);
    const [konfirmasiTarget, setKonfirmasiTarget] =
        useState<KonfirmasiKompensasiTarget | null>(null);

    const ubahForm = useForm({
        id_layanan_baru: '',
        berat_atau_jumlah_baru: '',
        alasan_perubahan: '',
    });

    const batalForm = useForm({
        biaya_pembatalan: '',
        alasan_pembatalan: '',
    });

    const totalPotong = transaksi.detail_pakaian.reduce(
        (acc, item) => acc + item.jumlah_potong,
        0,
    );

    const hasSnapshotTariffDifference =
        parseDecimalToCents(transaksi.harga_satuan_snapshot) !==
        parseDecimalToCents(transaksi.layanan.harga_satuan);

    const hasBiayaPembatalan =
        parseDecimalToCents(transaksi.biaya_pembatalan) > 0;
    const hasKompensasi =
        parseDecimalToCents(transaksi.total_kompensasi) > 0;
    const hasKelebihanBayarTunai =
        parseDecimalToCents(transaksi.kelebihan_bayar_tunai) > 0;
    const hasKelebihanGantiRugi =
        parseDecimalToCents(transaksi.total_kelebihan_ganti_rugi) > 0;
    const hasTotalPengembalian =
        parseDecimalToCents(transaksi.total_pengembalian_pelanggan) > 0;
    const hasSisaTagihan = parseDecimalToCents(transaksi.sisa_tagihan) > 0;

    const canReportIncident =
        transaksi.status_transaksi === 'AKTIF' ||
        transaksi.status_transaksi === 'SELESAI';

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

    const eligibleLayananOptions = layananOptions.filter((option) => {
        if (
            !option.is_active ||
            option.id_layanan === transaksi.layanan.id_layanan
        ) {
            return false;
        }
        if (transaksi.tahap_produksi_terakhir === null) {
            return true;
        }
        return getServiceStages(option).includes(
            transaksi.tahap_produksi_terakhir,
        );
    });

    const openUbahModal = () => {
        const firstOption = eligibleLayananOptions[0] ?? null;
        ubahForm.clearErrors();
        ubahForm.setData({
            id_layanan_baru: firstOption ? String(firstOption.id_layanan) : '',
            berat_atau_jumlah_baru: '',
            alasan_perubahan: '',
        });
        setUbahModalOpen(true);
    };

    const closeUbahModal = () => {
        if (ubahForm.processing) {
            return;
        }
        ubahForm.clearErrors();
        setUbahModalOpen(false);
    };

    const handleUbahSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        ubahForm.transform((formData) => ({
            id_layanan_baru: Number(formData.id_layanan_baru),
            berat_atau_jumlah_baru:
                formData.berat_atau_jumlah_baru.trim() !== ''
                    ? formData.berat_atau_jumlah_baru.trim()
                    : null,
            alasan_perubahan: formData.alasan_perubahan,
        }));
        ubahForm.post(`/transaksi/${transaksi.nomor_nota}/ubah-layanan`, {
            preserveScroll: true,
            onSuccess: () => {
                ubahForm.clearErrors();
                setUbahModalOpen(false);
            },
        });
    };

    const openBatalModal = () => {
        batalForm.clearErrors();
        batalForm.setData({
            biaya_pembatalan: transaksi.perlu_biaya_pembatalan
                ? transaksi.estimasi_biaya_pembatalan
                : '',
            alasan_pembatalan: '',
        });
        setBatalModalOpen(true);
    };

    const closeBatalModal = () => {
        if (batalForm.processing) {
            return;
        }
        batalForm.clearErrors();
        setBatalModalOpen(false);
    };

    const handleBatalSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        batalForm.transform((formData) => ({
            alasan_pembatalan: formData.alasan_pembatalan,
            ...(transaksi.perlu_biaya_pembatalan &&
            formData.biaya_pembatalan.trim() !== ''
                ? { biaya_pembatalan: formData.biaya_pembatalan.trim() }
                : {}),
        }));
        batalForm.post(`/transaksi/${transaksi.nomor_nota}/batalkan`, {
            preserveScroll: true,
            onSuccess: () => {
                batalForm.clearErrors();
                setBatalModalOpen(false);
            },
        });
    };

    const handleOpenKonfirmasi = (lap: LaporanInsidenItem) => {
        setKonfirmasiTarget({
            id_laporan: lap.id_laporan,
            nomor_nota: lap.nomor_nota,
            jenis_insiden: lap.jenis_insiden,
            keterangan: lap.keterangan,
            estimasi_kompensasi: lap.estimasi_kompensasi,
            pelanggan_nama: transaksi.pelanggan.nama,
            detail_pakaian: lap.detail_pakaian,
            pegawai_pelapor: lap.pegawai_pelapor,
            sisa_tagihan: transaksi.sisa_tagihan,
            total_harga: transaksi.total_harga,
            total_dibayar: transaksi.total_dibayar,
        });
    };

    // Ubah Layanan preview calculations
    const selectedNewLayanan =
        eligibleLayananOptions.find(
            (opt) => String(opt.id_layanan) === ubahForm.data.id_layanan_baru,
        ) ?? null;
    const isMethodChanging = selectedNewLayanan
        ? selectedNewLayanan.metode_hitung !== transaksi.layanan.metode_hitung
        : false;
    const effectiveQtyStr =
        ubahForm.data.berat_atau_jumlah_baru.trim() !== ''
            ? ubahForm.data.berat_atau_jumlah_baru.trim()
            : isMethodChanging
              ? '0'
              : transaksi.berat_atau_jumlah;
    const ubahSubtotalBaruCents = selectedNewLayanan
        ? calculateMultiplyQuantityCents(
              effectiveQtyStr,
              selectedNewLayanan.harga_satuan,
          )
        : 0;
    const ubahTotalBaruCents = Math.max(
        0,
        ubahSubtotalBaruCents -
            parseDecimalToCents(transaksi.nilai_voucher_snapshot) -
            parseDecimalToCents(transaksi.total_kompensasi),
    );
    const ubahSelisihCents =
        ubahTotalBaruCents - parseDecimalToCents(transaksi.total_harga);
    const ubahWillDowngradeLunas =
        selectedNewLayanan !== null &&
        transaksi.status_pembayaran === 'LUNAS' &&
        ubahTotalBaruCents > parseDecimalToCents(transaksi.total_dibayar);

    // Batalkan preview calculations
    const batalBiayaCents = transaksi.perlu_biaya_pembatalan
        ? Math.max(
              0,
              parseDecimalToCents(
                  batalForm.data.biaya_pembatalan.trim() !== ''
                      ? batalForm.data.biaya_pembatalan
                      : transaksi.estimasi_biaya_pembatalan,
              ),
          )
        : 0;
    const batalTotalBaruCents = Math.max(
        0,
        batalBiayaCents - parseDecimalToCents(transaksi.total_kompensasi),
    );
    const totalDibayarCents = parseDecimalToCents(transaksi.total_dibayar);
    const batalKelebihanTunaiCents = Math.max(
        0,
        totalDibayarCents - batalBiayaCents,
    );
    const batalSisaBaruCents = Math.max(
        0,
        batalTotalBaruCents - totalDibayarCents,
    );

    return (
        <AppLayout
            title={`Detail Nota ${transaksi.nomor_nota}`}
            subtitle={`Diterima ${formatTanggal(transaksi.tanggal_penerimaan, { withTime: true })} oleh ${transaksi.petugas.nama_petugas}`}
            headerActions={
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/transaksi"
                        className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                    >
                        <ArrowLeft
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Kembali</span>
                    </Link>
                    <Link
                        href={`/transaksi/${transaksi.nomor_nota}/nota`}
                        className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59]"
                    >
                        <Printer
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>Cetak Nota</span>
                    </Link>
                </div>
            }
        >
            <Head title={`Nota ${transaksi.nomor_nota}`} />

            {/* Top Status Strip & Operational Actions */}
            <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B697A]">
                            Nomor Nota Resmi
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xl font-bold tracking-tight tabular-nums text-[#0F172A]">
                                {transaksi.nomor_nota}
                            </span>
                            <TransactionStatusBadge
                                status={transaksi.status_transaksi}
                            />
                            <PaymentStatusBadge
                                status={transaksi.status_pembayaran}
                            />
                            {transaksi.tahap_produksi_terakhir && (
                                <ProductionStageBadge
                                    stage={transaksi.tahap_produksi_terakhir}
                                />
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-4 py-2.5 text-left sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5B697A]">
                            Sisa Tagihan
                        </p>
                        <p
                            className={`mt-0.5 font-mono text-2xl font-bold tracking-tight tabular-nums ${
                                hasSisaTagihan
                                    ? 'text-[#78350F]'
                                    : 'text-[#065F46]'
                            }`}
                        >
                            {formatRupiah(transaksi.sisa_tagihan)}
                        </p>
                    </div>
                </div>

                {(transaksi.bisa_pelunasan ||
                    transaksi.status_transaksi === 'SELESAI' ||
                    transaksi.bisa_ubah_layanan ||
                    transaksi.bisa_batalkan ||
                    canReportIncident) && (
                    <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-[#D8E2E6] pt-4">
                        {transaksi.bisa_pelunasan && (
                            <button
                                type="button"
                                onClick={() => setPelunasanModalOpen(true)}
                                className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59]"
                            >
                                <Wallet
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Catat Pelunasan</span>
                            </button>
                        )}
                        {transaksi.status_transaksi === 'SELESAI' &&
                            !transaksi.sedang_diantar_kurir && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSerahTerimaModalOpen(true)
                                    }
                                    className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                                        transaksi.bisa_serah_terima_loket
                                            ? 'bg-emerald-700 text-white shadow-xs hover:bg-emerald-800'
                                            : 'border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                    }`}
                                >
                                    <PackageCheck
                                        className="h-4 w-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {transaksi.bisa_serah_terima_loket
                                            ? 'Serah Terima Loket'
                                            : 'Serah Terima Loket (Wajib Lunas KK-06)'}
                                    </span>
                                </button>
                            )}
                        {transaksi.sedang_diantar_kurir &&
                            transaksi.pengantaran_aktif && (
                                <Link
                                    href={`/pengantaran/${transaksi.pengantaran_aktif.id_pengantaran}`}
                                    className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-teal-200 bg-[#F0FDFA] px-3.5 py-2 text-xs font-semibold text-[#115E59] transition hover:bg-[#CCFBF1]"
                                >
                                    <Truck
                                        className="h-4 w-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Sedang Diantar Kurir (
                                        {
                                            transaksi.pengantaran_aktif
                                                .status_terima_pelanggan
                                        }
                                        )
                                    </span>
                                    <ArrowRight
                                        className="h-3.5 w-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                </Link>
                            )}
                        {transaksi.bisa_ubah_layanan && (
                            <button
                                type="button"
                                onClick={openUbahModal}
                                className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                            >
                                <ArrowLeftRight
                                    className="h-3.5 w-3.5 shrink-0 text-[#475569]"
                                    aria-hidden="true"
                                />
                                <span>Ubah Layanan (KK-02)</span>
                            </button>
                        )}
                        {canReportIncident && (
                            <button
                                type="button"
                                onClick={() => setInsidenModalOpen(true)}
                                className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                            >
                                <AlertTriangle
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Laporkan Insiden</span>
                            </button>
                        )}
                        {transaksi.bisa_batalkan && (
                            <button
                                type="button"
                                onClick={openBatalModal}
                                className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-[#9F1239] transition hover:bg-rose-100"
                            >
                                <XCircle
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Batalkan Transaksi (KK-08)</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Contextual Banners (border-l-4 + lucide-react icons) */}
                <div className="mt-4 space-y-2.5 empty:hidden">
                    {transaksi.sedang_diantar_kurir &&
                        transaksi.pengantaran_aktif && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-teal-200 border-l-4 border-l-[#0F766E] bg-[#F0FDFA] px-4 py-3 text-xs text-[#115E59]">
                                <Truck
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]"
                                    aria-hidden="true"
                                />
                                <p>
                                    <span className="font-semibold">
                                        Sedang Diantar Kurir:
                                    </span>{' '}
                                    Pakaian nota ini berada pada sesi
                                    pengantaran{' '}
                                    <Link
                                        href={`/pengantaran/${transaksi.pengantaran_aktif.id_pengantaran}`}
                                        className="font-bold underline"
                                    >
                                        #
                                        {
                                            transaksi.pengantaran_aktif
                                                .id_pengantaran
                                        }
                                    </Link>{' '}
                                    (
                                    {transaksi.pengantaran_aktif.pengantaran
                                        ?.nama_petugas_antar ?? 'Kurir'}
                                    ) berstatus{' '}
                                    <strong>
                                        {
                                            transaksi.pengantaran_aktif
                                                .status_terima_pelanggan
                                        }
                                    </strong>
                                    . Serah terima di loket kasir diblokir
                                    hingga pengantaran diselesaikan atau
                                    ditandai gagal.
                                </p>
                            </div>
                        )}

                    {transaksi.status_transaksi === 'SELESAI' &&
                        !transaksi.sedang_diantar_kurir &&
                        !transaksi.bisa_serah_terima_loket && (
                            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-4 py-3 text-xs text-[#78350F]">
                                <ShieldAlert
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                    aria-hidden="true"
                                />
                                <p>
                                    <span className="font-semibold">
                                        Penyerahan Memerlukan Pelunasan (KK-06):
                                    </span>{' '}
                                    Pelanggan tidak memiliki hak bayar akhir dan
                                    masih memiliki sisa tagihan{' '}
                                    <strong className="font-mono tabular-nums">
                                        {formatRupiah(transaksi.sisa_tagihan)}
                                    </strong>
                                    . Gunakan tombol{' '}
                                    <strong>Catat Pelunasan</strong> terlebih
                                    dahulu sebelum serah terima.
                                </p>
                            </div>
                        )}

                    {hasSnapshotTariffDifference && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 border-l-4 border-l-[#4338CA] bg-[#EEF2FF] px-4 py-3 text-xs text-[#3730A3]">
                            <Info
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#4338CA]"
                                aria-hidden="true"
                            />
                            <p>
                                <span className="font-semibold">
                                    Imutabilitas Tarif Snapshot (KK-09):
                                </span>{' '}
                                Tarif master layanan saat ini{' '}
                                <span className="font-mono font-semibold tabular-nums">
                                    {formatRupiah(
                                        transaksi.layanan.harga_satuan,
                                    )}
                                    /{transaksi.layanan.satuan}
                                </span>
                                , namun transaksi ini tetap dikunci
                                menggunakan tarif saat nota diterbitkan sebesar{' '}
                                <span className="font-mono font-semibold tabular-nums">
                                    {formatRupiah(
                                        transaksi.harga_satuan_snapshot,
                                    )}
                                    /{transaksi.layanan.satuan}
                                </span>
                                .
                            </p>
                        </div>
                    )}

                    {transaksi.status_transaksi === 'DIBATALKAN' && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-xs text-[#9F1239]">
                            <XCircle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                aria-hidden="true"
                            />
                            <p>
                                <span className="font-semibold">
                                    Transaksi Dibatalkan (KK-08):
                                </span>{' '}
                                {hasBiayaPembatalan
                                    ? `Pembatalan dilakukan setelah pencucian dimulai dengan biaya proses ${formatRupiah(transaksi.biaya_pembatalan)}.`
                                    : 'Pembatalan dilakukan pada tahap DITERIMA tanpa biaya proses (voucher dilepas apabila digunakan).'}
                            </p>
                        </div>
                    )}

                    {transaksi.insiden_pending_count > 0 && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-4 py-3 text-xs text-[#78350F]">
                            <AlertTriangle
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                aria-hidden="true"
                            />
                            <p>
                                <span className="font-semibold">
                                    Perlu Konfirmasi Kompensasi:
                                </span>{' '}
                                Terdapat{' '}
                                <strong>
                                    {transaksi.insiden_pending_count}
                                </strong>{' '}
                                laporan kerusakan/kehilangan dari pegawai
                                produksi yang menunggu persetujuan dan
                                pemotongan saldo oleh Petugas.
                            </p>
                        </div>
                    )}

                    {hasKompensasi && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 border-l-4 border-l-[#4338CA] bg-[#EEF2FF] px-4 py-3 text-xs text-[#3730A3]">
                            <Info
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#4338CA]"
                                aria-hidden="true"
                            />
                            <p>
                                <span className="font-semibold">
                                    Kompensasi Insiden Terkonfirmasi:
                                </span>{' '}
                                Total potongan kompensasi sebesar{' '}
                                <strong className="font-mono tabular-nums">
                                    {formatRupiah(transaksi.total_kompensasi)}
                                </strong>{' '}
                                telah diterapkan ke saldo tagihan nota ini.
                            </p>
                        </div>
                    )}

                    {hasTotalPengembalian && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] px-4 py-3 text-xs text-[#065F46]">
                            <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">
                                    Dana Pengembalian ke Pelanggan:{' '}
                                    <span className="font-mono tabular-nums">
                                        {formatRupiah(
                                            transaksi.total_pengembalian_pelanggan,
                                        )}
                                    </span>
                                </p>
                                <p className="mt-1">
                                    Rincian kas yang wajib dikembalikan:{' '}
                                    {hasKelebihanBayarTunai && (
                                        <span>
                                            Kelebihan bayar tunai{' '}
                                            <strong className="font-mono tabular-nums">
                                                {formatRupiah(
                                                    transaksi.kelebihan_bayar_tunai,
                                                )}
                                            </strong>
                                        </span>
                                    )}
                                    {hasKelebihanBayarTunai &&
                                        hasKelebihanGantiRugi &&
                                        ' + '}
                                    {hasKelebihanGantiRugi && (
                                        <span>
                                            Kelebihan ganti rugi insiden{' '}
                                            <strong className="font-mono tabular-nums">
                                                {formatRupiah(
                                                    transaksi.total_kelebihan_ganti_rugi,
                                                )}
                                            </strong>
                                        </span>
                                    )}
                                    .
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Info Grid: Pelanggan (5 col) + Rincian Biaya (7 col) */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
                <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)] lg:col-span-5">
                    <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                        Identitas Pelanggan &amp; Penerimaan
                    </h2>
                    <dl className="mt-4 space-y-3 text-xs">
                        <div className="flex justify-between gap-4">
                            <dt className="text-[#5B697A]">Nama Pelanggan</dt>
                            <dd className="text-right font-semibold text-[#0F172A]">
                                {transaksi.pelanggan.nama}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-[#5B697A]">No. Telepon</dt>
                            <dd className="text-right font-mono tabular-nums text-[#0F172A]">
                                {transaksi.pelanggan.no_telepon}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-[#5B697A]">Alamat</dt>
                            <dd className="max-w-xs text-right text-[#475569]">
                                {transaksi.pelanggan.alamat}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <dt className="text-[#5B697A]">Hak Bayar Akhir</dt>
                            <dd>
                                <PayLaterBadge
                                    allowed={
                                        transaksi.pelanggan.boleh_bayar_akhir
                                    }
                                    variant={
                                        transaksi.pelanggan.boleh_bayar_akhir
                                            ? 'badge'
                                            : 'text'
                                    }
                                />
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-[#D8E2E6] pt-3">
                            <dt className="text-[#5B697A]">Petugas Penerima</dt>
                            <dd className="text-right font-semibold text-[#0F172A]">
                                {transaksi.petugas.nama_petugas}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-[#5B697A]">
                                Tanggal Penerimaan
                            </dt>
                            <dd className="text-right tabular-nums text-[#475569]">
                                {formatTanggal(transaksi.tanggal_penerimaan, {
                                    withTime: true,
                                })}
                            </dd>
                        </div>
                        {transaksi.diambil_pada && (
                            <div className="flex justify-between gap-4">
                                <dt className="text-[#5B697A]">Diambil Pada</dt>
                                <dd className="text-right tabular-nums text-[#475569]">
                                    {formatTanggal(transaksi.diambil_pada, {
                                        withTime: true,
                                    })}
                                </dd>
                            </div>
                        )}
                        <div className="border-t border-[#D8E2E6] pt-3">
                            <dt className="text-[#5B697A]">Catatan Khusus</dt>
                            <dd className="mt-1.5 rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3 text-[#475569]">
                                {transaksi.catatan_khusus ??
                                    'Tidak ada catatan.'}
                            </dd>
                        </div>
                    </dl>
                </section>

                <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)] lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                            Layanan &amp; Ringkasan Tagihan
                        </h2>
                        <MetadataRow
                            items={[
                                <span
                                    key="layanan"
                                    className="font-semibold text-[#0F172A]"
                                >
                                    {transaksi.layanan.nama_layanan}
                                </span>,
                                <SpeedTierBadge
                                    key="speed"
                                    tier={transaksi.layanan.tingkat_kecepatan}
                                    variant="text"
                                />,
                            ]}
                        />
                    </div>

                    <dl className="mt-4 space-y-2.5 text-sm">
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-[#5B697A]">
                                Kuantitas ({transaksi.layanan.metode_hitung})
                            </dt>
                            <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                {transaksi.berat_atau_jumlah}{' '}
                                {transaksi.layanan.satuan}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-[#5B697A]">
                                Tarif Snapshot Nota
                            </dt>
                            <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                {formatRupiah(transaksi.harga_satuan_snapshot)}/
                                {transaksi.layanan.satuan}
                                {hasSnapshotTariffDifference && (
                                    <span className="ml-2 text-[11px] font-normal text-[#5B697A] line-through">
                                        Master:{' '}
                                        {formatRupiah(
                                            transaksi.layanan.harga_satuan,
                                        )}
                                    </span>
                                )}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-[#D8E2E6] pt-2.5 text-xs">
                            <dt className="text-[#5B697A]">Subtotal Layanan</dt>
                            <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                {formatRupiah(transaksi.subtotal_layanan)}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-[#5B697A]">
                                Potongan Voucher{' '}
                                {transaksi.voucher && (
                                    <span className="ml-1 rounded bg-[#ECFDF5] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#065F46] ring-1 ring-emerald-200">
                                        {transaksi.voucher.nomor_voucher}
                                    </span>
                                )}
                            </dt>
                            <dd className="font-mono font-semibold tabular-nums text-[#065F46]">
                                -{formatRupiah(transaksi.nilai_voucher_snapshot)}
                            </dd>
                        </div>
                        {hasKompensasi && (
                            <div className="flex justify-between gap-4 text-xs">
                                <dt className="text-[#5B697A]">
                                    Total Kompensasi
                                </dt>
                                <dd className="font-mono font-semibold tabular-nums text-[#065F46]">
                                    -{formatRupiah(transaksi.total_kompensasi)}
                                </dd>
                            </div>
                        )}
                        {hasBiayaPembatalan && (
                            <div className="flex justify-between gap-4 text-xs">
                                <dt className="text-[#5B697A]">
                                    Biaya Pembatalan
                                </dt>
                                <dd className="font-mono font-semibold tabular-nums text-[#9F1239]">
                                    +{formatRupiah(transaksi.biaya_pembatalan)}
                                </dd>
                            </div>
                        )}
                        <div className="flex justify-between gap-4 border-t border-[#D8E2E6] pt-3">
                            <dt className="font-bold text-[#0F172A]">
                                Total Tagihan
                            </dt>
                            <dd className="font-mono text-base font-bold tabular-nums text-[#0F172A]">
                                {formatRupiah(transaksi.total_harga)}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 text-xs">
                            <dt className="text-[#5B697A]">Total Dibayar</dt>
                            <dd className="font-mono font-semibold tabular-nums text-[#0F766E]">
                                {formatRupiah(transaksi.total_dibayar)}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-[#D8E2E6] pt-2.5">
                            <dt className="text-sm font-bold text-[#0F172A]">
                                Sisa Tagihan
                            </dt>
                            <dd
                                className={`font-mono text-base font-bold tabular-nums ${
                                    hasSisaTagihan
                                        ? 'text-[#78350F]'
                                        : 'text-[#065F46]'
                                }`}
                            >
                                {formatRupiah(transaksi.sisa_tagihan)}
                            </dd>
                        </div>
                        {hasTotalPengembalian && (
                            <div className="rounded-xl border border-emerald-200 bg-[#ECFDF5] p-3 text-xs">
                                <div className="flex justify-between gap-4 font-bold text-[#065F46]">
                                    <dt>Total Pengembalian ke Pelanggan</dt>
                                    <dd className="font-mono tabular-nums">
                                        {formatRupiah(
                                            transaksi.total_pengembalian_pelanggan,
                                        )}
                                    </dd>
                                </div>
                                {hasKelebihanBayarTunai && (
                                    <div className="mt-1 flex justify-between gap-4 text-[#065F46]">
                                        <dt>Kelebihan Bayar Tunai</dt>
                                        <dd className="font-mono tabular-nums">
                                            {formatRupiah(
                                                transaksi.kelebihan_bayar_tunai,
                                            )}
                                        </dd>
                                    </div>
                                )}
                                {hasKelebihanGantiRugi && (
                                    <div className="mt-1 flex justify-between gap-4 text-[#065F46]">
                                        <dt>Kelebihan Ganti Rugi Insiden</dt>
                                        <dd className="font-mono tabular-nums">
                                            {formatRupiah(
                                                transaksi.total_kelebihan_ganti_rugi,
                                            )}
                                        </dd>
                                    </div>
                                )}
                            </div>
                        )}
                    </dl>
                </section>
            </div>

            {/* Rincian Pakaian */}
            <section className="mt-5 overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                <div className="flex items-center justify-between border-b border-[#D8E2E6] px-5 py-4">
                    <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                        Rincian Item Pakaian ({transaksi.detail_pakaian.length}{' '}
                        baris)
                    </h2>
                    <span className="text-xs font-semibold tabular-nums text-[#475569]">
                        Total {totalPotong} potong
                    </span>
                </div>
                <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby={pakaianCaptionId}
                    className="overflow-x-auto"
                >
                    <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                        <caption id={pakaianCaptionId} className="sr-only">
                            Daftar rincian item pakaian pada nota{' '}
                            {transaksi.nomor_nota}
                        </caption>
                        <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                            <tr>
                                <th scope="col" className="px-5 py-3">
                                    No.
                                </th>
                                <th scope="col" className="px-5 py-3">
                                    Jenis Pakaian
                                </th>
                                <th
                                    scope="col"
                                    className="px-5 py-3 text-right"
                                >
                                    Jumlah Potong
                                </th>
                                <th scope="col" className="px-5 py-3">
                                    Kondisi Awal
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D8E2E6]/70">
                            {transaksi.detail_pakaian.map((detail, idx) => (
                                <tr
                                    key={detail.id_detail}
                                    className="hover:bg-[#F8FAFC]"
                                >
                                    <td className="px-5 py-3 text-xs tabular-nums text-[#5B697A]">
                                        {idx + 1}
                                    </td>
                                    <th
                                        scope="row"
                                        className="px-5 py-3 text-left font-medium text-[#0F172A]"
                                    >
                                        {detail.jenis_pakaian}
                                    </th>
                                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
                                        {detail.jumlah_potong} pcs
                                    </td>
                                    <td className="px-5 py-3 text-xs text-[#475569]">
                                        {detail.kondisi_pakaian}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Middle Grid: Riwayat Pembayaran + Stepper & Timeline Produksi */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                    <div className="border-b border-[#D8E2E6] px-5 py-4">
                        <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                            Riwayat Pembayaran
                        </h2>
                    </div>
                    {transaksi.pembayaran.length === 0 ? (
                        <div className="p-5 text-xs text-[#5B697A]">
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
                            <table className="min-w-full divide-y divide-[#D8E2E6] text-left text-sm">
                                <caption
                                    id={pembayaranCaptionId}
                                    className="sr-only"
                                >
                                    Riwayat pembayaran uang muka dan pelunasan
                                    nota {transaksi.nomor_nota}
                                </caption>
                                <thead className="border-b border-[#D8E2E6] bg-[#F8FAFC] text-[0.6875rem] font-semibold uppercase tracking-wider text-[#475569]">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">
                                            Tanggal
                                        </th>
                                        <th scope="col" className="px-5 py-3">
                                            Jenis
                                        </th>
                                        <th scope="col" className="px-5 py-3">
                                            Petugas
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-right"
                                        >
                                            Nominal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D8E2E6]/70">
                                    {transaksi.pembayaran.map((bayar) => (
                                        <tr
                                            key={bayar.id_pembayaran}
                                            className="hover:bg-[#F8FAFC]"
                                        >
                                            <th
                                                scope="row"
                                                className="whitespace-nowrap px-5 py-3 text-left text-xs font-normal tabular-nums text-[#475569]"
                                            >
                                                {formatTanggal(
                                                    bayar.tanggal_bayar,
                                                    { withTime: true },
                                                )}
                                            </th>
                                            <td className="whitespace-nowrap px-5 py-3">
                                                <PaymentTypeBadge
                                                    type={bayar.jenis_bayar}
                                                />
                                            </td>
                                            <td className="px-5 py-3 text-xs text-[#475569]">
                                                {bayar.petugas?.nama_petugas ??
                                                    '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3 text-right font-mono font-semibold tabular-nums text-[#0F172A]">
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

                <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                    <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                        Riwayat &amp; Alur Tahap Produksi
                    </h2>
                    <p className="mt-1 text-xs text-[#5B697A]">
                        Tahapan layanan:{' '}
                        {transaksi.layanan.perlu_setrika
                            ? 'Termasuk tahap penyetrikaan'
                            : 'Tanpa tahap penyetrikaan'}
                    </p>

                    {/* Horizontal Stepper with Status Dots & Connecting Line */}
                    <ol className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3">
                        {orderedPipelineStages.map((tahap, index) => {
                            const isCurrent =
                                transaksi.tahap_produksi_terakhir ===
                                tahap.nama_tahap;
                            const isDone =
                                completedStages.has(tahap.nama_tahap) &&
                                !isCurrent;

                            return (
                                <Fragment key={tahap.id_tahap}>
                                    {index > 0 && (
                                        <li
                                            aria-hidden="true"
                                            className={`hidden h-0.5 w-4 rounded-full sm:block ${
                                                isDone || isCurrent
                                                    ? 'bg-[#047857]'
                                                    : 'bg-[#D8E2E6]'
                                            }`}
                                        />
                                    )}
                                    <li
                                        aria-current={
                                            isCurrent ? 'step' : undefined
                                        }
                                        className="flex items-center gap-1.5 text-xs"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                isCurrent
                                                    ? 'bg-[#0F766E] text-white ring-2 ring-[#CCFBF1]'
                                                    : isDone
                                                      ? 'bg-[#047857] text-white'
                                                      : 'border border-[#7C8C9D] bg-white text-[#5B697A]'
                                            }`}
                                        >
                                            {isDone ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                tahap.urutan
                                            )}
                                        </span>
                                        <span
                                            className={
                                                isCurrent
                                                    ? 'font-bold text-[#0F766E]'
                                                    : isDone
                                                      ? 'font-semibold text-[#065F46]'
                                                      : 'font-medium text-[#5B697A]'
                                            }
                                        >
                                            {formatTahapProduksi(
                                                tahap.nama_tahap,
                                            )}
                                        </span>
                                    </li>
                                </Fragment>
                            );
                        })}
                    </ol>

                    <ol className="mt-5 space-y-4 border-l-2 border-[#D8E2E6] pl-4">
                        {transaksi.riwayat_status_produksi.map((riwayat) => (
                            <li
                                key={riwayat.id_status_produksi}
                                className="relative"
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#0F766E] ring-4 ring-white"
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <ProductionStageBadge
                                        stage={riwayat.tahap_status}
                                    />
                                    <span className="text-[11px] tabular-nums text-[#5B697A]">
                                        {formatTanggal(riwayat.waktu_update, {
                                            withTime: true,
                                        })}
                                    </span>
                                </div>
                                {riwayat.catatan && (
                                    <p className="mt-1 text-xs text-[#475569]">
                                        {riwayat.catatan}
                                    </p>
                                )}
                                <p className="mt-0.5 text-[11px] text-[#5B697A]">
                                    {riwayat.pegawai
                                        ? `Pegawai: ${riwayat.pegawai.nama_pegawai}`
                                        : riwayat.id_pegawai !== null
                                          ? `Pegawai ID #${riwayat.id_pegawai}`
                                          : 'Dicatat saat penerimaan kasir'}
                                </p>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>

            {/* Daftar Insiden & Kompensasi */}
            <section className="mt-5 rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8E2E6] pb-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                                Daftar Insiden &amp; Kompensasi (
                                {transaksi.laporan_insiden.length})
                            </h2>
                            {transaksi.insiden_pending_count > 0 && (
                                <StatusBadge tone="amber">
                                    {transaksi.insiden_pending_count} Menunggu
                                    Konfirmasi
                                </StatusBadge>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#5B697A]">
                            Laporan kerusakan/kehilangan yang tertaut ke rincian
                            pakaian nota ini (KK-04, KK-05).
                        </p>
                    </div>
                    {canReportIncident && (
                        <button
                            type="button"
                            onClick={() => setInsidenModalOpen(true)}
                            className="inline-flex min-h-[2.375rem] items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-[#9F1239] transition hover:bg-rose-100"
                        >
                            + Laporkan Insiden
                        </button>
                    )}
                </div>

                {transaksi.laporan_insiden.length === 0 ? (
                    <p className="mt-4 text-xs text-[#5B697A]">
                        Belum ada laporan insiden kerusakan atau kehilangan pada
                        transaksi ini.
                    </p>
                ) : (
                    <div className="mt-4 space-y-3">
                        {transaksi.laporan_insiden.map((lap) => {
                            const isPending =
                                lap.status_konfirmasi === 'MENUNGGU_KONFIRMASI';
                            const hasExcess =
                                parseDecimalToCents(lap.kelebihan_ganti_rugi) >
                                0;

                            return (
                                <div
                                    key={lap.id_laporan}
                                    className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-4 text-xs"
                                >
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono font-bold text-[#475569]">
                                                    #{lap.id_laporan}
                                                </span>
                                                <JenisInsidenBadge
                                                    jenis={lap.jenis_insiden}
                                                />
                                                <StatusKonfirmasiBadge
                                                    status={
                                                        lap.status_konfirmasi
                                                    }
                                                />
                                                <span className="font-semibold text-[#0F172A]">
                                                    {
                                                        lap.detail_pakaian
                                                            .jenis_pakaian
                                                    }{' '}
                                                    (
                                                    {
                                                        lap.detail_pakaian
                                                            .jumlah_potong
                                                    }{' '}
                                                    pcs)
                                                </span>
                                            </div>
                                            <p className="text-[#475569]">
                                                {lap.keterangan}
                                            </p>
                                            <p className="text-[11px] text-[#5B697A]">
                                                Pelapor:{' '}
                                                {lap.pegawai_pelapor
                                                    ?.nama_pegawai ??
                                                    'Langsung oleh Petugas'}{' '}
                                                &bull; Konfirmator:{' '}
                                                {lap.petugas?.nama_petugas ??
                                                    'Belum dikonfirmasi'}{' '}
                                                &bull;{' '}
                                                {formatTanggal(lap.created_at, {
                                                    withTime: true,
                                                })}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-start gap-2 sm:items-end">
                                            <div className="text-left sm:text-right">
                                                <p className="text-[11px] text-[#5B697A]">
                                                    Estimasi:{' '}
                                                    <span className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                                        {formatRupiah(
                                                            lap.estimasi_kompensasi,
                                                        )}
                                                    </span>
                                                </p>
                                                <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#0F172A]">
                                                    {isPending
                                                        ? 'Menunggu persetujuan'
                                                        : `Kompensasi: ${formatRupiah(lap.nilai_kompensasi)}`}
                                                </p>
                                                {hasExcess && (
                                                    <p className="mt-1 inline-block rounded-md bg-[#FFFBEB] px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-[#78350F] ring-1 ring-amber-300">
                                                        Ganti rugi tunai:{' '}
                                                        {formatRupiah(
                                                            lap.kelebihan_ganti_rugi,
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                            {isPending && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenKonfirmasi(
                                                            lap,
                                                        )
                                                    }
                                                    className="inline-flex min-h-[2.375rem] items-center justify-center rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800"
                                                >
                                                    Konfirmasi &amp; Potong
                                                    Saldo
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Riwayat Pengantaran Kurir */}
            <section className="mt-5 rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8E2E6] pb-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                                Riwayat Pengantaran (
                                {transaksi.riwayat_pengantaran.length})
                            </h2>
                            {transaksi.pengantaran_aktif && (
                                <ItemPengantaranStatusBadge
                                    status={
                                        transaksi.pengantaran_aktif
                                            .status_terima_pelanggan
                                    }
                                />
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#5B697A]">
                            Jejak penjadwalan kurir multi-pelanggan dan
                            penjadwalan ulang independen (KK-07).
                        </p>
                    </div>
                    <Link
                        href="/pengantaran"
                        className="inline-flex min-h-[2.25rem] items-center gap-1 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
                    >
                        <span>Kelola Pengantaran</span>
                        <ArrowRight
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                        />
                    </Link>
                </div>

                {transaksi.riwayat_pengantaran.length === 0 ? (
                    <p className="mt-4 text-xs text-[#5B697A]">
                        Transaksi ini belum pernah dijadwalkan untuk
                        pengantaran kurir.
                    </p>
                ) : (
                    <ol className="mt-4 space-y-3">
                        {transaksi.riwayat_pengantaran.map((item) => {
                            const isActive =
                                transaksi.pengantaran_aktif?.id_item_antar ===
                                item.id_item_antar;

                            return (
                                <li
                                    key={item.id_item_antar}
                                    className={`rounded-xl border p-4 text-xs ${
                                        isActive
                                            ? 'border-teal-200 bg-[#F0FDFA]'
                                            : 'border-[#D8E2E6] bg-[#F8FAFC]'
                                    }`}
                                >
                                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.pengantaran ? (
                                                <Link
                                                    href={`/pengantaran/${item.pengantaran.id_pengantaran}`}
                                                    className="font-mono font-bold text-[#0F766E] hover:text-[#115E59] hover:underline"
                                                >
                                                    Sesi #
                                                    {
                                                        item.pengantaran
                                                            .id_pengantaran
                                                    }
                                                </Link>
                                            ) : (
                                                <span className="font-mono font-bold text-[#475569]">
                                                    Sesi #{item.id_pengantaran}
                                                </span>
                                            )}
                                            <ItemPengantaranStatusBadge
                                                status={
                                                    item.status_terima_pelanggan
                                                }
                                            />
                                            {item.pengantaran && (
                                                <PengantaranStatusBadge
                                                    status={
                                                        item.pengantaran
                                                            .status_pengantaran
                                                    }
                                                />
                                            )}
                                            {isActive && (
                                                <span className="text-[11px] font-bold text-[#0F766E]">
                                                    Sesi Aktif
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] tabular-nums text-[#5B697A]">
                                            Update:{' '}
                                            {formatTanggal(item.waktu_update, {
                                                withTime: true,
                                            })}
                                        </span>
                                    </div>

                                    {item.pengantaran && (
                                        <p className="mt-1.5 text-[#475569]">
                                            Kurir:{' '}
                                            <strong className="text-[#0F172A]">
                                                {
                                                    item.pengantaran
                                                        .nama_petugas_antar
                                                }
                                            </strong>{' '}
                                            &bull; Tanggal Jadwal:{' '}
                                            {formatTanggal(
                                                item.pengantaran
                                                    .tanggal_pengantaran,
                                            )}
                                        </p>
                                    )}

                                    {item.alasan_gagal && (
                                        <p className="mt-2 rounded-lg border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-3 py-2 text-[#9F1239]">
                                            <strong>Alasan gagal:</strong>{' '}
                                            {item.alasan_gagal}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                )}
            </section>

            {/* Audit Trail Transaksi (Ringan & Bebas Pill Tebal) */}
            <section className="mt-5 rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)]">
                <div className="border-b border-[#D8E2E6] pb-4">
                    <h2 className="text-base font-bold tracking-tight text-[#0F172A]">
                        Audit Trail Transaksi ({auditLogs.length})
                    </h2>
                    <p className="mt-0.5 text-xs text-[#5B697A]">
                        Jejak kronologis seluruh mutasi transaksi, timbang ulang,
                        ubah layanan, pembatalan, dan kompensasi.
                    </p>
                </div>

                {auditLogs.length === 0 ? (
                    <p className="mt-4 text-xs text-[#5B697A]">
                        Belum ada catatan audit untuk transaksi ini.
                    </p>
                ) : (
                    <ol className="mt-4 space-y-3">
                        {auditLogs.map((log) => {
                            const highlights = summarizeAuditLog(log);

                            return (
                                <li
                                    key={log.id}
                                    className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-4 text-xs"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                            <span className="font-bold text-[#0F172A]">
                                                {formatAuditAction(log.action)}
                                            </span>
                                            <span className="font-mono text-[11px] font-medium text-[#5B697A]">
                                                {log.action}
                                            </span>
                                            <RoleBadge role={log.actor_role} />
                                            <span className="text-[#475569]">
                                                oleh{' '}
                                                <strong className="text-[#0F172A]">
                                                    {log.user?.name ?? 'Sistem'}
                                                </strong>
                                            </span>
                                        </div>
                                        <span className="text-[11px] tabular-nums text-[#5B697A]">
                                            {formatTanggal(log.created_at, {
                                                withTime: true,
                                            })}
                                        </span>
                                    </div>

                                    {highlights.length > 0 && (
                                        <MetadataRow
                                            className="mt-2"
                                            items={highlights}
                                        />
                                    )}

                                    {(log.payload_before !== null ||
                                        log.payload_after !== null) && (
                                        <details className="mt-2.5">
                                            <summary className="cursor-pointer text-[11px] font-semibold text-[#0F766E] hover:text-[#115E59] hover:underline">
                                                Lihat detail payload JSON
                                            </summary>
                                            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                {log.payload_before !== null && (
                                                    <div>
                                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5B697A]">
                                                            Sebelum
                                                        </p>
                                                        <pre className="overflow-x-auto rounded-lg border border-[#D8E2E6] bg-white p-2.5 font-mono text-[11px] text-[#475569]">
                                                            {JSON.stringify(
                                                                log.payload_before,
                                                                null,
                                                                2,
                                                            )}
                                                        </pre>
                                                    </div>
                                                )}
                                                {log.payload_after !== null && (
                                                    <div>
                                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#5B697A]">
                                                            Sesudah
                                                        </p>
                                                        <pre className="overflow-x-auto rounded-lg border border-[#D8E2E6] bg-white p-2.5 font-mono text-[11px] text-[#475569]">
                                                            {JSON.stringify(
                                                                log.payload_after,
                                                                null,
                                                                2,
                                                            )}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </details>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                )}
            </section>

            {/* Modal Ubah Layanan (KK-02) */}
            <Modal
                open={ubahModalOpen}
                onClose={closeUbahModal}
                closeDisabled={ubahForm.processing}
                maxWidth="lg"
                title="Ubah Layanan Transaksi (KK-02)"
                subtitle={`Nota ${transaksi.nomor_nota} — Tahap saat ini: ${transaksi.tahap_produksi_terakhir ?? '-'}`}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeUbahModal}
                            disabled={ubahForm.processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form={ubahFormId}
                            disabled={
                                ubahForm.processing ||
                                eligibleLayananOptions.length === 0
                            }
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {ubahForm.processing
                                ? 'Memproses...'
                                : 'Simpan Perubahan Layanan'}
                        </button>
                    </>
                }
            >
                {eligibleLayananOptions.length === 0 ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] p-4 text-xs text-[#78350F]">
                        <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                            aria-hidden="true"
                        />
                        <p>
                            Tidak ada layanan aktif lain yang kompatibel dengan
                            tahap produksi saat ini (
                            <strong>
                                {transaksi.tahap_produksi_terakhir}
                            </strong>
                            ).
                        </p>
                    </div>
                ) : (
                    <form
                        id={ubahFormId}
                        onSubmit={handleUbahSubmit}
                        className="space-y-4"
                    >
                        <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-3.5 py-2.5 text-xs">
                            <p className="text-[#5B697A]">Layanan Saat Ini:</p>
                            <p className="mt-0.5 font-semibold text-[#0F172A]">
                                {transaksi.layanan.nama_layanan} (
                                {transaksi.layanan.tingkat_kecepatan}) &bull;{' '}
                                <span className="font-mono tabular-nums">
                                    {transaksi.berat_atau_jumlah}{' '}
                                    {transaksi.layanan.satuan} &times;{' '}
                                    {formatRupiah(
                                        transaksi.harga_satuan_snapshot,
                                    )}
                                </span>
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor={ubahLayananSelectId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Layanan Tujuan Baru{' '}
                                <span
                                    aria-hidden="true"
                                    className="text-rose-600"
                                >
                                    *
                                </span>
                            </label>
                            <select
                                id={ubahLayananSelectId}
                                name="id_layanan_baru"
                                required
                                autoFocus
                                value={ubahForm.data.id_layanan_baru}
                                onChange={(event) => {
                                    const nextId = event.target.value;
                                    const nextOpt =
                                        eligibleLayananOptions.find(
                                            (opt) =>
                                                String(opt.id_layanan) ===
                                                nextId,
                                        );
                                    const changingMethod = nextOpt
                                        ? nextOpt.metode_hitung !==
                                          transaksi.layanan.metode_hitung
                                        : false;
                                    ubahForm.setData((prev) => ({
                                        ...prev,
                                        id_layanan_baru: nextId,
                                        berat_atau_jumlah_baru: changingMethod
                                            ? ''
                                            : prev.berat_atau_jumlah_baru,
                                    }));
                                }}
                                aria-invalid={Boolean(
                                    ubahForm.errors.id_layanan_baru,
                                )}
                                aria-describedby={
                                    ubahForm.errors.id_layanan_baru
                                        ? ubahLayananErrId
                                        : undefined
                                }
                                className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            >
                                {eligibleLayananOptions.map((option) => (
                                    <option
                                        key={option.id_layanan}
                                        value={option.id_layanan}
                                    >
                                        {option.nama_layanan} (
                                        {option.tingkat_kecepatan}) —{' '}
                                        {formatRupiah(option.harga_satuan)}/
                                        {option.satuan} ({option.metode_hitung})
                                    </option>
                                ))}
                            </select>
                            {ubahForm.errors.id_layanan_baru && (
                                <p
                                    id={ubahLayananErrId}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {ubahForm.errors.id_layanan_baru}
                                </p>
                            )}
                        </div>

                        {selectedNewLayanan && (
                            <div>
                                <label
                                    htmlFor={ubahQtyInputId}
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    {isMethodChanging
                                        ? `Kuantitas Baru (${selectedNewLayanan.satuan}) — Wajib karena pindah ${transaksi.layanan.metode_hitung} → ${selectedNewLayanan.metode_hitung}`
                                        : `Kuantitas Baru (${selectedNewLayanan.satuan}) — Opsional`}
                                    {isMethodChanging && (
                                        <span
                                            aria-hidden="true"
                                            className="ml-1 text-rose-600"
                                        >
                                            *
                                        </span>
                                    )}
                                </label>
                                <input
                                    id={ubahQtyInputId}
                                    name="berat_atau_jumlah_baru"
                                    type="number"
                                    required={isMethodChanging}
                                    min={
                                        selectedNewLayanan.metode_hitung ===
                                        'JUMLAH'
                                            ? '1'
                                            : '0.01'
                                    }
                                    max="99999.99"
                                    step={
                                        selectedNewLayanan.metode_hitung ===
                                        'JUMLAH'
                                            ? '1'
                                            : '0.01'
                                    }
                                    inputMode={
                                        selectedNewLayanan.metode_hitung ===
                                        'JUMLAH'
                                            ? 'numeric'
                                            : 'decimal'
                                    }
                                    value={ubahForm.data.berat_atau_jumlah_baru}
                                    onChange={(event) =>
                                        ubahForm.setData(
                                            'berat_atau_jumlah_baru',
                                            event.target.value,
                                        )
                                    }
                                    placeholder={
                                        isMethodChanging
                                            ? `Masukkan jumlah (${selectedNewLayanan.satuan})`
                                            : `Kosongkan untuk tetap ${transaksi.berat_atau_jumlah} ${selectedNewLayanan.satuan}`
                                    }
                                    aria-invalid={Boolean(
                                        ubahForm.errors.berat_atau_jumlah_baru,
                                    )}
                                    aria-describedby={
                                        ubahForm.errors.berat_atau_jumlah_baru
                                            ? ubahQtyErrId
                                            : undefined
                                    }
                                    className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-[#0F172A] placeholder-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                />
                                {ubahForm.errors.berat_atau_jumlah_baru && (
                                    <p
                                        id={ubahQtyErrId}
                                        role="alert"
                                        className="mt-1.5 text-xs font-medium text-rose-600"
                                    >
                                        {ubahForm.errors.berat_atau_jumlah_baru}
                                    </p>
                                )}
                            </div>
                        )}

                        {selectedNewLayanan && (
                            <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs">
                                <p className="font-semibold text-[#0F172A]">
                                    Pratinjau Penyesuaian Tarif (Snapshot Baru
                                    KK-09)
                                </p>
                                <dl className="mt-2 space-y-1">
                                    <div className="flex justify-between">
                                        <dt className="text-[#5B697A]">
                                            Tarif Snapshot Baru
                                        </dt>
                                        <dd className="font-mono font-semibold tabular-nums text-[#0F172A]">
                                            {formatRupiah(
                                                selectedNewLayanan.harga_satuan,
                                            )}
                                            /{selectedNewLayanan.satuan}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-[#5B697A]">
                                            Estimasi Total Baru
                                        </dt>
                                        <dd className="font-mono font-bold tabular-nums text-[#0F172A]">
                                            {formatRupiah(
                                                centsToDecimalString(
                                                    ubahTotalBaruCents,
                                                ),
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-[#5B697A]">
                                            Selisih Tagihan
                                        </dt>
                                        <dd
                                            className={`font-mono font-bold tabular-nums ${
                                                ubahSelisihCents > 0
                                                    ? 'text-[#9F1239]'
                                                    : ubahSelisihCents < 0
                                                      ? 'text-[#065F46]'
                                                      : 'text-[#475569]'
                                            }`}
                                        >
                                            {ubahSelisihCents > 0 ? '+' : ''}
                                            {formatRupiah(
                                                centsToDecimalString(
                                                    ubahSelisihCents,
                                                ),
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                {ubahWillDowngradeLunas && (
                                    <p className="mt-2 rounded-lg border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-2.5 py-1.5 text-[11px] font-medium text-[#78350F]">
                                        Tagihan baru melebihi total dibayar
                                        sehingga status pembayaran akan turun
                                        dari LUNAS menjadi BELUM_LUNAS.
                                    </p>
                                )}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor={ubahAlasanId}
                                className="block text-xs font-semibold text-[#0F172A]"
                            >
                                Alasan Perubahan Layanan{' '}
                                <span
                                    aria-hidden="true"
                                    className="text-rose-600"
                                >
                                    *
                                </span>
                            </label>
                            <textarea
                                id={ubahAlasanId}
                                name="alasan_perubahan"
                                required
                                minLength={3}
                                maxLength={500}
                                rows={2}
                                value={ubahForm.data.alasan_perubahan}
                                onChange={(event) =>
                                    ubahForm.setData(
                                        'alasan_perubahan',
                                        event.target.value,
                                    )
                                }
                                placeholder="mis. Pelanggan meminta upgrade ke layanan Express..."
                                aria-invalid={Boolean(
                                    ubahForm.errors.alasan_perubahan,
                                )}
                                aria-describedby={
                                    ubahForm.errors.alasan_perubahan
                                        ? ubahAlasanErrId
                                        : undefined
                                }
                                className="mt-1.5 block min-h-[4.25rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                            />
                            {ubahForm.errors.alasan_perubahan && (
                                <p
                                    id={ubahAlasanErrId}
                                    role="alert"
                                    className="mt-1.5 text-xs font-medium text-rose-600"
                                >
                                    {ubahForm.errors.alasan_perubahan}
                                </p>
                            )}
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal Batalkan Transaksi (KK-08) */}
            <Modal
                open={batalModalOpen}
                onClose={closeBatalModal}
                closeDisabled={batalForm.processing}
                maxWidth="lg"
                title="Batalkan Transaksi (KK-08)"
                subtitle={`Nota ${transaksi.nomor_nota} — Tahap saat ini: ${transaksi.tahap_produksi_terakhir ?? '-'}`}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={closeBatalModal}
                            disabled={batalForm.processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-[#7C8C9D] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] disabled:opacity-50"
                        >
                            Tutup
                        </button>
                        <button
                            type="submit"
                            form={batalFormId}
                            disabled={batalForm.processing}
                            className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-[#BE123C] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {batalForm.processing
                                ? 'Membatalkan...'
                                : 'Konfirmasi Pembatalan'}
                        </button>
                    </>
                }
            >
                <form
                    id={batalFormId}
                    onSubmit={handleBatalSubmit}
                    className="space-y-4"
                >
                    {!transaksi.perlu_biaya_pembatalan ? (
                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] px-4 py-3 text-xs text-[#065F46]">
                            <CheckCircle2
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                                aria-hidden="true"
                            />
                            <div>
                                <p className="font-bold">
                                    Pembatalan Gratis (Tahap DITERIMA — Sebelum
                                    Pencucian)
                                </p>
                                <p className="mt-1 leading-relaxed">
                                    Proses pencucian belum dimulai sehingga
                                    biaya pembatalan adalah{' '}
                                    <strong>Rp 0</strong> dan total tagihan
                                    menjadi <strong>Rp 0</strong>.
                                    {transaksi.voucher ? (
                                        <>
                                            {' '}
                                            Voucher{' '}
                                            <span className="font-mono font-semibold">
                                                {
                                                    transaksi.voucher
                                                        .nomor_voucher
                                                }
                                            </span>{' '}
                                            akan{' '}
                                            <strong>dilepas kembali</strong>{' '}
                                            menjadi <code>TERSEDIA</code> (atau{' '}
                                            <code>KEDALUWARSA</code> jika
                                            melewati masa berlaku).
                                        </>
                                    ) : (
                                        ' Tidak ada voucher tertaut pada nota ini.'
                                    )}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-4 py-3 text-xs text-[#78350F]">
                                <AlertTriangle
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="font-bold">
                                        Wajib Biaya Proses Berjalan (KK-08)
                                    </p>
                                    <p className="mt-1 leading-relaxed">
                                        Transaksi sudah memasuki tahap{' '}
                                        <strong>
                                            {transaksi.tahap_produksi_terakhir}
                                        </strong>{' '}
                                        sehingga pembatalan gratis{' '}
                                        <strong>ditolak</strong>. Biaya proses
                                        default sebesar 50% dari subtotal
                                        layanan (
                                        <strong className="font-mono tabular-nums">
                                            {formatRupiah(
                                                transaksi.estimasi_biaya_pembatalan,
                                            )}
                                        </strong>
                                        ).{' '}
                                        {transaksi.voucher && (
                                            <>
                                                Voucher{' '}
                                                <span className="font-mono font-semibold">
                                                    {
                                                        transaksi.voucher
                                                            .nomor_voucher
                                                    }
                                                </span>{' '}
                                                tetap berstatus{' '}
                                                <strong>SUDAH_DIGUNAKAN</strong>
                                                .
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor={batalBiayaInputId}
                                    className="block text-xs font-semibold text-[#0F172A]"
                                >
                                    Biaya Pembatalan (Rp){' '}
                                    <span
                                        aria-hidden="true"
                                        className="text-rose-600"
                                    >
                                        *
                                    </span>
                                </label>
                                <input
                                    id={batalBiayaInputId}
                                    name="biaya_pembatalan"
                                    type="number"
                                    required
                                    min="0.01"
                                    max={transaksi.subtotal_layanan}
                                    step="0.01"
                                    inputMode="decimal"
                                    value={batalForm.data.biaya_pembatalan}
                                    onChange={(event) =>
                                        batalForm.setData(
                                            'biaya_pembatalan',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(
                                        batalForm.errors.biaya_pembatalan,
                                    )}
                                    aria-describedby={
                                        batalForm.errors.biaya_pembatalan
                                            ? batalBiayaErrId
                                            : undefined
                                    }
                                    className="mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                />
                                <p className="mt-1 text-[11px] text-[#5B697A]">
                                    Rentang sah: lebih dari Rp 0 s.d. subtotal{' '}
                                    <span className="font-mono tabular-nums">
                                        {formatRupiah(
                                            transaksi.subtotal_layanan,
                                        )}
                                    </span>
                                    .
                                </p>
                                {batalForm.errors.biaya_pembatalan && (
                                    <p
                                        id={batalBiayaErrId}
                                        role="alert"
                                        className="mt-1.5 text-xs font-medium text-rose-600"
                                    >
                                        {batalForm.errors.biaya_pembatalan}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <div className="rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] p-3.5 text-xs">
                        <p className="font-semibold text-[#0F172A]">
                            Ringkasan Dampak Pembatalan
                        </p>
                        <dl className="mt-2 space-y-1">
                            <div className="flex justify-between">
                                <dt className="text-[#5B697A]">
                                    Total Tagihan Pasca Batal
                                </dt>
                                <dd className="font-mono font-bold tabular-nums text-[#0F172A]">
                                    {formatRupiah(
                                        centsToDecimalString(
                                            batalTotalBaruCents,
                                        ),
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-[#5B697A]">
                                    Sudah Dibayar
                                </dt>
                                <dd className="font-mono font-semibold tabular-nums text-[#0F766E]">
                                    {formatRupiah(transaksi.total_dibayar)}
                                </dd>
                            </div>
                            {batalSisaBaruCents > 0 && (
                                <div className="flex justify-between text-[#78350F]">
                                    <dt className="font-semibold">
                                        Sisa Biaya Batal Harus Dibayar
                                    </dt>
                                    <dd className="font-mono font-bold tabular-nums">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                batalSisaBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                            )}
                            {batalKelebihanTunaiCents > 0 && (
                                <div className="flex justify-between text-[#065F46]">
                                    <dt className="font-semibold">
                                        Kelebihan Bayar Dikembalikan
                                    </dt>
                                    <dd className="font-mono font-bold tabular-nums">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                batalKelebihanTunaiCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    <div>
                        <label
                            htmlFor={batalAlasanId}
                            className="block text-xs font-semibold text-[#0F172A]"
                        >
                            Alasan Pembatalan{' '}
                            <span aria-hidden="true" className="text-rose-600">
                                *
                            </span>
                        </label>
                        <textarea
                            id={batalAlasanId}
                            name="alasan_pembatalan"
                            required
                            autoFocus={!transaksi.perlu_biaya_pembatalan}
                            minLength={3}
                            maxLength={500}
                            rows={2}
                            value={batalForm.data.alasan_pembatalan}
                            onChange={(event) =>
                                batalForm.setData(
                                    'alasan_pembatalan',
                                    event.target.value,
                                )
                            }
                            placeholder="Jelaskan alasan pembatalan transaksi (min. 3 karakter)..."
                            aria-invalid={Boolean(
                                batalForm.errors.alasan_pembatalan,
                            )}
                            aria-describedby={
                                batalForm.errors.alasan_pembatalan
                                    ? batalAlasanErrId
                                    : undefined
                            }
                            className="mt-1.5 block min-h-[4.25rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#5B697A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                        />
                        {batalForm.errors.alasan_pembatalan && (
                            <p
                                id={batalAlasanErrId}
                                role="alert"
                                className="mt-1.5 text-xs font-medium text-rose-600"
                            >
                                {batalForm.errors.alasan_pembatalan}
                            </p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Modal Lapor Insiden (Mode Petugas langsung terkonfirmasi) */}
            <LaporkanInsidenModal
                open={insidenModalOpen}
                onClose={() => setInsidenModalOpen(false)}
                role={auth.user?.role}
                submitMode="transaksi"
                fixedTransaksi={toEligibleInsidenOption(transaksi)}
            />

            {/* Modal Konfirmasi & Potong Saldo Kompensasi */}
            <KonfirmasiKompensasiModal
                target={konfirmasiTarget}
                onClose={() => setKonfirmasiTarget(null)}
            />

            {/* Modal Pelunasan Tagihan */}
            <PelunasanModal
                target={pelunasanModalOpen ? transaksi : null}
                onClose={() => setPelunasanModalOpen(false)}
                redirectTo="transaksi.show"
            />

            {/* Modal Serah Terima Loket (KK-06) */}
            <SerahTerimaModal
                target={serahTerimaModalOpen ? transaksi : null}
                onClose={() => setSerahTerimaModalOpen(false)}
                onSwitchToPelunasan={() => setPelunasanModalOpen(true)}
                redirectTo="transaksi.show"
            />
        </AppLayout>
    );
}
