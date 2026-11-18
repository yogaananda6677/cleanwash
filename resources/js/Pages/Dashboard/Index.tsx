import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Cog,
    Info,
    PackageCheck,
    PlusCircle,
    ReceiptText,
    Scale,
    Sparkles,
    TicketPercent,
    Truck,
    Wallet,
    WashingMachine,
} from 'lucide-react';
import type { ReactNode } from 'react';
import StatTile from '@/Components/StatTile';
import { RoleBadge, StatusBadge } from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import { formatRupiah, parseDecimalToCents } from '@/lib/format';
import type { DashboardIndexProps } from '@/types';

interface CompactActionProps {
    title: string;
    description: string;
    href: string;
    icon: ReactNode;
    badgeText?: string;
    badgeTone?: 'amber' | 'emerald' | 'rose' | 'teal';
}

function CompactActionItem({
    title,
    description,
    href,
    icon,
    badgeText,
    badgeTone = 'amber',
}: CompactActionProps) {
    return (
        <Link
            href={href}
            className="group flex min-h-[4.25rem] items-start justify-between gap-3 rounded-xl border border-[#D8E2E6] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(11,19,43,0.04)] transition hover:border-[#2563EB] hover:bg-[#EFF6FF]/50"
        >
            <div className="flex min-w-0 items-start gap-3">
                <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] ring-1 ring-blue-200 transition group-hover:bg-[#2563EB] group-hover:text-white"
                >
                    {icon}
                </span>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#0F172A] group-hover:text-[#1D4ED8]">
                            {title}
                        </h3>
                        {badgeText && (
                            <StatusBadge tone={badgeTone}>
                                {badgeText}
                            </StatusBadge>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#5B697A]">
                        {description}
                    </p>
                </div>
            </div>
            <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-[#5B697A] transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]"
                aria-hidden="true"
            />
        </Link>
    );
}

export default function DashboardIndex({ auth, summary }: DashboardIndexProps) {
    const user = auth.user;

    return (
        <AppLayout
            title="Dashboard"
            subtitle="Ringkasan operasional CleanWash sesuai peran aktif"
        >
            <Head title="Dashboard" />

            {/* Top Welcome & Primary Action Strip */}
            <section className="rounded-2xl border border-[#D8E2E6] bg-white p-5 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h2 className="text-base font-bold tracking-tight text-[#0F172A] sm:text-lg">
                                Selamat bertugas,{' '}
                                {user?.name ?? 'Staf CleanWash'}
                            </h2>
                            {user && <RoleBadge role={user.role} />}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#475569]">
                            {summary.role === 'PETUGAS' &&
                                'Kelola penerimaan nota, validasi voucher, penyesuaian layanan, konfirmasi kompensasi insiden, dan pelunasan loket.'}
                            {summary.role === 'PEGAWAI' &&
                                'Kelola antrean produksi harian, penimbangan ulang (KK-01), pembaruan tahapan dinamis, dan pelaporan insiden.'}
                            {summary.role === 'PENGANTAR' &&
                                'Pantau jadwal pengantaran multi-pelanggan yang ditugaskan kepada Anda secara terurut dan terisolasi (KK-07).'}
                        </p>
                    </div>

                    {summary.role === 'PETUGAS' && (
                        <Link
                            href="/transaksi/create"
                            className="inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                        >
                            <PlusCircle
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                            <span>
                                <span className="sr-only">+ </span>Penerimaan
                                Nota Baru
                            </span>
                        </Link>
                    )}

                    {summary.role === 'PEGAWAI' && (
                        <Link
                            href="/produksi"
                            className="inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                        >
                            <span>Buka Antrean Produksi</span>
                            <ArrowRight
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                        </Link>
                    )}

                    {summary.role === 'PENGANTAR' && (
                        <Link
                            href="/pengantaran"
                            className="inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                        >
                            <span>Buka Jadwal Pengantaran</span>
                            <ArrowRight
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                            />
                        </Link>
                    )}
                </div>
            </section>

            {/* PETUGAS Role Hub */}
            {summary.role === 'PETUGAS' && (
                <div className="mt-5 space-y-6">
                    {summary.insiden_menunggu_konfirmasi > 0 ? (
                        <section
                            aria-label="Peringatan insiden menunggu konfirmasi"
                            className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-5 py-4 shadow-xs sm:flex-row sm:items-center"
                        >
                            <div className="flex flex-wrap items-center gap-2.5">
                                <StatusBadge tone="amber">
                                    {summary.insiden_menunggu_konfirmasi} Insiden
                                    Menunggu Konfirmasi
                                </StatusBadge>
                                <p className="text-xs font-medium text-[#78350F]">
                                    Terdapat laporan kerusakan/kehilangan dari
                                    Pegawai Produksi yang perlu ditinjau dan
                                    dipotongkan saldo kompensasi.
                                </p>
                            </div>
                            <Link
                                href="/insiden?status_konfirmasi=MENUNGGU_KONFIRMASI"
                                className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1E293B]"
                            >
                                <span>Konfirmasi Sekarang</span>
                                <ArrowRight
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                            </Link>
                        </section>
                    ) : (
                        summary.piutang_belum_lunas > 0 && (
                            <section
                                aria-label="Ringkasan piutang hak bayar akhir"
                                className="flex flex-col justify-between gap-3 rounded-2xl border border-indigo-200 border-l-4 border-l-[#4338CA] bg-[#EEF2FF] px-5 py-4 shadow-xs sm:flex-row sm:items-center"
                            >
                                <div className="flex items-start gap-2.5 text-xs text-[#3730A3]">
                                    <Info
                                        className="mt-0.5 h-4 w-4 shrink-0 text-[#4338CA]"
                                        aria-hidden="true"
                                    />
                                    <p className="font-medium">
                                        Terdapat{' '}
                                        <strong>
                                            {summary.piutang_belum_lunas} nota
                                            piutang
                                        </strong>{' '}
                                        hak bayar akhir (KK-06) dengan total
                                        tagihan tertunda{' '}
                                        <strong className="font-mono tabular-nums">
                                            {formatRupiah(
                                                summary.piutang_nominal_total,
                                            )}
                                        </strong>
                                        .
                                    </p>
                                </div>
                                <Link
                                    href="/serah-terima?mode=PIUTANG"
                                    className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1E293B]"
                                >
                                    <span>Kelola Piutang</span>
                                    <ArrowRight
                                        className="h-3.5 w-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </section>
                        )
                    )}

                    {/* Group A: Ringkasan Operasional (4 cards) */}
                    <section aria-labelledby="heading-operasional">
                        <h2
                            id="heading-operasional"
                            className="text-sm font-bold tracking-tight text-[#0F172A]"
                        >
                            Ringkasan Operasional
                        </h2>
                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile
                                label="Transaksi Aktif"
                                value={summary.transaksi_aktif}
                                hint="Sedang diproses di produksi"
                                tone="indigo"
                                icon={
                                    <Cog className="h-4 w-4" aria-hidden="true" />
                                }
                                href="/transaksi?status_transaksi=AKTIF"
                                hrefLabel="Lihat transaksi aktif"
                            />
                            <StatTile
                                label="Selesai Siap Ambil"
                                value={summary.transaksi_selesai_siap_ambil}
                                hint="Produksi SELESAI menunggu pengambilan/antar"
                                tone="emerald"
                                icon={
                                    <PackageCheck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/serah-terima?mode=SIAP_AMBIL"
                                hrefLabel="Buka loket serah terima"
                            />
                            <StatTile
                                label="Pengantaran Aktif"
                                value={summary.pengantaran_aktif}
                                hint="Sesi kurir DIJADWALKAN / BERJALAN"
                                tone="brand"
                                icon={
                                    <Truck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/pengantaran"
                                hrefLabel="Kelola pengantaran"
                            />
                            <StatTile
                                label="Insiden Menunggu Konfirmasi"
                                value={summary.insiden_menunggu_konfirmasi}
                                hint="Laporan kerusakan/kehilangan perlu tinjauan"
                                tone={
                                    summary.insiden_menunggu_konfirmasi > 0
                                        ? 'amber'
                                        : 'neutral'
                                }
                                badgeText={
                                    summary.insiden_menunggu_konfirmasi > 0
                                        ? 'Perlu Tinjauan'
                                        : undefined
                                }
                                badgeTone="amber"
                                icon={
                                    <AlertTriangle
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/insiden?status_konfirmasi=MENUNGGU_KONFIRMASI"
                                hrefLabel="Tinjau laporan insiden"
                            />
                        </div>
                    </section>

                    {/* Group B: Keuangan & Master Data (4 cards) */}
                    <section aria-labelledby="heading-keuangan">
                        <h2
                            id="heading-keuangan"
                            className="text-sm font-bold tracking-tight text-[#0F172A]"
                        >
                            Keuangan &amp; Master Data
                        </h2>
                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile
                                label="Belum Lunas"
                                value={summary.transaksi_belum_lunas}
                                hint="BELUM_BAYAR / DP / BELUM_LUNAS"
                                tone={
                                    summary.transaksi_belum_lunas > 0
                                        ? 'amber'
                                        : 'neutral'
                                }
                                icon={
                                    <Wallet
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/transaksi"
                                hrefLabel="Kelola tagihan"
                            />
                            <StatTile
                                label="Total Nominal Piutang"
                                value={formatRupiah(
                                    summary.piutang_nominal_total,
                                )}
                                hint={`${summary.piutang_belum_lunas} nota diambil belum lunas`}
                                tone={
                                    parseDecimalToCents(
                                        summary.piutang_nominal_total,
                                    ) > 0
                                        ? 'rose'
                                        : 'emerald'
                                }
                                badgeText={
                                    summary.piutang_belum_lunas > 0
                                        ? 'KK-06 Aktif'
                                        : undefined
                                }
                                badgeTone="amber"
                                icon={
                                    <ReceiptText
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/serah-terima?mode=PIUTANG"
                                hrefLabel="Kelola piutang"
                            />
                            <StatTile
                                label="Layanan Aktif"
                                value={summary.total_layanan_aktif}
                                hint={`${summary.total_pelanggan} pelanggan terdaftar`}
                                tone="brand"
                                icon={
                                    <Sparkles
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/layanan"
                                hrefLabel="Kelola layanan"
                            />
                            <StatTile
                                label="Voucher Tersedia"
                                value={summary.total_voucher_tersedia}
                                hint="Aktif & berlaku (WIB)"
                                tone="emerald"
                                icon={
                                    <TicketPercent
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/voucher"
                                hrefLabel="Kelola voucher"
                            />
                        </div>
                    </section>

                    {/* Compact Quick Action Strip */}
                    <section aria-labelledby="heading-quick-petugas">
                        <h2
                            id="heading-quick-petugas"
                            className="text-sm font-bold tracking-tight text-[#0F172A]"
                        >
                            Tugas Harian Utama
                        </h2>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <CompactActionItem
                                title="Buat Nota Penerimaan"
                                description="Input transaksi laundry, rincian pakaian, cek voucher & DP."
                                href="/transaksi/create"
                                icon={
                                    <PlusCircle
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                            />
                            <CompactActionItem
                                title="Loket Serah Terima"
                                description="Proses pengambilan cucian (KK-06) dan catat pelunasan."
                                href="/serah-terima"
                                icon={
                                    <PackageCheck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                badgeText={
                                    summary.transaksi_selesai_siap_ambil > 0
                                        ? `${summary.transaksi_selesai_siap_ambil} Siap Ambil`
                                        : undefined
                                }
                                badgeTone="emerald"
                            />
                            <CompactActionItem
                                title="Manajemen Pengantaran"
                                description="Jadwalkan kurir multi-pelanggan dan tindak lanjuti gagal antar."
                                href="/pengantaran"
                                icon={
                                    <Truck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                badgeText={
                                    summary.pengantaran_aktif > 0
                                        ? `${summary.pengantaran_aktif} Aktif`
                                        : undefined
                                }
                                badgeTone="teal"
                            />
                            <CompactActionItem
                                title="Audit Trail & Piutang"
                                description="Tinjau log audit lintas modul serta rekap piutang KK-06."
                                href="/audit"
                                icon={
                                    <ClipboardCheck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                badgeText={
                                    summary.piutang_belum_lunas > 0
                                        ? `${summary.piutang_belum_lunas} Piutang`
                                        : undefined
                                }
                                badgeTone="amber"
                            />
                        </div>
                    </section>
                </div>
            )}

            {/* PEGAWAI Role Hub */}
            {summary.role === 'PEGAWAI' && (
                <div className="mt-5 space-y-6">
                    <section aria-label="Ringkasan antrean produksi">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile
                                label="Antrean Transaksi Aktif"
                                value={summary.antrean_aktif}
                                hint="Transaksi dalam siklus produksi aktif"
                                tone="indigo"
                                icon={
                                    <WashingMachine
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/produksi"
                                hrefLabel="Lihat semua antrean"
                            />
                            <StatTile
                                label="Perlu Timbang Ulang"
                                value={summary.perlu_timbang_ulang}
                                hint="Layanan BERAT (kg) masih di tahap DITERIMA"
                                tone="brand"
                                icon={
                                    <Scale
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/produksi?tahap_status=DITERIMA"
                                hrefLabel="Buka tahap DITERIMA"
                            />
                            <StatTile
                                label="Siap Proses Berikutnya"
                                value={summary.siap_proses_berikutnya}
                                hint="Aktif di tahap DITERIMA s.d. DISETRIKA (belum SELESAI)"
                                tone="emerald"
                                icon={
                                    <Clock
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/produksi"
                                hrefLabel="Proses antrean produksi"
                            />
                            <StatTile
                                label="Laporan Insiden Saya"
                                value={summary.laporan_insiden_saya}
                                hint="Total laporan kerusakan/kehilangan yang diajukan"
                                tone="amber"
                                icon={
                                    <AlertTriangle
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/insiden"
                                hrefLabel="Lihat riwayat insiden"
                            />
                        </div>
                    </section>

                    <section aria-labelledby="heading-quick-pegawai">
                        <h2
                            id="heading-quick-pegawai"
                            className="text-sm font-bold tracking-tight text-[#0F172A]"
                        >
                            Tugas Harian Produksi
                        </h2>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <CompactActionItem
                                title="Buka Antrean Produksi"
                                description="Pantau cucian per tahap dinamis (tanpa setrika untuk layanan seperti sepatu), lakukan timbang ulang (KK-01), dan majukan status."
                                href="/produksi"
                                icon={
                                    <WashingMachine
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                            />
                            <CompactActionItem
                                title="Lapor Insiden"
                                description="Laporkan kerusakan (KK-04) atau kehilangan (KK-05) per item pakaian agar segera dikonfirmasi oleh Petugas."
                                href="/insiden"
                                icon={
                                    <AlertTriangle
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                            />
                        </div>
                    </section>
                </div>
            )}

            {/* PENGANTAR Role Hub */}
            {summary.role === 'PENGANTAR' && (
                <div className="mt-5 space-y-6">
                    {summary.item_gagal_perlu_tindak_lanjut > 0 && (
                        <section
                            aria-label="Peringatan item gagal pengantaran"
                            className="flex flex-col justify-between gap-3 rounded-2xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-5 py-4 shadow-xs sm:flex-row sm:items-center"
                        >
                            <div className="flex flex-wrap items-center gap-2.5">
                                <StatusBadge tone="rose">
                                    {summary.item_gagal_perlu_tindak_lanjut}{' '}
                                    Item Gagal Perlu Reschedule
                                </StatusBadge>
                                <p className="text-xs font-medium text-[#9F1239]">
                                    Ada pengantaran gagal yang belum dijadwalkan
                                    ulang secara terisolasi (KK-07).
                                </p>
                            </div>
                            <Link
                                href="/pengantaran"
                                className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0B132B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1E293B]"
                            >
                                <span>Tindak Lanjuti</span>
                                <ArrowRight
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                            </Link>
                        </section>
                    )}

                    <section aria-label="Ringkasan pengantaran kurir">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatTile
                                label="Jadwal Pengantaran Aktif"
                                value={summary.jadwal_pengantaran_aktif}
                                hint="Sesi pengantaran berstatus DIJADWALKAN / BERJALAN"
                                tone="brand"
                                icon={
                                    <Truck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/pengantaran"
                                hrefLabel="Lihat sesi aktif"
                            />
                            <StatTile
                                label="Item Antar Aktif"
                                value={summary.item_pengantaran_aktif}
                                hint="Nota MENUNGGU / DIAMBIL / DALAM_PERJALANAN"
                                tone="indigo"
                                icon={
                                    <PackageCheck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/pengantaran"
                                hrefLabel="Kelola item pengantaran"
                            />
                            <StatTile
                                label="Terkirim Hari Ini"
                                value={summary.item_terkirim_hari_ini}
                                hint="Item berstatus DITERIMA hari ini (WIB)"
                                tone="emerald"
                                icon={
                                    <CheckCircle2
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/pengantaran?status_pengantaran=SELESAI"
                                hrefLabel="Lihat sesi selesai"
                            />
                            <StatTile
                                label="Gagal Perlu Tindak Lanjut"
                                value={summary.item_gagal_perlu_tindak_lanjut}
                                hint="Item GAGAL yang belum dijadwalkan ulang (KK-07)"
                                tone={
                                    summary.item_gagal_perlu_tindak_lanjut > 0
                                        ? 'rose'
                                        : 'neutral'
                                }
                                badgeText={
                                    summary.item_gagal_perlu_tindak_lanjut > 0
                                        ? 'Perlu Reschedule'
                                        : undefined
                                }
                                badgeTone="rose"
                                icon={
                                    <AlertTriangle
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                href="/pengantaran"
                                hrefLabel="Tindak lanjuti item gagal"
                            />
                        </div>
                    </section>

                    <section aria-labelledby="heading-quick-pengantar">
                        <h2
                            id="heading-quick-pengantar"
                            className="text-sm font-bold tracking-tight text-[#0F172A]"
                        >
                            Tugas Harian Kurir Pengantaran
                        </h2>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <CompactActionItem
                                title="Jadwal Pengantaran Harian"
                                description="Mulai sesi pengantaran, perbarui status tiap nota pelanggan (DIAMBIL → DALAM_PERJALANAN → DITERIMA / GAGAL), serta jadwalkan ulang item gagal (KK-07)."
                                href="/pengantaran"
                                icon={
                                    <Truck
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                badgeText={
                                    summary.item_pengantaran_aktif > 0
                                        ? `${summary.item_pengantaran_aktif} Item Aktif`
                                        : undefined
                                }
                                badgeTone="teal"
                            />
                            <CompactActionItem
                                title="Tindak Lanjut Pengantaran Gagal"
                                description="Periksa item yang gagal diantar karena pelanggan tidak di tempat atau kendala tagihan (KK-06) dan buat jadwal ulang terisolasi."
                                href="/pengantaran?status_pengantaran=SELESAI"
                                icon={
                                    <AlertTriangle
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                }
                                badgeText={
                                    summary.item_gagal_perlu_tindak_lanjut > 0
                                        ? `${summary.item_gagal_perlu_tindak_lanjut} Perlu Jadwal Ulang`
                                        : undefined
                                }
                                badgeTone="rose"
                            />
                        </div>
                    </section>
                </div>
            )}
        </AppLayout>
    );
}
