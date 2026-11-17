import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Award,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    Droplets,
    FileText,
    Heart,
    HelpCircle,
    Inbox,
    Layers,
    MapPin,
    PackageCheck,
    Phone,
    ReceiptText,
    Scale,
    Search,
    Shield,
    ShieldCheck,
    Sparkles,
    Tag,
    Truck,
    WashingMachine,
    Wind,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatRupiah, formatTahapProduksi, formatTanggal } from '@/lib/format';
import type { SharedPageProps } from '@/types';

interface ServiceItem {
    id_layanan: number;
    nama_layanan: string;
    tingkat_kecepatan: string;
    metode_hitung: string;
    satuan: string;
    harga_satuan: string;
    perlu_setrika: boolean;
    is_active: boolean;
    tahap_layanan?: Array<{
        id_tahap: number;
        nama_tahap: string;
        urutan: number;
    }>;
}

interface VoucherItem {
    nomor_voucher: string;
    nilai: string;
    masa_berlaku: string;
    status_penggunaan: string;
}

interface TrackingStage {
    nama_tahap: string;
    is_completed: boolean;
    waktu_update: string | null;
}

interface TrackingResult {
    nomor_nota: string;
    status_transaksi: string;
    status_pembayaran: string;
    layanan: {
        nama: string;
        kecepatan: string;
        metode_hitung: string;
    };
    berat_atau_jumlah: string;
    total_potong: number;
    tanggal_penerimaan: string;
    tahap_terakhir: string;
    stages: TrackingStage[];
    siap_diambil: boolean;
}

interface WelcomeProps {
    services: ServiceItem[];
    activeVouchers: VoucherItem[];
    stats: {
        total_transaksi: number;
        selesai_transaksi: number;
        total_pelanggan: number;
        total_layanan: number;
    };
    trackingQuery?: string;
    trackingResult?: TrackingResult | null;
}

