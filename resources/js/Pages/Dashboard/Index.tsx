import { Head, Link } from '@inertiajs/react';
import {
    RoleBadge,
    StatusBadge,
    type BadgeTone,
} from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import type { DashboardIndexProps } from '@/types';

interface MetricCardProps {
    label: string;
    value: number;
    hint: string;
    accentClass?: string;
    href?: string;
    hrefLabel?: string;
    badgeText?: string;
    badgeTone?: BadgeTone;
}

function MetricCard({
    label,
    value,
    hint,
    accentClass = 'text-slate-900',
    href,
    hrefLabel = 'Lihat detail',
    badgeText,
    badgeTone = 'amber',
}: MetricCardProps) {
    return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">
                        {label}
                    </p>
                    {badgeText && (
                        <StatusBadge tone={badgeTone}>{badgeText}</StatusBadge>
                    )}
                </div>
                <p
                    className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${accentClass}`}
                >
                    {value}
                </p>
                <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
            </div>
            {href && (
                <Link
                    href={href}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                >
                    {hrefLabel} &rarr;
                </Link>
            )}
        </div>
    );
}

interface QuickActionProps {
    title: string;
    description: string;
    href: string;
    primary?: boolean;
    badgeText?: string;
    badgeTone?: BadgeTone;
}

function QuickActionCard({
    title,
    description,
    href,
    primary = false,
    badgeText,
    badgeTone = 'amber',
}: QuickActionProps) {
    return (
        <Link
            href={href}
            className={`group flex flex-col justify-between rounded-2xl border p-5 transition ${
                primary
                    ? 'border-sky-500 bg-sky-600 text-white shadow-sm hover:bg-sky-700'
                    : 'border-slate-200 bg-white text-slate-900 shadow-xs hover:border-sky-300 hover:shadow-sm'
            }`}
        >
            <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    {badgeText && (
                        <StatusBadge tone={badgeTone}>{badgeText}</StatusBadge>
                    )}
                </div>
                <p
                    className={`mt-1 text-xs leading-relaxed ${
                        primary ? 'text-sky-100' : 'text-slate-500'
                    }`}
                >
                    {description}
                </p>
            </div>
            <span
                className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${
                    primary
                        ? 'text-white'
                        : 'text-sky-600 group-hover:text-sky-700'
                }`}
            >
                Buka menu &rarr;
            </span>
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

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                                Selamat bertugas, {user?.name ?? 'Staf CleanWash'}
                            </h2>
                            {user && <RoleBadge role={user.role} />}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {summary.role === 'PETUGAS' &&
                                'Kelola data master, penerimaan nota laundry, validasi voucher, penyesuaian layanan, dan konfirmasi kompensasi insiden.'}
                            {summary.role === 'PEGAWAI' &&
                                'Kelola antrean produksi harian, penimbangan ulang (KK-01), pembaruan tahapan dinamis, dan pelaporan insiden.'}
                            {summary.role === 'PENGANTAR' &&
                                'Pantau jadwal pengantaran multi-pelanggan yang ditugaskan kepada Anda.'}
                        </p>
                    </div>
                    {summary.role === 'PETUGAS' && (
                        <Link
                            href="/transaksi/create"
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                        >
                            + Penerimaan Nota Baru
                        </Link>
                    )}
                    {summary.role === 'PEGAWAI' && (
                        <Link
                            href="/produksi"
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                        >
                            Buka Antrean Produksi &rarr;
                        </Link>
                    )}
                </div>
            </section>

            {summary.role === 'PETUGAS' && (
                <>
                    {summary.insiden_menunggu_konfirmasi > 0 && (
                        <section
                            aria-label="Peringatan insiden menunggu konfirmasi"
                            className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-xs sm:flex-row sm:items-center"
                        >
                            <div className="flex flex-wrap items-center gap-2.5">
                                <StatusBadge tone="amber">
                                    {summary.insiden_menunggu_konfirmasi} Insiden
                                    Menunggu Konfirmasi
                                </StatusBadge>
                                <p className="text-xs font-medium text-amber-950">
                                    Terdapat laporan kerusakan/kehilangan dari
                                    Pegawai Produksi yang perlu ditinjau dan
                                    dipotongkan saldo kompensasi.
                                </p>
                            </div>
                            <Link
                                href="/insiden?status_konfirmasi=MENUNGGU_KONFIRMASI"
                                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700"
                            >
                                Konfirmasi Sekarang &rarr;
                            </Link>
                        </section>
                    )}

                    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            label="Transaksi Aktif"
                            value={summary.transaksi_aktif}
                            hint="Sedang diproses di produksi"
                            accentClass="text-indigo-700"
                            href="/transaksi?status_transaksi=AKTIF"
                            hrefLabel="Lihat transaksi aktif"
                        />
                        <MetricCard
                            label="Selesai Siap Ambil"
                            value={summary.transaksi_selesai_siap_ambil}
                            hint="Produksi SELESAI menunggu pengambilan/antar"
                            accentClass="text-emerald-700"
                            href="/transaksi?status_transaksi=SELESAI"
                            hrefLabel="Lihat nota selesai"
                        />
                        <MetricCard
                            label="Belum Lunas"
                            value={summary.transaksi_belum_lunas}
                            hint="BELUM_BAYAR / DP / BELUM_LUNAS"
                            accentClass="text-amber-700"
                            href="/transaksi"
                            hrefLabel="Kelola tagihan"
                        />
                        <MetricCard
                            label="Insiden Menunggu Konfirmasi"
                            value={summary.insiden_menunggu_konfirmasi}
                            hint="Laporan kerusakan/kehilangan belum dikonfirmasi"
                            accentClass={
                                summary.insiden_menunggu_konfirmasi > 0
                                    ? 'text-amber-700'
                                    : 'text-slate-900'
                            }
                            badgeText={
                                summary.insiden_menunggu_konfirmasi > 0
                                    ? 'Perlu Tinjauan'
                                    : undefined
                            }
                            badgeTone="amber"
                            href="/insiden?status_konfirmasi=MENUNGGU_KONFIRMASI"
                            hrefLabel="Tinjau laporan insiden"
                        />
                        <MetricCard
                            label="Total Pelanggan"
                            value={summary.total_pelanggan}
                            hint="Pelanggan terdaftar"
                            href="/pelanggan"
                            hrefLabel="Kelola pelanggan"
                        />
                        <MetricCard
                            label="Layanan Aktif"
                            value={summary.total_layanan_aktif}
                            hint="Siap dipakai di loket"
                            accentClass="text-sky-700"
                            href="/layanan"
                            hrefLabel="Kelola layanan"
                        />
                        <MetricCard
                            label="Voucher Tersedia"
                            value={summary.total_voucher_tersedia}
                            hint="Belum digunakan & belum kedaluwarsa (WIB)"
                            accentClass="text-emerald-700"
                            href="/voucher"
                            hrefLabel="Kelola voucher"
                        />
                    </section>

                    <section className="mt-8">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Akses Cepat Loket Kasir, Insiden &amp; Master Data
                        </h3>
                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <QuickActionCard
                                primary
                                title="Buat Nota Penerimaan"
                                description="Input transaksi laundry baru, rincian pakaian, cek voucher live, dan catat DP."
                                href="/transaksi/create"
                            />
                            <QuickActionCard
                                title="Daftar Transaksi"
                                description="Filter status transaksi/pembayaran, pantau tahap produksi, ubah/batalkan nota, dan cetak nota."
                                href="/transaksi"
                            />
                            <QuickActionCard
                                title="Insiden & Kompensasi"
                                description="Tinjau laporan kerusakan/kehilangan, hitung kompensasi otomatis, dan potong saldo nota."
                                href={
                                    summary.insiden_menunggu_konfirmasi > 0
                                        ? '/insiden?status_konfirmasi=MENUNGGU_KONFIRMASI'
                                        : '/insiden'
                                }
                                badgeText={
                                    summary.insiden_menunggu_konfirmasi > 0
                                        ? `${summary.insiden_menunggu_konfirmasi} Pending`
                                        : undefined
                                }
                                badgeTone="amber"
                            />
                            <QuickActionCard
                                title="Master Pelanggan"
                                description="Kelola data pelanggan dan hak bayar akhir (boleh_bayar_akhir)."
                                href="/pelanggan"
                            />
                            <QuickActionCard
                                title="Master Jenis Layanan"
                                description="Atur tarif kg/pcs, tingkat kecepatan, dan tahapan produksi."
                                href="/layanan"
                            />
                            <QuickActionCard
                                title="Master Voucher"
                                description="Terbitkan kode voucher potongan dan pantau masa berlaku."
                                href="/voucher"
                            />
                        </div>
                    </section>
                </>
            )}

            {summary.role === 'PEGAWAI' && (
                <>
                    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            label="Antrean Transaksi Aktif"
                            value={summary.antrean_aktif}
                            hint="Transaksi dalam siklus produksi aktif"
                            accentClass="text-indigo-700"
                            href="/produksi"
                            hrefLabel="Lihat semua antrean"
                        />
                        <MetricCard
                            label="Perlu Timbang Ulang"
                            value={summary.perlu_timbang_ulang}
                            hint="Layanan BERAT (kg) masih di tahap DITERIMA"
                            accentClass="text-sky-700"
                            href="/produksi?tahap_status=DITERIMA"
                            hrefLabel="Buka tahap DITERIMA"
                        />
                        <MetricCard
                            label="Siap Proses Berikutnya"
                            value={summary.siap_proses_berikutnya}
                            hint="Aktif di tahap DITERIMA s.d. DISETRIKA (belum SELESAI)"
                            accentClass="text-emerald-700"
                            href="/produksi"
                            hrefLabel="Proses antrean produksi"
                        />
                        <MetricCard
                            label="Laporan Insiden Saya"
                            value={summary.laporan_insiden_saya}
                            hint="Total laporan kerusakan/kehilangan yang diajukan"
                            accentClass="text-amber-700"
                            href="/insiden"
                            hrefLabel="Lihat riwayat insiden"
                        />
                    </section>

                    <section className="mt-8">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Akses Cepat Produksi &amp; Pelaporan Insiden
                        </h3>
                        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <QuickActionCard
                                primary
                                title="Antrean Produksi"
                                description="Pantau cucian per tahap dinamis (tanpa setrika untuk layanan seperti sepatu), lakukan timbang ulang (KK-01), dan majukan status."
                                href="/produksi"
                            />
                            <QuickActionCard
                                title="Lapor Insiden"
                                description="Laporkan kerusakan (KK-04) atau kehilangan (KK-05) per item pakaian agar segera dikonfirmasi oleh Petugas."
                                href="/insiden"
                            />
                        </div>
                    </section>
                </>
            )}

            {summary.role === 'PENGANTAR' && (
                <>
                    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MetricCard
                            label="Jadwal Pengantaran Aktif"
                            value={summary.jadwal_pengantaran_aktif}
                            hint="Sesi pengantaran berstatus DIJADWALKAN / BERJALAN"
                            accentClass="text-violet-700"
                        />
                        <MetricCard
                            label="Item Antar Aktif"
                            value={summary.item_pengantaran_aktif}
                            hint="Nota menunggu / diambil / dalam perjalanan"
                            accentClass="text-sky-700"
                        />
                    </section>

                    <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/70 p-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-violet-950">
                                Modul Pengantaran Kurir (Segera Hadir — Phase 3)
                            </h3>
                            <StatusBadge tone="violet">Roadmap Phase 3</StatusBadge>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-violet-900">
                            Workspace khusus Petugas Pengantaran untuk daftar rute
                            multi-pelanggan, pembaruan status per item nota, serta
                            pencatatan gagal antar & penjadwalan ulang independen akan
                            aktif pada Phase 3.
                        </p>
                    </section>
                </>
            )}
        </AppLayout>
    );
}
