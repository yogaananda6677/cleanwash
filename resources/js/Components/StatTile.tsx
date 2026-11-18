import { Link } from '@inertiajs/react';
import { ArrowRight, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { StatusBadge, type BadgeTone } from '@/Components/StatusBadge';

export type StatTileTone =
    | 'neutral'
    | 'brand'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'indigo';

const ICON_SURFACE_CLASSES: Record<StatTileTone, string> = {
    neutral: 'bg-[#F8FAFC] text-[#475569] ring-[#D8E2E6]',
    brand: 'bg-[#EFF6FF] text-[#2563EB] ring-blue-200',
    emerald: 'bg-[#ECFDF5] text-[#047857] ring-emerald-200',
    amber: 'bg-[#FFFBEB] text-[#B45309] ring-amber-200',
    rose: 'bg-[#FFF1F2] text-[#BE123C] ring-rose-200',
    indigo: 'bg-[#EEF2FF] text-[#4338CA] ring-indigo-200',
};

const VALUE_ACCENT_CLASSES: Record<StatTileTone, string> = {
    neutral: 'text-[#0F172A]',
    brand: 'text-[#0F172A]',
    emerald: 'text-[#065F46]',
    amber: 'text-[#78350F]',
    rose: 'text-[#9F1239]',
    indigo: 'text-[#3730A3]',
};

interface StatTileProps {
    label: string;
    value: number | string;
    hint?: string;
    icon?: ReactNode;
    tone?: StatTileTone;
    valueClassName?: string;
    href?: string;
    hrefLabel?: string;
    badgeText?: string;
    badgeTone?: BadgeTone;
    onClick?: () => void;
    active?: boolean;
    activeLabel?: string;
    className?: string;
}

export default function StatTile({
    label,
    value,
    hint,
    icon,
    tone = 'neutral',
    valueClassName,
    href,
    hrefLabel = 'Lihat detail',
    badgeText,
    badgeTone = 'amber',
    onClick,
    active = false,
    activeLabel = 'Aktif',
    className = '',
}: StatTileProps) {
    const resolvedValueColor =
        valueClassName ?? VALUE_ACCENT_CLASSES[tone] ?? 'text-[#0F172A]';

    const content = (
        <>
            <div className="min-w-0">
                <div className="flex items-start justify-between gap-2.5">
                    <p className="text-xs font-medium leading-snug text-[#5B697A]">
                        {label}
                    </p>
                    {onClick && active ? (
                        <span className="inline-flex min-h-[1.375rem] shrink-0 items-center gap-1 rounded-full bg-[#2563EB] px-2 py-0.5 text-[11px] font-semibold text-white">
                            <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {activeLabel}
                        </span>
                    ) : icon ? (
                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${ICON_SURFACE_CLASSES[tone]}`}
                            aria-hidden="true"
                        >
                            {icon}
                        </span>
                    ) : badgeText ? (
                        <StatusBadge tone={badgeTone}>{badgeText}</StatusBadge>
                    ) : null}
                </div>

                <p
                    className={`mt-2.5 text-2xl font-bold leading-[1.15] tracking-tight tabular-nums sm:text-[1.75rem] ${resolvedValueColor}`}
                >
                    {value}
                </p>

                {hint && (
                    <p className="mt-1.5 text-xs leading-relaxed text-[#5B697A]">
                        {hint}
                    </p>
                )}

                {icon && badgeText && !(onClick && active) && (
                    <div className="mt-2">
                        <StatusBadge tone={badgeTone}>{badgeText}</StatusBadge>
                    </div>
                )}
            </div>

            {href && !onClick && (
                <Link
                    href={href}
                    className="mt-3 inline-flex min-h-[1.75rem] items-center gap-1 text-xs font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]"
                >
                    <span>{hrefLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </Link>
            )}
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                aria-pressed={active}
                className={`flex w-full flex-col justify-between rounded-2xl p-4 text-left transition sm:p-5 ${
                    active
                        ? 'border-2 border-[#2563EB] bg-[#EFF6FF] shadow-xs'
                        : 'border border-[#D8E2E6] bg-white shadow-[0_1px_2px_rgba(15,41,51,0.04)] hover:border-[#7C8C9D] hover:bg-[#F8FAFC]'
                } ${className}`}
            >
                {content}
            </button>
        );
    }

    return (
        <div
            className={`flex flex-col justify-between rounded-2xl border border-[#D8E2E6] bg-white p-4 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-5 ${className}`}
        >
            {content}
        </div>
    );
}
