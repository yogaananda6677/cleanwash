import { Head, Link } from '@inertiajs/react';
import { RoleBadge, StatusBadge } from '@/Components/StatusBadge';
import AppLayout from '@/Layouts/AppLayout';
import type { DashboardIndexProps } from '@/types';

interface MetricCardProps {
    label: string;
    value: number;
    hint: string;
    accentClass?: string;
}

function MetricCard({
    label,
    value,
    hint,
    accentClass = 'text-slate-900',
}: MetricCardProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p
                className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${accentClass}`}
            >
                {value}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
        </div>
    );
}

interface QuickActionProps {
    title: string;
    description: string;
    href: string;
    primary?: boolean;
}

function QuickActionCard({
    title,
    description,
    href,
    primary = false,
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
                <h3 className="text-sm font-semibold">{title}</h3>
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
                                'Kelola data master, penerimaan nota laundry, validasi voucher, dan pencatatan uang muka (DP).'}
                            {summary.role === 'PEGAWAI' &&
                                'Pantau antrean produksi harian dan pencatatan status proses laundry.'}
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
                </div>
            </section>

            {summary.role === 'PETUGAS' && (
                <>
                    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <MetricCard
                            label="Total Pelanggan"
                            value={summary.total_pelanggan}
                            hint="Pelanggan terdaftar"
                        />
                        <MetricCard
                            label="Layanan Aktif"
                            value={summary.total_layanan_aktif}
                            hint="Siap dipakai di loket"
                            accentClass="text-sky-700"
                        />
                        <MetricCard
                            label="Voucher Tersedia"
                            value={summary.total_voucher_tersedia}
                            hint="Belum digunakan & aktif"
                            accentClass="text-emerald-700"
                        />
                        <MetricCard
                            label="Transaksi Aktif"
                            value={summary.transaksi_aktif}
                            hint="Sedang diproses"
                            accentClass="text-indigo-700"
                        />
                        <MetricCard
                            label="Belum Lunas"
                            value={summary.transaksi_belum_lunas}
                            hint="BELUM_BAYAR / DP / BELUM_LUNAS"
                            accentClass="text-amber-700"
                        />
                    </section>

                    <section className="mt-8">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Akses Cepat Loket Kasir & Master Data
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
                                description="Cari nomor nota atau pelanggan, lihat rincian tagihan, dan cetak nota."
                                href="/transaksi"
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
                    <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <MetricCard
                            label="Antrean Transaksi Aktif"
                            value={summary.antrean_aktif}
                            hint="Transaksi dalam siklus produksi aktif"
                            accentClass="text-indigo-700"
                        />
                        <MetricCard
                            label="Laporan Insiden Saya"
                            value={summary.laporan_insiden_saya}
                            hint="Total laporan kerusakan/kehilangan yang diajukan"
                            accentClass="text-amber-700"
                        />
                    </section>

                    <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-indigo-950">
                                Modul Produksi (Segera Hadir — Phase 2)
                            </h3>
                            <StatusBadge tone="indigo">Roadmap Phase 2</StatusBadge>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-indigo-900">
                            Workspace khusus Pegawai Produksi untuk antrean cucian,
                            pembaruan tahap produksi dinamis (tanpa tahap setrika untuk
                            layanan seperti Cuci Sepatu), penimbangan ulang (
                            <span className="font-semibold">timbangUlang</span>), dan
                            pelaporan kerusakan/kehilangan per item pakaian akan aktif pada
                            Phase 2.
                        </p>
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
