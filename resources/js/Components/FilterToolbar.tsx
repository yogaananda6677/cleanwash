import { RotateCcw, Search } from 'lucide-react';
import { useId, type FormEvent, type ReactNode } from 'react';

export const FILTER_LABEL_CLASS =
    'block text-xs font-semibold text-[#475569]';

export const FILTER_INPUT_CLASS =
    'mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20';

export const FILTER_SELECT_CLASS =
    'mt-1.5 block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-sm text-[#0F172A] shadow-xs transition focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20';

export const FILTER_SUBMIT_BUTTON_CLASS =
    'inline-flex min-h-[2.625rem] items-center justify-center gap-2 rounded-xl bg-[#0F2933] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#163C4A]';

export const FILTER_RESET_BUTTON_CLASS =
    'inline-flex min-h-[2.625rem] items-center justify-center gap-1.5 rounded-xl border border-[#7C8C9D] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]';

interface FilterToolbarProps {
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    ariaLabel?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchLabel?: string;
    searchPlaceholder?: string;
    searchId?: string;
    searchName?: string;
    submitLabel?: string;
    onReset?: () => void;
    resetLabel?: string;
    hasActiveFilters?: boolean;
    children?: ReactNode;
    className?: string;
}

export default function FilterToolbar({
    onSubmit,
    ariaLabel = 'Filter dan pencarian data',
    searchValue,
    onSearchChange,
    searchLabel = 'Pencarian',
    searchPlaceholder = 'Cari kata kunci...',
    searchId,
    searchName = 'search',
    submitLabel = 'Terapkan',
    onReset,
    resetLabel = 'Reset',
    hasActiveFilters = true,
    children,
    className = '',
}: FilterToolbarProps) {
    const generatedId = useId();
    const resolvedSearchId = searchId ?? `${generatedId}-search`;
    const usesBuiltInSearch =
        searchValue !== undefined && onSearchChange !== undefined;

    return (
        <search
            aria-label={ariaLabel}
            className={`block rounded-2xl border border-[#D8E2E6] bg-white p-4 shadow-[0_1px_2px_rgba(15,41,51,0.04)] sm:p-5 ${className}`}
        >
            <form onSubmit={onSubmit} className="space-y-4">
                {usesBuiltInSearch ? (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="min-w-0 flex-1">
                            <label
                                htmlFor={resolvedSearchId}
                                className={FILTER_LABEL_CLASS}
                            >
                                {searchLabel}
                            </label>
                            <div className="relative mt-1.5">
                                <Search
                                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B697A]"
                                    aria-hidden="true"
                                />
                                <input
                                    id={resolvedSearchId}
                                    name={searchName}
                                    type="search"
                                    value={searchValue}
                                    onChange={(event) =>
                                        onSearchChange(event.target.value)
                                    }
                                    placeholder={searchPlaceholder}
                                    className="block min-h-[2.625rem] w-full rounded-xl border border-[#7C8C9D] bg-white py-2 pl-10 pr-3.5 text-sm text-[#0F172A] placeholder:text-[#5B697A] shadow-xs transition focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                                />
                            </div>
                        </div>

                        {children}

                        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                            <button
                                type="submit"
                                className={FILTER_SUBMIT_BUTTON_CLASS}
                            >
                                {submitLabel}
                            </button>
                            {onReset && hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={onReset}
                                    className={FILTER_RESET_BUTTON_CLASS}
                                >
                                    <RotateCcw
                                        className="h-3.5 w-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>{resetLabel}</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    children
                )}
            </form>
        </search>
    );
}
