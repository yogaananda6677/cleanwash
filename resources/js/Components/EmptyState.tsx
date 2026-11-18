import { Link } from '@inertiajs/react';
import { PackageOpen } from 'lucide-react';
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#7C8C9D] bg-white px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] ring-1 ring-[#DBEAFE]">
                {icon ?? (
                    <PackageOpen className="h-6 w-6" aria-hidden="true" />
                )}
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#0F172A]">{title}</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#5B697A]">
                {description}
            </p>
            {actionLabel && actionHref && (
                <Link
                    href={actionHref}
                    className="mt-5 inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                >
                    {actionLabel}
                </Link>
            )}
            {actionLabel && !actionHref && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-5 inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