export default function Welcome({
    services,
    activeVouchers,
    stats,
    trackingQuery = '',
    trackingResult = null,
}: WelcomeProps) {
    const { auth } = usePage<SharedPageProps>().props;
    const [notaInput, setNotaInput] = useState(trackingQuery);
    const [isSearching, setIsSearching] = useState(false);
    const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

    const handleTrackSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = notaInput.trim();
        if (!trimmed) return;

        setIsSearching(true);
        router.get(
            '/',
            { lacak: trimmed },
            {
                preserveScroll: true,
                onFinish: () => setIsSearching(false),
            },
        );
    };

    const handleCopyVoucher = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedVoucher(code);
        setTimeout(() => setCopiedVoucher(null), 2500);
    };

    return (
        <>
            <Head>
                <title>CleanWash — Atelier Binatu Modern & Higienis</title>
                <meta
                    name="description"
                    content="Sistem informasi manajemen laundry terpadu CleanWash. Higienis, transparan, snapshot tarif permanen, dan garansi pakaian per potong."
                />
            </Head>

            <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-[#14B8A6]/20 selection:text-[#0F766E]">
                {/* 1. Top Announcement Bar */}
                <aside aria-label="Pengumuman promo" className="bg-[#0F2933] px-4 py-2 text-center text-xs text-[#9FB7C0] border-b border-[#1E3E4B]">
                    <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-[#2DD4BF]" aria-hidden="true" />
                        <span>
                            Gunakan kode voucher promo untuk diskon hemat hingga{' '}
                            <strong className="text-white">Rp 10.000</strong> pada pesanan laundry Anda!
                        </span>
                        <a href="#vouchers" className="ml-1 font-semibold text-[#2DD4BF] underline hover:text-white">
                            Lihat Voucher &rarr;
                        </a>
                    </div>
                </aside>

                {/* 2. Navigation Header */}
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
                        <Link href="/" className="flex items-center gap-3 group">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-sm ring-1 ring-[#14B8A6]/40 transition group-hover:scale-105">
                                <Droplets className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <div>
                                <span className="text-lg font-bold tracking-tight text-[#0F2933] sm:text-xl">
                                    Clean<span className="text-[#0F766E]">Wash</span>
                                </span>
                                <span className="block text-[0.6875rem] font-medium tracking-wide uppercase text-slate-500">
                                    Laundry Atelier &bull; Tech-Enabled
                                </span>
                            </div>
                        </Link>

                        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
                            <a href="#layanan" className="transition hover:text-[#0F766E]">
                                Layanan &amp; Tarif
                            </a>
                            <a href="#keunggulan" className="transition hover:text-[#0F766E]">
                                Keunggulan
                            </a>
                            <a href="#lacak" className="transition hover:text-[#0F766E]">
                                Lacak Laundry
                            </a>
                            <a href="#tentang" className="transition hover:text-[#0F766E]">
                                Tentang Kami
                            </a>
                        </nav>

                        <div className="flex items-center gap-3">
                            <a
                                href="#lacak"
                                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#0F766E] hover:text-[#0F766E]"
                            >
                                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Cek Nota</span>
                            </a>

                            {auth?.user ? (
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#115E59]"
                                >
                                    <span>Dashboard ({auth.user.name.split(' ')[0]})</span>
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Link>
                            ) : (
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F2933] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1A3D4C]"
                                >
                                    <span>Masuk Portal Staf</span>
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                <main id="main-content">
                    {/* 3. Hero Section */}
                    <section className="relative overflow-hidden bg-gradient-to-b from-[#F0FDFA]/60 via-[#F8FAFC] to-[#F8FAFC] py-12 sm:py-20 lg:py-24">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
                                <div className="lg:col-span-7">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1.5 text-xs font-semibold text-[#0F766E]">
                                        <Sparkles className="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
                                        <span>Standar Higienis Laundry Komersial Modern</span>
                                    </div>

                                    <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[#0F2933] sm:text-5xl sm:leading-[1.15]">
                                        Revolusi Binatu Modern —{' '}
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0F766E] to-[#0D9488]">
                                            Higienis, Presisi, &amp; Transparan.
                                        </span>
                                    </h1>

                                    <p className="mt-5 max-w-2xl text-base text-slate-600 sm:text-lg sm:leading-relaxed">
                                        CleanWash memadukan teknologi mesin cuci industrial berpresisi tinggi dengan sistem manajemen operasional cerdas. Nikmati penimbangan transparan, snapshot tarif permanen, garansi ganti rugi per potong pakaian, dan pelacakan cucian secara langsung.
                                    </p>

                                    <div className="mt-8 flex flex-wrap items-center gap-3">
                                        <a
                                            href="#lacak"
                                            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-teal-700/20 transition hover:bg-[#115E59]"
                                        >
                                            <Search className="h-4 w-4" aria-hidden="true" />
                                            <span>Lacak Cucian Sekarang</span>
                                        </a>

                                        <a
                                            href="#layanan"
                                            className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-400 hover:bg-slate-50"
                                        >
                                            <ReceiptText className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                            <span>Daftar Layanan &amp; Tarif</span>
                                        </a>
                                    </div>

                                    {/* Stats Mini Row */}
                                    <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-200/80 pt-8 sm:grid-cols-4">
                                        <div>
                                            <p className="text-2xl font-bold tracking-tight text-[#0F2933]">
                                                {stats.total_transaksi > 0 ? `${stats.total_transaksi}+` : '500+'}
                                            </p>
                                            <p className="text-xs font-medium text-slate-500">Nota Terselesaikan</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold tracking-tight text-[#0F766E]">99.8%</p>
                                            <p className="text-xs font-medium text-slate-500">Tepat Waktu</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold tracking-tight text-[#0F2933]">100%</p>
                                            <p className="text-xs font-medium text-slate-500">Garansi Pakaian</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold tracking-tight text-[#0F766E]">60°C</p>
                                            <p className="text-xs font-medium text-slate-500">Suhu Sterilisasi</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hero Machine Visual Graphic */}
                                <div className="lg:col-span-5">
                                    <div className="relative mx-auto max-w-lg lg:max-w-none">
                                        <div
                                            aria-hidden="true"
                                            className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 blur-xl"
                                        />
                                        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-2.5 shadow-xl">
                                            <img
                                                src="/images/cleanwash-hero-machines.jpg"
                                                alt="Fasilitas Atelier Mesin Cuci Industrial CleanWash"
                                                className="aspect-[16/10] w-full rounded-2xl object-cover shadow-inner"
                                                loading="eager"
                                            />
                                            <div className="p-4 sm:p-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
                                                            <WashingMachine className="h-4 w-4" aria-hidden="true" />
                                                        </span>
                                                        <div>
                                                            <p className="text-xs font-bold text-[#0F2933]">Smart Industrial Washers</p>
                                                            <p className="text-[0.6875rem] text-slate-500">Presisi putaran &amp; suhu terkalibrasi</p>
                                                        </div>
                                                    </div>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.6875rem] font-bold text-emerald-700">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Aktif Beroperasi
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4. Live Order Tracking Section (#lacak) */}
                    <section id="lacak" className="scroll-mt-20 py-12 sm:py-16">
                        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                            <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-xl sm:p-10">
                                <div className="text-center">
                                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-[#0F766E] shadow-sm">
                                        <Search className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                    <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#0F2933] sm:text-3xl">
                                        Lacak Status Cucian Anda
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Masukkan nomor nota resmi CleanWash (contoh:{' '}
                                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-[#0F766E]">
                                            CW-20261111-0001
                                        </code>
                                        ) untuk memeriksa progres pencucian secara langsung.
                                    </p>
                                </div>

                                <form onSubmit={handleTrackSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <div className="relative flex-1">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                                            <FileText className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                        <input
                                            type="text"
                                            value={notaInput}
                                            onChange={(e) => setNotaInput(e.target.value)}
                                            placeholder="Contoh: CW-20261111-0001"
                                            aria-label="Nomor Nota Laundry"
                                            className="w-full rounded-2xl border border-slate-300 py-3.5 pl-11 pr-4 text-sm font-semibold tracking-wide uppercase text-[#0F172A] placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSearching || !notaInput.trim()}
                                        className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Search className="h-4 w-4" aria-hidden="true" />
                                        <span>{isSearching ? 'Memeriksa...' : 'Cek Status'}</span>
                                    </button>
                                </form>

                                {/* Tracking Result Box */}
                                {trackingResult && (
                                    <div className="mt-8 rounded-2xl border border-emerald-200 bg-[#ECFDF5]/50 p-6 sm:p-8">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-base font-bold text-[#0F2933]">
                                                        {trackingResult.nomor_nota}
                                                    </span>
                                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                                        {trackingResult.status_transaksi}
                                                    </span>
                                                    <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-[#0F766E]">
                                                        {trackingResult.layanan.kecepatan}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    Layanan: <strong className="text-slate-800">{trackingResult.layanan.nama}</strong> &bull; Total:{' '}
                                                    <strong className="text-slate-800">{trackingResult.berat_atau_jumlah} {trackingResult.layanan.metode_hitung === 'BERAT' ? 'kg' : 'pcs'}</strong> ({trackingResult.total_potong} potong)
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">Tahap Terkini</p>
                                                <p className="text-sm font-bold text-[#0F766E]">
                                                    {formatTahapProduksi(trackingResult.tahap_terakhir as any)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stepper Progress Visual */}
                                        <div className="mt-6">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                                                Tahapan Pengerjaan Pakaian:
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                                {trackingResult.stages.map((stg, idx) => (
                                                    <div
                                                        key={stg.nama_tahap}
                                                        className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition ${
                                                            stg.is_completed
                                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                                : 'bg-white border border-slate-200 text-slate-400'
                                                        }`}
                                                    >
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold mb-1">
                                                            {stg.is_completed ? (
                                                                <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                                                            ) : (
                                                                <span>{idx + 1}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-bold leading-tight">
                                                            {formatTahapProduksi(stg.nama_tahap as any)}
                                                        </span>
                                                        <span className="text-[0.625rem] mt-0.5 opacity-80">
                                                            {stg.is_completed ? 'Selesai' : 'Menunggu'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {trackingResult.siap_diambil && (
                                            <div className="mt-6 flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-200 p-4 text-xs text-[#0F766E]">
                                                <PackageCheck className="h-5 w-5 shrink-0 text-[#0F766E]" aria-hidden="true" />
                                                <p>
                                                    <strong>Pakaian Anda Telah Selesai Diproses!</strong> Silakan bawa nomor nota ini ke kasir loket CleanWash atau tunggu kurir pengantaran kami tiba di alamat Anda.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {trackingQuery && !trackingResult && (
                                    <div className="mt-8 flex items-center gap-3 rounded-2xl border border-rose-200 bg-[#FFF1F2] p-4 text-sm text-[#9F1239]">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-[#BE123C]" aria-hidden="true" />
                                        <p>
                                            Nomor nota <strong>{trackingQuery}</strong> tidak ditemukan. Pastikan format nomor nota benar (contoh: CW-20261111-0001).
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* 5. Keunggulan Sistem CleanWash (#keunggulan) */}
                    <section id="keunggulan" className="scroll-mt-20 bg-slate-50 py-16 sm:py-24 border-y border-slate-200/80">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="text-center max-w-3xl mx-auto">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                                    Kepercayaan &bull; Ketepatan &bull; Kualitas
                                </span>
                                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F2933] sm:text-4xl">
                                    Kenapa Memilih CleanWash Atelier?
                                </h2>
                                <p className="mt-3 text-base text-slate-600">
                                    Kami merancang proses binatu dengan standar rekayasa tertinggi untuk menjamin pakaian kesayangan Anda diperlakukan dengan higienis dan terukur.
                                </p>
                            </div>

                            <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                                <div className="lg:col-span-5">
                                    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-2.5 shadow-lg">
                                        <img
                                            src="/images/cleanwash-folding-care.jpg"
                                            alt="Proses Pelipatan dan Perawatan Pakaian Bersih"
                                            className="aspect-[4/3] w-full rounded-2xl object-cover"
                                            loading="lazy"
                                        />
                                        <div className="p-4">
                                            <p className="text-xs font-bold text-[#0F2933]">Eco-friendly Detergent &amp; Steam Sanitized</p>
                                            <p className="text-[0.6875rem] text-slate-500">Lembut untuk serat kain, aman untuk kulit sensitif anak</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-teal-200 transition">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E] mb-4">
                                            <Scale className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <h3 className="text-base font-bold text-[#0F2933]">Penimbangan Ulang Transparan</h3>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                            Penimbangan dilakukan di loket dan diverifikasi ulang di area produksi (KK-01). Tagihan disesuaikan otomatis dengan bukti berat aktual yang jujur.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-teal-200 transition">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E] mb-4">
                                            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <h3 className="text-base font-bold text-[#0F2933]">Snapshot Tarif Permanen</h3>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                            Tarif transaksi Anda dikunci permanen saat nota terbit (KK-09). Kenaikan harga master di masa depan tidak akan pernah memengaruhi nota yang telah berjalan.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-teal-200 transition">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E] mb-4">
                                            <Award className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <h3 className="text-base font-bold text-[#0F2933]">Garansi Pakaian &amp; Kompensasi</h3>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                            Setiap potong pakaian terdata rinci. Bila terjadi kerusakan atau kehilangan, sistem secara resmi memotong tagihan atau memberikan kompensasi ganti rugi (KK-04/KK-05).
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-teal-200 transition">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-[#0F766E] mb-4">
                                            <Truck className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <h3 className="text-base font-bold text-[#0F2933]">Kurir Rute Multi-Pelanggan</h3>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                            Pengantaran terjadwal rapi dengan sistem isolasi rute (KK-07). Jika pelanggan berhalangan, pengantaran dijadwalkan ulang tanpa mengganggu pesanan pelanggan lain.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 6. Layanan & Tarif (#layanan) */}
                    <section id="layanan" className="scroll-mt-20 py-16 sm:py-24">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="text-center max-w-3xl mx-auto">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                                    Pilihan Paket Terbaik
                                </span>
                                <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F2933] sm:text-4xl">
                                    Daftar Layanan &amp; Tarif Transparan
                                </h2>
                                <p className="mt-3 text-base text-slate-600">
                                    Pilih layanan binatu sesuai kebutuhan harian atau bahan khusus pakaian Anda.
                                </p>
                            </div>

                            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {services.map((svc) => (
                                    <div
                                        key={svc.id_layanan}
                                        className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[#0F766E] hover:shadow-md transition"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                    svc.tingkat_kecepatan === 'EXPRESS'
                                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                        : 'bg-teal-50 text-[#0F766E] border border-teal-200'
                                                }`}>
                                                    {svc.tingkat_kecepatan}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono">
                                                    {svc.metode_hitung === 'BERAT' ? 'Per Kilogram' : 'Per Potong'}
                                                </span>
                                            </div>

                                            <h3 className="mt-4 text-lg font-bold text-[#0F2933]">
                                                {svc.nama_layanan}
                                            </h3>

                                            <div className="mt-4 flex items-baseline gap-1">
                                                <span className="text-2xl font-extrabold text-[#0F766E]">
                                                    {formatRupiah(svc.harga_satuan)}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    / {svc.satuan.toLowerCase()}
                                                </span>
                                            </div>

                                            <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-xs text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
                                                    <span>Tahap: {svc.perlu_setrika ? 'Cuci, Kering, & Setrika' : 'Cuci & Kering (Tanpa Setrika)'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
                                                    <span>Deterjen Premium &amp; Pewangi Tahan Lama</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
                                                    <span>Kemasan Plastik Tebal &amp; Rapi</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-100">
                                            <a
                                                href="#lacak"
                                                className="block w-full text-center rounded-xl bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-[#0F766E] hover:text-white transition"
                                            >
                                                Pilih di Kasir Loket
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 7. Voucher Promo Section (#vouchers) */}
                    {activeVouchers.length > 0 && (
                        <section id="vouchers" className="scroll-mt-20 bg-gradient-to-r from-[#0F2933] to-[#163845] py-14 text-white">
                            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                                <div className="text-center max-w-2xl mx-auto">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#2DD4BF]">
                                        Diskon Spesial
                                    </span>
                                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                        Klaim Voucher Promo Laundry
                                    </h2>
                                    <p className="mt-2 text-xs text-[#9FB7C0] sm:text-sm">
                                        Salin kode voucher dan tunjukkan kepada petugas kasir saat penyerahan pakaian di loket.
                                    </p>
                                </div>

                                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
                                    {activeVouchers.map((v) => (
                                        <div
                                            key={v.nomor_voucher}
                                            className="flex flex-col justify-between rounded-2xl border border-teal-500/30 bg-white/5 p-5 backdrop-blur-sm"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1 text-[0.6875rem] font-bold uppercase text-[#2DD4BF]">
                                                        <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                                                        Diskon Potongan
                                                    </span>
                                                    <span className="text-[0.6875rem] text-[#9FB7C0]">
                                                        s/d {formatTanggal(v.masa_berlaku)}
                                                    </span>
                                                </div>
                                                <p className="mt-3 text-2xl font-black text-white">
                                                    {formatRupiah(v.nilai)}
                                                </p>
                                                <p className="mt-1 font-mono text-xs font-bold tracking-wider text-[#2DD4BF]">
                                                    {v.nomor_voucher}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleCopyVoucher(v.nomor_voucher)}
                                                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
                                            >
                                                {copiedVoucher === v.nomor_voucher ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5 text-[#2DD4BF]" aria-hidden="true" />
                                                        <span className="text-[#2DD4BF]">Tersalin!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>Salin Kode</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 8. Tentang CleanWash & Lokasi (#tentang) */}
                    <section id="tentang" className="scroll-mt-20 py-16 sm:py-24">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                                        Atelier Bersih &amp; Terpercaya
                                    </span>
                                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F2933] sm:text-4xl">
                                        Dedikasi untuk Pakaian Bersih, Rapi, &amp; Wangi.
                                    </h2>
                                    <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                                        CleanWash hadir untuk memberikan kepastian dan ketenangan bagi setiap pelanggan. Kami percaya bahwa setiap potong pakaian memiliki nilai berharga, sehingga proses pengerjaan dilakukan terpisah tanpa mencampur cucian antar-pelanggan.
                                    </p>

                                    <div className="mt-8 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
                                                <MapPin className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-[#0F2933]">Lokasi Atelier Utama</p>
                                                <p className="text-xs text-slate-600">Jl. Gejayan No. 88, Sleman, D.I. Yogyakarta</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
                                                <Clock className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-[#0F2933]">Jam Operasional Loket &amp; Kurir</p>
                                                <p className="text-xs text-slate-600">Senin &ndash; Minggu: 07.00 &ndash; 21.00 WIB (Buka Setiap Hari)</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[#0F766E]">
                                                <Phone className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-[#0F2933]">Layanan Bantuan Pelanggan</p>
                                                <p className="text-xs text-slate-600">+62 812-3456-7890 &bull; info@cleanwash.test</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                                    <h3 className="text-lg font-bold text-[#0F2933] mb-4">
                                        Akses Portal Operasional Internal
                                    </h3>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Sistem CleanWash dilengkapi konsol staf berbasis peran untuk Petugas Kasir, Pegawai Lantai Produksi, dan Petugas Pengantaran Rute.
                                    </p>

                                    <div className="mt-6 space-y-3">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-[#0F2933]">Petugas (Kasir)</span>
                                                <p className="text-slate-500">Penerimaan, Cetak Nota, &amp; Kasir</p>
                                            </div>
                                            <span className="font-mono text-[0.6875rem] text-slate-600">petugas@cleanwash.test</span>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-[#0F2933]">Pegawai (Produksi)</span>
                                                <p className="text-slate-500">Antrean Mesin, Timbang, &amp; Insiden</p>
                                            </div>
                                            <span className="font-mono text-[0.6875rem] text-slate-600">pegawai@cleanwash.test</span>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-[#0F2933]">Petugas Pengantaran (Kurir)</span>
                                                <p className="text-slate-500">Rute Pengantaran &amp; Serah Terima</p>
                                            </div>
                                            <span className="font-mono text-[0.6875rem] text-slate-600">kurir@cleanwash.test</span>
                                        </div>
                                    </div>

                                    <Link
                                        href="/login"
                                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] py-3 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59] transition"
                                    >
                                        <span>Masuk ke Portal Operasional</span>
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                {/* 9. Official Footer with Copyright by Yoga */}
                <footer className="border-t border-slate-800 bg-[#0F2933] text-white">
                    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E] text-white">
                                        <Droplets className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <span className="text-lg font-bold tracking-tight text-white">
                                        Clean<span className="text-[#2DD4BF]">Wash</span>
                                    </span>
                                </div>
                                <p className="text-xs text-[#9FB7C0] leading-relaxed">
                                    Sistem informasi manajemen laundry modern terpadu. Presisi finansial desimal, penimbangan tervalidasi, dan garansi perlindungan pakaian.
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-[#2DD4BF] mb-3">Navigasi</p>
                                <ul className="space-y-2 text-xs text-[#9FB7C0]">
                                    <li><a href="#layanan" className="hover:text-white transition">Layanan &amp; Tarif</a></li>
                                    <li><a href="#keunggulan" className="hover:text-white transition">Keunggulan Sistem</a></li>
                                    <li><a href="#lacak" className="hover:text-white transition">Lacak Status Nota</a></li>
                                    <li><a href="#vouchers" className="hover:text-white transition">Voucher Promo</a></li>
                                    <li><a href="#tentang" className="hover:text-white transition">Tentang Kami</a></li>
                                </ul>
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-[#2DD4BF] mb-3">Kepatuhan Sistem</p>
                                <ul className="space-y-2 text-xs text-[#9FB7C0]">
                                    <li>14 Use Cases (SRS Selesai)</li>
                                    <li>9 Kondisi Khusus (KK-01 s.d KK-09)</li>
                                    <li>MySQL 8.4 &bull; Laravel 12 &bull; Inertia React</li>
                                    <li>Pest &bull; Playwright E2E Regression</li>
                                </ul>
                            </div>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-[#2DD4BF] mb-3">Atribusi Pengembang</p>
                                <p className="text-xs text-[#9FB7C0] leading-relaxed">
                                    CleanWash Laundry System dikembangkan dengan standar keandalan software enterprise dan komitmen visual ergonomis.
                                </p>
                                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#2DD4BF]">
                                    <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" aria-hidden="true" />
                                    <span>Developed by Yoga</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 border-t border-slate-700/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9FB7C0]">
                            <p>
                                Copyright &copy; 2026 CleanWash &bull; All rights reserved.
                            </p>
                            <p className="flex items-center gap-1">
                                <span>Designed &amp; Engineered by</span>
                                <strong className="text-white font-semibold">Yoga</strong>
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
