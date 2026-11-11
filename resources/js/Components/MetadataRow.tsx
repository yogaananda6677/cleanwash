import { Fragment, type ReactNode } from 'react';

interface MetadataRowProps {
    items: Array<ReactNode | false | null | undefined>;
    className?: string;
}

export default function MetadataRow({
    items,
    className = '',
}: MetadataRowProps) {
    const visibleItems = items.filter(
        (item): item is ReactNode =>
            item !== null && item !== undefined && item !== false && item !== '',
    );

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <div
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#475569] ${className}`}
        >
            {visibleItems.map((item, index) => (
                <Fragment key={index}>
                    {index > 0 && (
                        <span
                            aria-hidden="true"
                            className="text-[#7C8C9D] select-none"
                        >
                            &bull;
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1">{item}</span>
                </Fragment>
            ))}
        </div>
    );
}
