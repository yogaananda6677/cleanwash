import { Head, useForm, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import type { SharedPageProps } from '@/types';

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

            <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-md">
                    <div className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-base font-bold text-white shadow-lg shadow-sky-500/30">
                            CW
                        </div>
                        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
                            CleanWash Laundry
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-300">
                            Masuk ke panel operasional sesuai peran staf Anda.
                        </p>
                    </div>

                    <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xl sm:p-8">
                        {flash.error && (
                            <div
                                role="alert"
                                className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"
                            >
                                {flash.error}
                            </div>
                        )}

                        {flash.success && (
                            <div
                                role="status"
                                className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800"
                            >
                                {flash.success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-slate-700"
                                >
                                    Alamat Email
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
                                    className={`mt-1.5 block w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 shadow-xs transition focus:outline-none focus:ring-2 ${
                                        errors.email
                                            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                                            : 'border-slate-300 focus:border-sky-500 focus:ring-sky-200'
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
                                    className="block text-sm font-medium text-slate-700"
                                >
                                    Kata Sandi
                                </label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
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
                                        className={`block w-full rounded-xl border px-3.5 py-2.5 pr-16 text-sm text-slate-900 shadow-xs transition focus:outline-none focus:ring-2 ${
                                            errors.password
                                                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                                                : 'border-slate-300 focus:border-sky-500 focus:ring-sky-200'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-slate-500 hover:text-slate-700"
                                    >
                                        {showPassword ? 'Tutup' : 'Lihat'}
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
                                    className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"
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
                                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                    />
                                    <span>Ingat sesi saya</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing ? 'Memverifikasi...' : 'Masuk'}
                            </button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-400">
                        CleanWash Operations Console &middot; Zona waktu Asia/Jakarta (WIB)
                    </p>
                </div>
            </div>
        </>
    );
}
