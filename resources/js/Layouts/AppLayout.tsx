import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import { RoleBadge } from '@/Components/StatusBadge';
import type { SharedPageProps, UserRole } from '@/types';

interface NavItem {
    label: string;
    href: string;
    match: (url: string) => boolean;
    icon: ReactNode;
    badge?: string;
    disabled?: boolean;
}

interface AppLayoutProps {
    title: string;
    subtitle?: string;
    headerActions?: ReactNode;
    children: ReactNode;
}

const INSIDEN_ICON = (
    <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
    </svg>
);

const PRODUKSI_ICON = (
    <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
    </svg>
);

const PENGANTARAN_ICON = (
    <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
        />
    </svg>
);

function getNavItems(role: UserRole | undefined): NavItem[] {
    const dashboardItem: NavItem = {
        label: 'Dashboard',
        href: '/dashboard',
        match: (url) => url === '/dashboard' || url.startsWith('/dashboard?'),
        icon: (
            <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
            </svg>
        ),
    };

    const insidenItem: NavItem = {
        label: 'Insiden & Kompensasi',
        href: '/insiden',
        match: (url) => url.startsWith('/insiden'),
        icon: INSIDEN_ICON,
    };

    if (role === 'PETUGAS') {
        return [
            dashboardItem,
            {
                label: 'Penerimaan Baru',
                href: '/transaksi/create',
                match: (url) => url.startsWith('/transaksi/create'),
                icon: (
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                ),
            },
            {
                label: 'Transaksi',
                href: '/transaksi',
                match: (url) =>
                    url.startsWith('/transaksi') &&
                    !url.startsWith('/transaksi/create'),
                icon: (
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                        />
                    </svg>
                ),
            },
            insidenItem,
            {
                label: 'Pelanggan',
                href: '/pelanggan',
                match: (url) => url.startsWith('/pelanggan'),
                icon: (
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                        />
                    </svg>
                ),
            },
            {
                label: 'Jenis Layanan',
                href: '/layanan',
                match: (url) => url.startsWith('/layanan'),
                icon: (
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                        />
                    </svg>
                ),
            },
            {
                label: 'Voucher',
                href: '/voucher',
                match: (url) => url.startsWith('/voucher'),
                icon: (
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
                        />
                    </svg>
                ),
            },
            {
                label: 'Pengantaran',
                href: '/pengantaran',
                match: (url) => url.startsWith('/pengantaran'),
                icon: PENGANTARAN_ICON,
            },
            {
                label: 'Serah Terima',
                href: '/serah-terima',
                match: (url) => url.startsWith('/serah-terima'),
                icon: (
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                ),
            },
            {
                label: 'Audit & Piutang',
                href: '/audit',
                match: (url) => url.startsWith('/audit'),
                icon: (
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                    </svg>
                ),
            },
        ];
    }

    if (role === 'PEGAWAI') {
        return [
            dashboardItem,
            {
                label: 'Antrean Produksi',
                href: '/produksi',
                match: (url) => url.startsWith('/produksi'),
                icon: PRODUKSI_ICON,
            },
            insidenItem,
        ];
    }

    if (role === 'PENGANTAR') {
        return [
            dashboardItem,
            {
                label: 'Jadwal Pengantaran',
                href: '/pengantaran',
                match: (url) => url.startsWith('/pengantaran'),
                icon: PENGANTARAN_ICON,
            },
        ];
    }

    return [dashboardItem];
}

