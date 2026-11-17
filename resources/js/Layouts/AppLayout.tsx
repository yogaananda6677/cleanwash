import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ClipboardCheck,
    Droplets,
    LayoutDashboard,
    LogOut,
    Menu,
    PackageCheck,
    PlusCircle,
    ReceiptText,
    Sparkles,
    TicketPercent,
    Truck,
    Users,
    WashingMachine,
    X,
} from 'lucide-react';
import {
    useEffect,
    useRef,
    useState,
    type PointerEvent,
    type ReactNode,
} from 'react';
import { RoleBadge } from '@/Components/StatusBadge';
import type { SharedPageProps, UserRole } from '@/types';

interface NavItem {
    label: string;
    href: string;
    match: (url: string) => boolean;
    icon: ReactNode;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

interface AppLayoutProps {
    title: string;
    subtitle?: string;
    headerActions?: ReactNode;
    children: ReactNode;
}

const NAV_ICON_CLASS = 'h-[1.125rem] w-[1.125rem] shrink-0';

function getNavGroups(role: UserRole | undefined): NavGroup[] {
    const dashboardItem: NavItem = {
        label: 'Dashboard',
        href: '/dashboard',
        match: (url) => url === '/dashboard' || url.startsWith('/dashboard?'),
        icon: <LayoutDashboard className={NAV_ICON_CLASS} aria-hidden="true" />,
    };

    const insidenItem: NavItem = {
        label: 'Insiden & Kompensasi',
        href: '/insiden',
        match: (url) => url.startsWith('/insiden'),
        icon: <AlertTriangle className={NAV_ICON_CLASS} aria-hidden="true" />,
    };

    if (role === 'PETUGAS') {
        return [
            {
                label: 'Operasional Kasir',
                items: [
                    dashboardItem,
                    {
                        label: 'Penerimaan Baru',
                        href: '/transaksi/create',
                        match: (url) => url.startsWith('/transaksi/create'),
                        icon: (
                            <PlusCircle
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                    {
                        label: 'Transaksi',
                        href: '/transaksi',
                        match: (url) =>
                            url.startsWith('/transaksi') &&
                            !url.startsWith('/transaksi/create'),
                        icon: (
                            <ReceiptText
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                    {
                        label: 'Serah Terima',
                        href: '/serah-terima',
                        match: (url) => url.startsWith('/serah-terima'),
                        icon: (
                            <PackageCheck
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                ],
            },
            {
                label: 'Produksi & Distribusi',
                items: [
                    {
                        label: 'Pengantaran',
                        href: '/pengantaran',
                        match: (url) => url.startsWith('/pengantaran'),
                        icon: (
                            <Truck
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                    insidenItem,
                ],
            },
            {
                label: 'Master Data & Audit',
                items: [
                    {
                        label: 'Pelanggan',
                        href: '/pelanggan',
                        match: (url) => url.startsWith('/pelanggan'),
                        icon: (
                            <Users
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                    {
                        label: 'Jenis Layanan',
                        href: '/layanan',
                        match: (url) => url.startsWith('/layanan'),
                        icon: (
                            <Sparkles
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                    {
                        label: 'Voucher',
                        href: '/voucher',
                        match: (url) => url.startsWith('/voucher'),
                        icon: (
                            <TicketPercent
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                    {
                        label: 'Audit & Piutang',
                        href: '/audit',
                        match: (url) => url.startsWith('/audit'),
                        icon: (
                            <ClipboardCheck
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                ],
            },
        ];
    }

    if (role === 'PEGAWAI') {
        return [
            {
                label: 'Area Produksi',
                items: [
                    dashboardItem,
                    {
                        label: 'Antrean Produksi',
                        href: '/produksi',
                        match: (url) => url.startsWith('/produksi'),
                        icon: (
                            <WashingMachine
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                    insidenItem,
                ],
            },
        ];
    }

    if (role === 'PENGANTAR') {
        return [
            {
                label: 'Operasional Kurir',
                items: [
                    dashboardItem,
                    {
                        label: 'Jadwal Pengantaran',
                        href: '/pengantaran',
                        match: (url) => url.startsWith('/pengantaran'),
                        icon: (
                            <Truck
                                className={NAV_ICON_CLASS}
                                aria-hidden="true"
                            />
                        ),
                    },
                ],
            },
        ];
    }

    return [
        {
            label: 'Navigasi',
            items: [dashboardItem],
        },
    ];
}

function isPointerOutsideDialog(
    clientX: number,
    clientY: number,
    dialog: HTMLDialogElement,
): boolean {
    const rect = dialog.getBoundingClientRect();

    return (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
    );
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
    const navGroups = getNavGroups(user?.role);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [dismissedFlash, setDismissedFlash] = useState<{
        success?: string | null;
        error?: string | null;
        warning?: string | null;
    }>({});

    const drawerDialogRef = useRef<HTMLDialogElement>(null);
    const pressedOutsideRef = useRef(false);

    useEffect(() => {
        setDismissedFlash({});
    }, [flash.success, flash.error, flash.warning]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [page.url]);

    useEffect(() => {
        const dialog = drawerDialogRef.current;
        if (!dialog) {
            return;
        }

        if (sidebarOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (dialog.open) {
            dialog.close();
        }
    }, [sidebarOpen]);

    const handleDrawerPointerDown = (event: PointerEvent<HTMLDialogElement>) => {
        const dialog = drawerDialogRef.current;
        if (!dialog || 'closedBy' in dialog) {
            pressedOutsideRef.current = false;
            return;
        }

        pressedOutsideRef.current = isPointerOutsideDialog(
            event.clientX,
            event.clientY,
            dialog,
        );
    };

    const handleDrawerPointerUp = (event: PointerEvent<HTMLDialogElement>) => {
        const dialog = drawerDialogRef.current;
        if (!dialog || 'closedBy' in dialog) {
            pressedOutsideRef.current = false;
            return;
        }

        const releasedOutside = isPointerOutsideDialog(
            event.clientX,
            event.clientY,
            dialog,
        );

        if (pressedOutsideRef.current && releasedOutside) {
            setSidebarOpen(false);
        }

        pressedOutsideRef.current = false;
    };

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

    const renderSidebarContent = (isMobileDrawer: boolean) => (
        <div className="flex h-full flex-col bg-[#0F2933] text-white">
            <div className="flex items-center justify-between gap-2 border-b border-[#1A3B47] px-4 py-4 sm:px-5">
                <Link
                    href="/dashboard"
                    className="flex min-w-0 items-center gap-3 rounded-xl py-0.5 transition hover:opacity-95"
                    onClick={() => setSidebarOpen(false)}
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-xs ring-1 ring-[#14B8A6]/40">
                        <Droplets className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold tracking-tight text-white">
                            CleanWash
                        </p>
                        <p className="truncate text-[11px] text-[#9FB7C0]">
                            Operasional Laundry
                        </p>
                    </div>
                </Link>
                {isMobileDrawer && (
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Tutup menu navigasi"
                        className="inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center rounded-xl border border-[#1A3B47] bg-[#163C4A] text-[#D5E1E5] transition hover:bg-[#1A3B47] hover:text-white"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}
            </div>

            <nav
                className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
                aria-label="Navigasi utama"
            >
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#9FB7C0]">
                            {group.label}
                        </p>
                        <ul className="space-y-1">
                            {group.items.map((item) => {
                                const active = item.match(page.url);

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            aria-current={
                                                active ? 'page' : undefined
                                            }
                                            onClick={() =>
                                                setSidebarOpen(false)
                                            }
                                            className={`group flex min-h-[2.625rem] items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition ${
                                                active
                                                    ? 'bg-[#163C4A] font-semibold text-white'
                                                    : 'font-medium text-[#D5E1E5] hover:bg-[#163C4A]/70 hover:text-white'
                                            }`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`h-5 w-1 shrink-0 rounded-full transition ${
                                                    active
                                                        ? 'bg-[#14B8A6]'
                                                        : 'bg-transparent'
                                                }`}
                                            />
                                            <span
                                                aria-hidden="true"
                                                className={
                                                    active
                                                        ? 'text-[#2DD4BF]'
                                                        : 'text-[#9FB7C0] group-hover:text-white'
                                                }
                                            >
                                                {item.icon}
                                            </span>
                                            <span className="truncate">
                                                {item.label}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {user && (
                <div className="border-t border-[#1A3B47] p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-[#163C4A] px-1 text-xs font-bold text-[#2DD4BF] ring-1 ring-[#14B8A6]/35">
                            {userInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">
                                {user.name}
                            </p>
                            <p className="truncate text-[11px] text-[#9FB7C0]">
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
        <div className="min-h-screen bg-[#F5F7F8] text-[#0F172A] lg:flex lg:min-h-screen">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#0F2933] focus:px-4 focus:py-2.5 focus:text-xs focus:font-semibold focus:text-white focus:shadow-lg"
            >
                Lewati ke konten utama
            </a>

            {/* Desktop Full-Height Sidebar */}
            <aside className="hidden border-r border-[#1A3B47] bg-[#0F2933] lg:block lg:w-64 lg:shrink-0 print:hidden">
                <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
                    {renderSidebarContent(false)}
                </div>
            </aside>

            {/* Mobile Drawer via Native <dialog> */}
            <dialog
                ref={drawerDialogRef}
                aria-label="Menu navigasi CleanWash"
                {...({ closedby: 'any' } as Record<string, string>)}
                onCancel={(event) => {
                    event.preventDefault();
                    setSidebarOpen(false);
                }}
                onClose={() => {
                    if (sidebarOpen) {
                        setSidebarOpen(false);
                    }
                }}
                onPointerDown={handleDrawerPointerDown}
                onPointerUp={handleDrawerPointerUp}
                className="m-0 mr-auto h-dvh max-h-dvh w-72 max-w-[85vw] overflow-hidden border-0 border-r border-[#1A3B47] bg-[#0F2933] p-0 text-white shadow-2xl backdrop:bg-[#0F2933]/60 backdrop:backdrop-blur-[2px] lg:hidden print:hidden"
            >
                {sidebarOpen && renderSidebarContent(true)}
            </dialog>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-20 border-b border-[#D8E2E6] bg-white print:hidden">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2.5 px-4 py-3 sm:px-6 lg:px-8">
                        <div className="order-1 flex min-w-0 flex-1 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Buka menu navigasi"
                                aria-expanded={sidebarOpen}
                                className="inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center rounded-xl border border-[#7C8C9D] bg-white p-2 text-[#0F172A] transition hover:bg-[#F8FAFC] lg:hidden"
                            >
                                <Menu className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1
                                    id="main-content"
                                    tabIndex={-1}
                                    className="text-base font-bold leading-[1.25] tracking-tight text-[#0F172A] focus:outline-none sm:text-xl"
                                >
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="mt-0.5 hidden truncate text-xs text-[#5B697A] sm:block">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {headerActions && (
                            <div className="order-3 flex w-full flex-wrap items-center gap-2 border-t border-[#D8E2E6] pt-2.5 sm:order-2 sm:w-auto sm:border-t-0 sm:pt-0">
                                {headerActions}
                            </div>
                        )}

                        <div className="order-2 flex shrink-0 items-center gap-2.5 sm:order-3">
                            {user && (
                                <div className="hidden items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 py-1 pl-1.5 pr-2.5 md:flex">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F766E] text-xs font-bold text-white shadow-2xs">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-[#0F172A] leading-tight">
                                            {user.name}
                                        </p>
                                        <div className="mt-0.5">
                                            <RoleBadge role={user.role} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="inline-flex min-h-[2.5rem] shrink-0 items-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] transition hover:border-rose-300 hover:bg-[#FFF1F2] hover:text-[#9F1239] disabled:opacity-50"
                            >
                                <LogOut
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>
                                    {loggingOut ? 'Keluar...' : 'Keluar'}
                                </span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                    {(visibleSuccess || visibleError || visibleWarning) && (
                        <div className="mb-5 space-y-3">
                            {visibleSuccess && (
                                <div
                                    role="status"
                                    className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 border-l-4 border-l-[#047857] bg-[#ECFDF5] px-4 py-3 text-sm text-[#065F46]"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <CheckCircle2
                                            className="mt-0.5 h-4 w-4 shrink-0 text-[#047857]"
                                            aria-hidden="true"
                                        />
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
                                        className="min-h-[1.75rem] shrink-0 text-xs font-semibold text-[#065F46] underline-offset-2 hover:underline"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}

                            {visibleError && (
                                <div
                                    role="alert"
                                    className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 border-l-4 border-l-[#BE123C] bg-[#FFF1F2] px-4 py-3 text-sm text-[#9F1239]"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <AlertCircle
                                            className="mt-0.5 h-4 w-4 shrink-0 text-[#BE123C]"
                                            aria-hidden="true"
                                        />
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
                                        className="min-h-[1.75rem] shrink-0 text-xs font-semibold text-[#9F1239] underline-offset-2 hover:underline"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}

                            {visibleWarning && (
                                <div
                                    role="status"
                                    className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 border-l-4 border-l-[#B45309] bg-[#FFFBEB] px-4 py-3 text-sm text-[#78350F]"
                                >
                                    <div className="flex items-start gap-2.5">
                                        <AlertTriangle
                                            className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]"
                                            aria-hidden="true"
                                        />
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
                                        className="min-h-[1.75rem] shrink-0 text-xs font-semibold text-[#78350F] underline-offset-2 hover:underline"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {children}
                </main>

                <footer className="mt-auto border-t border-slate-200/80 bg-white/70 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
                    <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#0F2933]">CleanWash Operations Console</span>
                            <span>&bull;</span>
                            <span>Versi 1.0</span>
                        </div>
                        <p className="flex items-center gap-1 text-[11px] sm:text-xs">
                            <span>Copyright &copy; 2026 CleanWash &bull; Developed by</span>
                            <strong className="text-[#0F766E] font-bold">Yoga</strong>
                            <span>&bull; All rights reserved.</span>
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
