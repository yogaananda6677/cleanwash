import { Link } from '@inertiajs/react';
import type { Paginated } from '@/types';

interface PaginationProps<T> {
    paginated: Paginated<T>;
    itemLabel?: string;
}

function formatLinkLabel(rawLabel: string): string {
    const normalized = rawLabel
        .replaceAll('&laquo;', '«')
        .replaceAll('&raquo;', '»')
        .replaceAll('&hellip;', '...')
        .trim();

    if (normalized.includes('Previous')) {
        return '« Sebelumnya';
    }

    if (normalized.includes('Next')) {
        return 'Berikutnya »';
    }

    return normalized;
}

export default function Pagination<T>({
    paginated,
    itemLabel = 'data',
}: PaginationProps<T>) {
    if (paginated.total === 0) {
        return null;
    }

    const startItem =
        paginated.from ??
        (paginated.current_page - 1) * paginated.per_page + 1;
    const endItem =
        paginated.to ??
        Math.min(paginated.current_page * paginated.per_page, paginated.total);

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:px-6">
            <p className="text-xs text-slate-600">
                Menampilkan{' '}
                <span className="font-semibold text-slate-900">
                    {startItem}–{endItem}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-slate-900">
                    {paginated.total}
                </span>{' '}
                {itemLabel}
            </p>

            {paginated.last_page > 1 && (
                <nav
                    className="flex flex-wrap items-center gap-1"
                    aria-label="Navigasi halaman"
                >
                    {paginated.links.map((link, index) => {
                        const label = formatLinkLabel(link.label);

                        if (!link.url) {
                            return (
                                <span
                                    key={`${label}-${index}`}
                                    className="inline-flex min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-400"
                                >
                                    {label}
                                </span>
                            );
                        }

                        return (
                            <Link
                                key={`${label}-${index}`}
                                href={link.url}
                                preserveScroll
                                preserveState
                                className={`inline-flex min-w-8 items-center justify-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                                    link.active
                                        ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
