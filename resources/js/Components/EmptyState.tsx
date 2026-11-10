import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    icon?: ReactNode;
}

export default function EmptyState({
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    icon,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                {icon ?? (
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V3.375m9 4.125H3"
                        />
                    </svg>
                )}
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {title}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                {description}
            </p>
            {actionLabel && actionHref && (
                <Link
                    href={actionHref}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                >
                    {actionLabel}
                </Link>
            )}
            {actionLabel && !actionHref && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
