import { Head, usePage } from '@inertiajs/react';
import type { SharedPageProps } from '@/types';

interface WelcomeProps extends SharedPageProps {
    appName: string;
    laravelVersion: string;
    phpVersion: string;
}

export default function Welcome({
    appName,
    laravelVersion,
    phpVersion,
}: WelcomeProps) {
    const { props } = usePage<WelcomeProps>();

    return (
        <>
            <Head title="Selamat Datang" />
            <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-slate-100 p-6">
                <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                        Phase 1 Foundation Ready
                    </span>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                        {appName}
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Sistem Informasi Manajemen Operasional Laundry berbasis
                        Laravel {laravelVersion} (PHP {phpVersion}), MySQL 8.4,
                        dan Inertia.js React TypeScript.
                    </p>
                    <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                        <div>
                            <dt className="font-semibold text-slate-800">
                                Status Sesi
                            </dt>
                            <dd className="mt-1">
                                {props.auth.user
                                    ? `Masuk sebagai ${props.auth.user.name}`
                                    : 'Tamu (Belum Login)'}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-slate-800">
                                Zona Waktu
                            </dt>
                            <dd className="mt-1">Asia/Jakarta (WIB)</dd>
                        </div>
                    </dl>
                </section>
            </main>
        </>
    );
}
