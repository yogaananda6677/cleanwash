import { Head, Link, useForm } from '@inertiajs/react';
import { useId, useState, type FormEvent } from 'react';
import KonfirmasiKompensasiModal, {
    type KonfirmasiKompensasiTarget,
} from '@/Components/KonfirmasiKompensasiModal';
import LaporkanInsidenModal from '@/Components/LaporkanInsidenModal';
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
                `Berat: ${String(before.berat_atau_jumlah)} kg \u2192 ${String(after.berat_atau_jumlah)} kg`,
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
                `Tahap: ${String(before.tahap_status)} \u2192 ${String(after.tahap_status)}`,
            );
        }
        if (after.catatan) {
            highlights.push(`Catatan: ${String(after.catatan)}`);
        }
    } else if (log.action === 'LAYANAN_CHANGED') {
        if (before.nama_layanan && after.nama_layanan) {
            highlights.push(
                `Layanan: ${String(before.nama_layanan)} \u2192 ${String(after.nama_layanan)}`,
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
        if (after.piutang_dicatat === true && after.sisa_tagihan !== undefined) {
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
                `Item antar: ${String(before.status_terima_pelanggan)} \u2192 ${String(after.status_terima_pelanggan)}`,
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
            `Status bayar: ${String(before.status_pembayaran)} \u2192 ${String(after.status_pembayaran)}`,
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
        if (!option.is_active || option.id_layanan === transaksi.layanan.id_layanan) {
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

            {/* Top Status Strip & Operational Actions */}
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
                            {transaksi.tahap_produksi_terakhir && (
                                <ProductionStageBadge
                                    stage={transaksi.tahap_produksi_terakhir}
                                />
                            )}
                            {transaksi.insiden_pending_count > 0 && (
                                <StatusBadge tone="amber">
                                    {transaksi.insiden_pending_count} Insiden
                                    Pending
                                </StatusBadge>
                            )}
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-xs text-slate-500">Sisa Tagihan</p>
                        <p className="text-2xl font-bold tabular-nums text-slate-900">
                            {formatRupiah(transaksi.sisa_tagihan)}
                        </p>
                    </div>
                </div>

                {(transaksi.bisa_pelunasan ||
                    transaksi.status_transaksi === 'SELESAI' ||
                    transaksi.bisa_ubah_layanan ||
                    transaksi.bisa_batalkan ||
                    canReportIncident) && (
                    <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
                        {transaksi.bisa_pelunasan && (
                            <button
                                type="button"
                                onClick={() => setPelunasanModalOpen(true)}
                                className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                            >
                                Catat Pelunasan
                            </button>
                        )}
                        {transaksi.status_transaksi === 'SELESAI' &&
                            !transaksi.sedang_diantar_kurir && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSerahTerimaModalOpen(true)
                                    }
                                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                                        transaksi.bisa_serah_terima_loket
                                            ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                                            : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                    }`}
                                >
                                    {transaksi.bisa_serah_terima_loket
                                        ? 'Serah Terima Loket'
                                        : 'Serah Terima Loket (Wajib Lunas KK-06)'}
                                </button>
                            )}
                        {transaksi.sedang_diantar_kurir &&
                            transaksi.pengantaran_aktif && (
                                <Link
                                    href={`/pengantaran/${transaksi.pengantaran_aktif.id_pengantaran}`}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-100"
                                >
                                    Sedang Diantar Kurir (
                                    {
                                        transaksi.pengantaran_aktif
                                            .status_terima_pelanggan
                                    }
                                    ) &rarr;
                                </Link>
                            )}
                        {transaksi.bisa_ubah_layanan && (
                            <button
                                type="button"
                                onClick={openUbahModal}
                                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100"
                            >
                                Ubah Layanan (KK-02)
                            </button>
                        )}
                        {canReportIncident && (
                            <button
                                type="button"
                                onClick={() => setInsidenModalOpen(true)}
                                className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                            >
                                Laporkan Insiden
                            </button>
                        )}
                        {transaksi.bisa_batalkan && (
                            <button
                                type="button"
                                onClick={openBatalModal}
                                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                                Batalkan Transaksi (KK-08)
                            </button>
                        )}
                    </div>
                )}

                {/* Phase 1, Phase 2 & Phase 3 Contextual Banners */}
                <div className="mt-4 space-y-2.5 empty:hidden">
                    {transaksi.sedang_diantar_kurir &&
                        transaksi.pengantaran_aktif && (
                            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-950">
                                <span className="font-semibold">
                                    Sedang Diantar Kurir:
                                </span>{' '}
                                Pakaian nota ini berada pada sesi pengantaran{' '}
                                <Link
                                    href={`/pengantaran/${transaksi.pengantaran_aktif.id_pengantaran}`}
                                    className="font-bold underline"
                                >
                                    #{transaksi.pengantaran_aktif.id_pengantaran}
                                </Link>{' '}
                                ({transaksi.pengantaran_aktif.pengantaran?.nama_petugas_antar ?? 'Kurir'}) berstatus{' '}
                                <strong>
                                    {
                                        transaksi.pengantaran_aktif
                                            .status_terima_pelanggan
                                    }
                                </strong>
                                . Serah terima di loket kasir diblokir hingga
                                pengantaran diselesaikan atau ditandai gagal.
                            </div>
                        )}

                    {transaksi.status_transaksi === 'SELESAI' &&
                        !transaksi.sedang_diantar_kurir &&
                        !transaksi.bisa_serah_terima_loket && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                                <span className="font-semibold">
                                    Penyerahan Memerlukan Pelunasan (KK-06):
                                </span>{' '}
                                Pelanggan tidak memiliki hak bayar akhir dan
                                masih memiliki sisa tagihan{' '}
                                <strong className="tabular-nums">
                                    {formatRupiah(transaksi.sisa_tagihan)}
                                </strong>
                                . Gunakan tombol <strong>Catat Pelunasan</strong>{' '}
                                terlebih dahulu sebelum serah terima.
                            </div>
                        )}

                    {hasSnapshotTariffDifference && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
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

                    {transaksi.status_transaksi === 'DIBATALKAN' && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
                            <span className="font-semibold">
                                Transaksi Dibatalkan (KK-08):
                            </span>{' '}
                            {hasBiayaPembatalan
                                ? `Pembatalan dilakukan setelah pencucian dimulai dengan biaya proses ${formatRupiah(transaksi.biaya_pembatalan)}.`
                                : 'Pembatalan dilakukan pada tahap DITERIMA tanpa biaya proses (voucher dilepas apabila digunakan).'}
                        </div>
                    )}

                    {transaksi.insiden_pending_count > 0 && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                            <span className="font-semibold">
                                Perlu Konfirmasi Kompensasi:
                            </span>{' '}
                            Terdapat{' '}
                            <strong>{transaksi.insiden_pending_count}</strong>{' '}
                            laporan kerusakan/kehilangan dari pegawai produksi
                            yang menunggu persetujuan dan pemotongan saldo oleh
                            Petugas.
                        </div>
                    )}

                    {hasKompensasi && (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-950">
                            <span className="font-semibold">
                                Kompensasi Insiden Terkonfirmasi:
                            </span>{' '}
                            Total potongan kompensasi sebesar{' '}
                            <strong className="tabular-nums">
                                {formatRupiah(transaksi.total_kompensasi)}
                            </strong>{' '}
                            telah diterapkan ke saldo tagihan nota ini.
                        </div>
                    )}

                    {hasTotalPengembalian && (
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
                            <p className="font-bold">
                                Dana Pengembalian ke Pelanggan:{' '}
                                <span className="tabular-nums">
                                    {formatRupiah(
                                        transaksi.total_pengembalian_pelanggan,
                                    )}
                                </span>
                            </p>
                            <p className="mt-1 text-emerald-900">
                                Rincian kas yang wajib dikembalikan:{' '}
                                {hasKelebihanBayarTunai && (
                                    <span>
                                        Kelebihan bayar tunai{' '}
                                        <strong className="tabular-nums">
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
                                        <strong className="tabular-nums">
                                            {formatRupiah(
                                                transaksi.total_kelebihan_ganti_rugi,
                                            )}
                                        </strong>
                                    </span>
                                )}
                                .
                            </p>
                        </div>
                    )}
                </div>
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
                                {transaksi.catatan_khusus ??
                                    'Tidak ada catatan.'}
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
                        {hasKompensasi && (
                            <div className="flex justify-between gap-4 text-xs">
                                <dt className="text-slate-500">
                                    Total Kompensasi
                                </dt>
                                <dd className="font-semibold tabular-nums text-emerald-700">
                                    -{formatRupiah(transaksi.total_kompensasi)}
                                </dd>
                            </div>
                        )}
                        {hasBiayaPembatalan && (
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
                        {hasTotalPengembalian && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
                                <div className="flex justify-between gap-4 font-bold text-emerald-900">
                                    <dt>Total Pengembalian ke Pelanggan</dt>
                                    <dd className="tabular-nums">
                                        {formatRupiah(
                                            transaksi.total_pengembalian_pelanggan,
                                        )}
                                    </dd>
                                </div>
                                {hasKelebihanBayarTunai && (
                                    <div className="mt-1 flex justify-between gap-4 text-emerald-800">
                                        <dt>Kelebihan Bayar Tunai</dt>
                                        <dd className="tabular-nums">
                                            {formatRupiah(
                                                transaksi.kelebihan_bayar_tunai,
                                            )}
                                        </dd>
                                    </div>
                                )}
                                {hasKelebihanGantiRugi && (
                                    <div className="mt-1 flex justify-between gap-4 text-emerald-800">
                                        <dt>Kelebihan Ganti Rugi Insiden</dt>
                                        <dd className="tabular-nums">
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
                <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby={pakaianCaptionId}
                    className="overflow-x-auto"
                >
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <caption id={pakaianCaptionId} className="sr-only">
                            Daftar rincian item pakaian pada nota{' '}
                            {transaksi.nomor_nota}
                        </caption>
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                        <tbody className="divide-y divide-slate-100">
                            {transaksi.detail_pakaian.map((detail, idx) => (
                                <tr key={detail.id_detail}>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {idx + 1}
                                    </td>
                                    <th
                                        scope="row"
                                        className="px-5 py-3 text-left font-medium text-slate-900"
                                    >
                                        {detail.jenis_pakaian}
                                    </th>
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

            {/* Middle Grid: Riwayat Pembayaran + Timeline Produksi */}
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
                        <div
                            tabIndex={0}
                            role="region"
                            aria-labelledby={pembayaranCaptionId}
                            className="overflow-x-auto"
                        >
                            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                                <caption
                                    id={pembayaranCaptionId}
                                    className="sr-only"
                                >
                                    Riwayat pembayaran uang muka dan pelunasan
                                    nota {transaksi.nomor_nota}
                                </caption>
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                        {orderedPipelineStages.map((tahap) => {
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
                                    {tahap.urutan}.{' '}
                                    {formatTahapProduksi(tahap.nama_tahap)}
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
                                <p className="mt-0.5 text-[11px] text-slate-500">
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
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900">
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
                        <p className="mt-0.5 text-xs text-slate-500">
                            Laporan kerusakan/kehilangan yang tertaut ke rincian
                            pakaian nota ini (KK-04, KK-05).
                        </p>
                    </div>
                    {canReportIncident && (
                        <button
                            type="button"
                            onClick={() => setInsidenModalOpen(true)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                            + Laporkan Insiden
                        </button>
                    )}
                </div>

                {transaksi.laporan_insiden.length === 0 ? (
                    <p className="mt-4 text-xs text-slate-500">
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
                                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
                                >
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono font-bold text-slate-700">
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
                                                <span className="font-semibold text-slate-900">
                                                    {
                                                        lap.detail_pakaian
                                                            .jenis_pakaian
                                                    }{' '}
                                                    ({lap.detail_pakaian.jumlah_potong}{' '}
                                                    pcs)
                                                </span>
                                            </div>
                                            <p className="text-slate-700">
                                                {lap.keterangan}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
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
                                                <p className="text-[11px] text-slate-500">
                                                    Estimasi:{' '}
                                                    <span className="font-semibold tabular-nums text-slate-700">
                                                        {formatRupiah(
                                                            lap.estimasi_kompensasi,
                                                        )}
                                                    </span>
                                                </p>
                                                <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                                                    {isPending
                                                        ? 'Menunggu persetujuan'
                                                        : `Kompensasi: ${formatRupiah(lap.nilai_kompensasi)}`}
                                                </p>
                                                {hasExcess && (
                                                    <p className="mt-1 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-900">
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
                                                    className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
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
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900">
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
                        <p className="mt-0.5 text-xs text-slate-500">
                            Jejak penjadwalan kurir multi-pelanggan dan
                            penjadwalan ulang independen (KK-07).
                        </p>
                    </div>
                    <Link
                        href="/pengantaran"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        Kelola Pengantaran &rarr;
                    </Link>
                </div>

                {transaksi.riwayat_pengantaran.length === 0 ? (
                    <p className="mt-4 text-xs text-slate-500">
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
                                            ? 'border-sky-200 bg-sky-50/60'
                                            : 'border-slate-200 bg-slate-50/70'
                                    }`}
                                >
                                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.pengantaran ? (
                                                <Link
                                                    href={`/pengantaran/${item.pengantaran.id_pengantaran}`}
                                                    className="font-mono font-bold text-sky-700 hover:underline"
                                                >
                                                    Sesi #
                                                    {
                                                        item.pengantaran
                                                            .id_pengantaran
                                                    }
                                                </Link>
                                            ) : (
                                                <span className="font-mono font-bold text-slate-700">
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
                                                <StatusBadge tone="sky">
                                                    Aktif
                                                </StatusBadge>
                                            )}
                                        </div>
                                        <span className="text-[11px] tabular-nums text-slate-500">
                                            Update:{' '}
                                            {formatTanggal(item.waktu_update, {
                                                withTime: true,
                                            })}
                                        </span>
                                    </div>

                                    {item.pengantaran && (
                                        <p className="mt-1.5 text-slate-600">
                                            Kurir:{' '}
                                            <strong className="text-slate-900">
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
                                        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-900">
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

            {/* Audit Trail Transaksi */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-sm font-bold text-slate-900">
                        Audit Trail Transaksi ({auditLogs.length})
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Jejak kronologis seluruh mutasi transaksi, timbang ulang,
                        ubah layanan, pembatalan, dan kompensasi.
                    </p>
                </div>

                {auditLogs.length === 0 ? (
                    <p className="mt-4 text-xs text-slate-500">
                        Belum ada catatan audit untuk transaksi ini.
                    </p>
                ) : (
                    <ol className="mt-4 space-y-3">
                        {auditLogs.map((log) => {
                            const highlights = summarizeAuditLog(log);

                            return (
                                <li
                                    key={log.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-900">
                                                {formatAuditAction(log.action)}
                                            </span>
                                            <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                                {log.action}
                                            </span>
                                            <RoleBadge role={log.actor_role} />
                                            <span className="text-slate-600">
                                                oleh{' '}
                                                <strong className="text-slate-900">
                                                    {log.user?.name ?? 'Sistem'}
                                                </strong>
                                            </span>
                                        </div>
                                        <span className="text-[11px] tabular-nums text-slate-500">
                                            {formatTanggal(log.created_at, {
                                                withTime: true,
                                            })}
                                        </span>
                                    </div>

                                    {highlights.length > 0 && (
                                        <ul className="mt-2 flex flex-wrap gap-2">
                                            {highlights.map((line, index) => (
                                                <li
                                                    key={`${log.id}-h-${index}`}
                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700"
                                                >
                                                    {line}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {(log.payload_before !== null ||
                                        log.payload_after !== null) && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-[11px] font-semibold text-sky-700 hover:underline">
                                                Lihat detail payload JSON
                                            </summary>
                                            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                {log.payload_before !== null && (
                                                    <div>
                                                        <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                                                            Sebelum
                                                        </p>
                                                        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-700">
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
                                                        <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                                                            Sesudah
                                                        </p>
                                                        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-700">
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
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {ubahForm.processing
                                ? 'Memproses...'
                                : 'Simpan Perubahan Layanan'}
                        </button>
                    </>
                }
            >
                {eligibleLayananOptions.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                        Tidak ada layanan aktif lain yang kompatibel dengan
                        tahap produksi saat ini (
                        <strong>{transaksi.tahap_produksi_terakhir}</strong>).
                    </div>
                ) : (
                    <form
                        id={ubahFormId}
                        onSubmit={handleUbahSubmit}
                        className="space-y-4"
                    >
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                            <p className="text-slate-500">Layanan Saat Ini:</p>
                            <p className="mt-0.5 font-semibold text-slate-900">
                                {transaksi.layanan.nama_layanan} (
                                {transaksi.layanan.tingkat_kecepatan}) &bull;{' '}
                                {transaksi.berat_atau_jumlah}{' '}
                                {transaksi.layanan.satuan} &times;{' '}
                                {formatRupiah(transaksi.harga_satuan_snapshot)}
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor={ubahLayananSelectId}
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Layanan Tujuan Baru{' '}
                                <span aria-hidden="true" className="text-rose-600">
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
                                    className="mt-1 text-xs font-medium text-rose-600"
                                >
                                    {ubahForm.errors.id_layanan_baru}
                                </p>
                            )}
                        </div>

                        {selectedNewLayanan && (
                            <div>
                                <label
                                    htmlFor={ubahQtyInputId}
                                    className="block text-xs font-semibold text-slate-700"
                                >
                                    {isMethodChanging
                                        ? `Kuantitas Baru (${selectedNewLayanan.satuan}) — Wajib karena pindah ${transaksi.layanan.metode_hitung} \u2192 ${selectedNewLayanan.metode_hitung}`
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
                                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                />
                                {ubahForm.errors.berat_atau_jumlah_baru && (
                                    <p
                                        id={ubahQtyErrId}
                                        role="alert"
                                        className="mt-1 text-xs font-medium text-rose-600"
                                    >
                                        {ubahForm.errors.berat_atau_jumlah_baru}
                                    </p>
                                )}
                            </div>
                        )}

                        {selectedNewLayanan && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                                <p className="font-semibold text-slate-800">
                                    Pratinjau Penyesuaian Tarif (Snapshot Baru
                                    KK-09)
                                </p>
                                <dl className="mt-2 space-y-1">
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">
                                            Tarif Snapshot Baru
                                        </dt>
                                        <dd className="font-semibold tabular-nums text-slate-900">
                                            {formatRupiah(
                                                selectedNewLayanan.harga_satuan,
                                            )}
                                            /{selectedNewLayanan.satuan}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">
                                            Estimasi Total Baru
                                        </dt>
                                        <dd className="font-bold tabular-nums text-slate-900">
                                            {formatRupiah(
                                                centsToDecimalString(
                                                    ubahTotalBaruCents,
                                                ),
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">
                                            Selisih Tagihan
                                        </dt>
                                        <dd
                                            className={`font-bold tabular-nums ${
                                                ubahSelisihCents > 0
                                                    ? 'text-rose-700'
                                                    : ubahSelisihCents < 0
                                                      ? 'text-emerald-700'
                                                      : 'text-slate-700'
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
                                    <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
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
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Alasan Perubahan Layanan{' '}
                                <span aria-hidden="true" className="text-rose-600">
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
                                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {ubahForm.errors.alasan_perubahan && (
                                <p
                                    id={ubahAlasanErrId}
                                    role="alert"
                                    className="mt-1 text-xs font-medium text-rose-600"
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
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            Tutup
                        </button>
                        <button
                            type="submit"
                            form={batalFormId}
                            disabled={batalForm.processing}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
                            <p className="font-bold">
                                Pembatalan Gratis (Tahap DITERIMA — Sebelum
                                Pencucian)
                            </p>
                            <p className="mt-1 leading-relaxed">
                                Proses pencucian belum dimulai sehingga biaya
                                pembatalan adalah <strong>Rp 0</strong> dan
                                total tagihan menjadi <strong>Rp 0</strong>.
                                {transaksi.voucher ? (
                                    <>
                                        {' '}
                                        Voucher{' '}
                                        <span className="font-mono font-semibold">
                                            {transaksi.voucher.nomor_voucher}
                                        </span>{' '}
                                        akan <strong>dilepas kembali</strong>{' '}
                                        menjadi <code>TERSEDIA</code> (atau{' '}
                                        <code>KEDALUWARSA</code> jika melewati
                                        masa berlaku).
                                    </>
                                ) : (
                                    ' Tidak ada voucher tertaut pada nota ini.'
                                )}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
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
                                    default sebesar 50% dari subtotal layanan (
                                    <strong className="tabular-nums">
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
                                            <strong>SUDAH_DIGUNAKAN</strong>.
                                        </>
                                    )}
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor={batalBiayaInputId}
                                    className="block text-xs font-semibold text-slate-700"
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
                                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                />
                                <p className="mt-1 text-[11px] text-slate-500">
                                    Rentang sah: lebih dari Rp 0 s.d. subtotal{' '}
                                    {formatRupiah(transaksi.subtotal_layanan)}.
                                </p>
                                {batalForm.errors.biaya_pembatalan && (
                                    <p
                                        id={batalBiayaErrId}
                                        role="alert"
                                        className="mt-1 text-xs font-medium text-rose-600"
                                    >
                                        {batalForm.errors.biaya_pembatalan}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                        <p className="font-semibold text-slate-800">
                            Ringkasan Dampak Pembatalan
                        </p>
                        <dl className="mt-2 space-y-1">
                            <div className="flex justify-between">
                                <dt className="text-slate-500">
                                    Total Tagihan Pasca Batal
                                </dt>
                                <dd className="font-bold tabular-nums text-slate-900">
                                    {formatRupiah(
                                        centsToDecimalString(
                                            batalTotalBaruCents,
                                        ),
                                    )}
                                </dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-slate-500">Sudah Dibayar</dt>
                                <dd className="font-semibold tabular-nums text-sky-700">
                                    {formatRupiah(transaksi.total_dibayar)}
                                </dd>
                            </div>
                            {batalSisaBaruCents > 0 && (
                                <div className="flex justify-between text-amber-800">
                                    <dt className="font-semibold">
                                        Sisa Biaya Batal Harus Dibayar
                                    </dt>
                                    <dd className="font-bold tabular-nums">
                                        {formatRupiah(
                                            centsToDecimalString(
                                                batalSisaBaruCents,
                                            ),
                                        )}
                                    </dd>
                                </div>
                            )}
                            {batalKelebihanTunaiCents > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                    <dt className="font-semibold">
                                        Kelebihan Bayar Dikembalikan
                                    </dt>
                                    <dd className="font-bold tabular-nums">
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
                            className="block text-xs font-semibold text-slate-700"
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
                            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        {batalForm.errors.alasan_pembatalan && (
                            <p
                                id={batalAlasanErrId}
                                role="alert"
                                className="mt-1 text-xs font-medium text-rose-600"
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