export default function AppLayout({
    title,
    subtitle,
    headerActions,
    children,
}: AppLayoutProps) {
    const page = usePage<SharedPageProps>();
    const { auth, flash } = page.props;
    const user = auth.user;
    const navItems = getNavItems(user?.role);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [dismissedFlash, setDismissedFlash] = useState<{
        success?: string | null;
        error?: string | null;
        warning?: string | null;
    }>({});

    useEffect(() => {
        setDismissedFlash({});
    }, [flash.success, flash.error, flash.warning]);

    useEffect(() => {
        if (!sidebarOpen) {
            return;
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [sidebarOpen]);

    const handleLogout = () => {
        if (loggingOut) {
            return;
        }

        setLoggingOut(true);
        router.post(
            '/logout',
            {},
            {
                onFinish: () => setLoggingOut(false),
            },
        );
    };

    const userInitials = (user?.name ?? 'CW')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    const sidebarContent = (
        <div className="flex h-full flex-col bg-slate-900 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 focus:outline-none"
                    onClick={() => setSidebarOpen(false)}
                >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-sm font-bold text-white shadow-sm">
                        CW
                    </span>
                    <div>
                        <p className="text-sm font-bold tracking-tight text-white">
                            CleanWash
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Operasional Laundry
                        </p>
                    </div>
                </Link>
                <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Tutup menu navigasi"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
                >
                    <svg
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>
            </div>

            <nav
                className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
                aria-label="Navigasi utama"
            >
                {navItems.map((item) => {
                    const active = item.match(page.url);

                    if (item.disabled) {
                        return (
                            <div
                                key={item.label}
                                aria-disabled="true"
                                className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 opacity-75"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="text-slate-500">
                                        {item.icon}
                                    </span>
                                    <span>{item.label}</span>
                                </span>
                                {item.badge && (
                                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                                active
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            <span className="flex items-center gap-3">
                                <span
                                    className={
                                        active ? 'text-white' : 'text-slate-400'
                                    }
                                >
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </span>
                            {item.badge && (
                                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {user && (
                <div className="border-t border-slate-800 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/40">
                            {userInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">
                                {user.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                                {user.email}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const visibleSuccess =
        flash.success && dismissedFlash.success !== flash.success
            ? flash.success
            : null;
    const visibleError =
        flash.error && dismissedFlash.error !== flash.error
            ? flash.error
            : null;
    const visibleWarning =
        flash.warning && dismissedFlash.warning !== flash.warning
            ? flash.warning
            : null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Desktop Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
                {sidebarContent}
            </aside>

            {/* Mobile Drawer */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 flex lg:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu navigasi CleanWash"
                >
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="relative z-50 w-64 max-w-[80vw]">
                        {sidebarContent}
                    </aside>
                </div>
            )}

            <div className="flex min-h-screen flex-col lg:pl-64">
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Buka menu navigasi"
                                aria-expanded={sidebarOpen}
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.75}
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                    />
                                </svg>
                            </button>
                            <div className="min-w-0">
                                <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="truncate text-xs text-slate-500">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            {headerActions}
                            {user && (
                                <div className="hidden items-center gap-2 sm:flex">
                                    <RoleBadge role={user.role} />
                                    <span className="text-xs font-medium text-slate-700">
                                        {user.name}
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                            >
                                <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.75}
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                                    />
                                </svg>
                                <span>
                                    {loggingOut ? 'Keluar...' : 'Keluar'}
                                </span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
                    {(visibleSuccess || visibleError || visibleWarning) && (
                        <div className="mb-6 space-y-3">
                            {visibleSuccess && (
                                <div
                                    role="status"
                                    className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                        <p className="font-medium">
                                            {visibleSuccess}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDismissedFlash((prev) => ({
                                                ...prev,
                                                success: flash.success,
                                            }))
                                        }
                                        aria-label="Tutup notifikasi sukses"
                                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}

                            {visibleError && (
                                <div
                                    role="alert"
                                    className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                                        <p className="font-medium">
                                            {visibleError}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDismissedFlash((prev) => ({
                                                ...prev,
                                                error: flash.error,
                                            }))
                                        }
                                        aria-label="Tutup notifikasi error"
                                        className="text-xs font-semibold text-rose-700 hover:text-rose-900"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}

                            {visibleWarning && (
                                <div
                                    role="status"
                                    className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                                        <p className="font-medium">
                                            {visibleWarning}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDismissedFlash((prev) => ({
                                                ...prev,
                                                warning: flash.warning,
                                            }))
                                        }
                                        aria-label="Tutup notifikasi peringatan"
                                        className="text-xs font-semibold text-amber-700 hover:text-amber-900"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
