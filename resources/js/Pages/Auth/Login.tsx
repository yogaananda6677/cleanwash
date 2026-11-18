import { Head, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    ReceiptText,
    Truck,
    WashingMachine,
} from 'lucide-react';
import CleanWashLogo from '@/Components/CleanWashLogo';
import { useState, type FormEvent } from 'react';
import type { SharedPageProps } from '@/types';

const OPERATIONAL_PILLARS = [
    {
        icon: ReceiptText,
        title: 'Penerimaan Nota & Snapshot Tarif',
        description:
            'Kalkulasi kg/pcs presisi, validasi voucher atomik (KK-03), dan snapshot tarif permanen (KK-09).',
    },
    {
        icon: WashingMachine,
        title: 'Produksi Dinamis & Insiden',
        description:
            'Tahap cuci-setrika adaptif per layanan, timbang ulang otomatis (KK-01), dan kompensasi per item.',
    },
    {
        icon: Truck,
        title: 'Kurir Multi-Pelanggan & Loket',
        description:
            'Sesi antar terisolasi (KK-07), verifikasi hak bayar akhir (KK-06), dan pelunasan piutang transparan.',
    },
] as const;

export default function Login() {
    const { flash } = usePage<SharedPageProps>().props;
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/login', {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Masuk Sistem" />

            <div className="min-h-screen bg-[#F5F7F8] text-[#0F172A] lg:grid lg:grid-cols-12">
                <a
                    href="#email"
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#0B132B] focus:px-4 focus:py-2.5 focus:text-xs focus:font-semibold focus:text-white focus:shadow-lg"
                >
                    Lewati ke formulir masuk
                </a>

                {/* Left Showcase Panel (Compact mobile header + full desktop split showcase) */}
                <section className="relative overflow-hidden bg-[#0B132B] px-5 py-6 text-white sm:px-8 lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:px-10 lg:py-12">
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2563EB]/15 blur-2xl"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#1E40AF]/20 blur-3xl"
                    />

                    <div className="relative">
                        <div className="flex items-start gap-3.5">
                            <CleanWashLogo
                                variant="mark"
                                theme="dark"
                                size="lg"
                            />
                            <div>
                                <h1
                                    id="main-content"
                                    tabIndex={-1}
                                    className="text-xl font-bold tracking-tight text-white focus:outline-none sm:text-2xl"
                                >
                                    CleanWash Laundry
                                </h1>
                                <p className="mt-0.5 text-xs text-[#94A3B8] sm:text-sm">
                                    Manajemen Operasional Laundry Terpadu
                                </p>
                            </div>
                        </div>

                        <div className="mt-10 hidden space-y-4 lg:block">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#60A5FA]">
                                3 Pilar Operasional Terkendali
                            </p>
                            <ul className="space-y-3">
                                {OPERATIONAL_PILLARS.map((pillar) => {
                                    const Icon = pillar.icon;
                                    return (
                                        <li
                                            key={pillar.title}
                                            className="flex items-start gap-3.5 rounded-2xl border border-[#1E293B] bg-[#1E293B]/70 p-4"
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0B132B] text-[#60A5FA] ring-1 ring-[#3B82F6]/25">
                                                <Icon
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white">
                                                    {pillar.title}
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-[#CBD5E1]">
                                                    {pillar.description}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>

                    <div className="relative mt-8 hidden flex-col gap-1.5 border-t border-[#1E293B] pt-5 text-xs text-[#94A3B8] lg:flex">
                        <div className="flex items-center gap-2">
                            <Clock
                                className="h-4 w-4 shrink-0 text-[#60A5FA]"
                                aria-hidden="true"
                            />
                            <span>
                                CleanWash Operations Console &middot; Zona waktu
                                Asia/Jakarta (WIB)
                            </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8]">
                            Copyright &copy; 2026 CleanWash &bull; Developed by{' '}
                            <strong className="text-[#60A5FA] font-semibold">Yoga</strong>. All rights reserved.
                        </p>
                    </div>
                </section>

                {/* Right Authentication Card */}
                <main className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:col-span-7 lg:px-12 lg:py-12">
                    <div className="mx-auto w-full max-w-md">
                        <div className="rounded-2xl border border-[#D8E2E6] bg-white p-6 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-8">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-[#0F172A] sm:text-xl">
                                    Masuk ke Konsol Staf
                                </h2>
                                <p className="mt-1 text-xs leading-relaxed text-[#5B697A] sm:text-sm">
                                    Gunakan email dan kata sandi akun staf untuk
                                    mengakses panel Kasir, Produksi, atau Kurir.
                                </p>
                            </div>

                            {flash.error && (
                                <div
                                    role="alert"
                                    className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-xs font-medium text-[#9F1239]"
                                >
                                    <AlertCircle
                                        className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                        aria-hidden="true"
                                    />
                                    <p>{flash.error}</p>
                                </div>
                            )}

                            {flash.success && (
                                <div
                                    role="status"
                                    className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] px-4 py-3 text-xs font-medium text-[#065F46]"
                                >
                                    <CheckCircle2
                                        className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                                        aria-hidden="true"
                                    />
                                    <p>{flash.success}</p>
                                </div>
                            )}

                            <form
                                onSubmit={handleSubmit}
                                className="mt-6 space-y-5"
                            >
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-semibold text-[#0F172A]"
                                    >
                                        Alamat Email{' '}
                                        <span
                                            aria-hidden="true"
                                            className="text-rose-600"
                                        >
                                            *
                                        </span>
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={data.email}
                                        onChange={(event) =>
                                            setData('email', event.target.value)
                                        }
                                        placeholder="petugas@cleanwash.local"
                                        aria-invalid={Boolean(errors.email)}
                                        className={`mt-1.5 block min-h-[2.75rem] w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:outline-none focus:ring-2 ${
                                            errors.email
                                                ? 'border-[#BE123C] focus:border-[#BE123C] focus:ring-rose-200'
                                                : 'border-[#7C8C9D] focus:border-[#2563EB] focus:ring-[#2563EB]/20'
                                        }`}
                                    />
                                    {errors.email && (
                                        <p className="mt-1.5 text-xs font-medium text-rose-600">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-semibold text-[#0F172A]"
                                    >
                                        Kata Sandi{' '}
                                        <span
                                            aria-hidden="true"
                                            className="text-rose-600"
                                        >
                                            *
                                        </span>
                                    </label>
                                    <div className="relative mt-1.5">
                                        <input
                                            id="password"
                                            name="password"
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            autoComplete="current-password"
                                            required
                                            value={data.password}
                                            onChange={(event) =>
                                                setData(
                                                    'password',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Masukkan kata sandi"
                                            aria-invalid={Boolean(
                                                errors.password,
                                            )}
                                            className={`block min-h-[2.75rem] w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-22 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:outline-none focus:ring-2 ${
                                                errors.password
                                                    ? 'border-[#BE123C] focus:border-[#BE123C] focus:ring-rose-200'
                                                    : 'border-[#7C8C9D] focus:border-[#2563EB] focus:ring-[#2563EB]/20'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((prev) => !prev)
                                            }
                                            className="absolute inset-y-0 right-0 inline-flex min-h-[2.75rem] items-center gap-1 rounded-r-xl px-3 text-xs font-semibold text-[#475569] transition hover:text-[#0F172A]"
                                        >
                                            {showPassword ? (
                                                <EyeOff
                                                    className="h-3.5 w-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Eye
                                                    className="h-3.5 w-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span>
                                                {showPassword
                                                    ? 'Tutup'
                                                    : 'Lihat'}
                                            </span>
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1.5 text-xs font-medium text-rose-600">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="remember"
                                        className="inline-flex min-h-[2rem] cursor-pointer items-center gap-2 text-xs font-medium text-[#475569]"
                                    >
                                        <input
                                            id="remember"
                                            name="remember"
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(event) =>
                                                setData(
                                                    'remember',
                                                    event.target.checked,
                                                )
                                            }
                                            className="h-4 w-4 rounded border-[#7C8C9D] text-[#2563EB] accent-[#2563EB]"
                                        />
                                        <span>Ingat sesi saya</span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? 'Memverifikasi...' : 'Masuk'}
                                </button>
                            </form>
                        </div>

                        <div className="mt-5 space-y-1 text-center text-xs text-[#5B697A] lg:hidden">
                            <p className="flex items-center justify-center gap-1.5">
                                <Clock
                                    className="h-3.5 w-3.5 shrink-0 text-[#2563EB]"
                                    aria-hidden="true"
                                />
                                <span>
                                    CleanWash Operations Console &middot; Zona waktu
                                    Asia/Jakarta (WIB)
                                </span>
                            </p>
                            <p className="text-[11px] text-slate-500">
                                Copyright &copy; 2026 CleanWash &bull; Developed by{' '}
                                <strong className="text-[#2563EB] font-semibold">Yoga</strong>
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
