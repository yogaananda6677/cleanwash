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
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#D8E2E6] bg-white px-4 py-3.5 sm:flex-row sm:px-6">
            <p className="text-xs text-[#475569] tabular-nums">
                Menampilkan{' '}
                <span className="font-semibold text-[#0F172A]">
                    {startItem}–{endItem}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-[#0F172A]">
                    {paginated.total}
                </span>{' '}
                {itemLabel}
            </p>

            {paginated.last_page > 1 && (
                <nav
                    className="flex flex-wrap items-center gap-1.5"
                    aria-label="Navigasi halaman"
                >
                    {paginated.links.map((link, index) => {
                        const label = formatLinkLabel(link.label);

                        if (!link.url) {
                            return (
                                <span
                                    key={`${label}-${index}`}
                                    aria-disabled="true"
                                    className="inline-flex min-h-[2.375rem] min-w-[2.375rem] items-center justify-center rounded-xl border border-[#D8E2E6] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#5B697A] tabular-nums"
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
                                aria-current={link.active ? 'page' : undefined}
                                className={`inline-flex min-h-[2.375rem] min-w-[2.375rem] items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold tabular-nums transition ${
                                    link.active
                                        ? 'border-[#0F766E] bg-[#0F766E] text-white shadow-xs'
                                        : 'border-[#7C8C9D] bg-white text-[#0F172A] hover:bg-[#F8FAFC]'
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
