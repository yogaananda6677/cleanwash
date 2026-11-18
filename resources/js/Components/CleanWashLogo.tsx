import React from 'react';

export interface CleanWashLogoProps {
    variant?: 'full' | 'mark' | 'horizontal';
    theme?: 'light' | 'dark';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    subtext?: string;
    showSubtext?: boolean;
}

/**
 * CleanWash Hydro-Textile Monogram & Wordmark
 *
 * Artisanal vector identity combining pure water rotation and woven fabric folds.
 * Designed with precision geometric curves (CW monogram) and high contrast typography.
 */
export const CleanWashLogo: React.FC<CleanWashLogoProps> = ({
    variant = 'full',
    theme = 'light',
    size = 'md',
    className = '',
    subtext = 'LAUNDRY ATELIER',
    showSubtext = true,
}) => {
    // Size scales for the emblem
    const emblemSizes = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-14 w-14',
    };

    const textSizes = {
        sm: { title: 'text-base', sub: 'text-[9px]' },
        md: { title: 'text-lg', sub: 'text-[10px]' },
        lg: { title: 'text-xl', sub: 'text-[11px]' },
        xl: { title: 'text-2xl', sub: 'text-xs' },
    };

    const isDark = theme === 'dark';

    // The Hydro-Textile Monogram Emblem SVG (Clean 'C' outer sweep + Wash 'W' woven fold + Purity Star)
    const Emblem = (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${emblemSizes[size]} shrink-0 transition-transform duration-200`}
            aria-hidden="true"
        >
            <defs>
                {/* Background Squircle Gradient */}
                <linearGradient id="cw-bg-gradient-dark" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1E3A8A" />
                    <stop offset="100%" stopColor="#0B132B" />
                </linearGradient>
                <linearGradient id="cw-bg-gradient-light" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>

                {/* Primary Water Flow Arc */}
                <linearGradient id="cw-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#93C5FD" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>

                {/* Interlocking Textile W Fold */}
                <linearGradient id="cw-textile-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                </linearGradient>

                {/* Subtle Glow Filter */}
                <filter id="cw-sparkle-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="0.8" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Squircle Badge Container */}
            <rect
                x="1.5"
                y="1.5"
                width="45"
                height="45"
                rx="13"
                fill={isDark ? 'url(#cw-bg-gradient-dark)' : 'url(#cw-bg-gradient-light)'}
                stroke={isDark ? '#3B82F6' : '#60A5FA'}
                strokeWidth="1.5"
                strokeOpacity={isDark ? '0.35' : '0.4'}
            />

            {/* Circular Drum / Outer Water Sweep ('C' Monogram Arc) */}
            <path
                d="M34 14.5C31.2 11.2 27.2 9.5 22.5 9.5C14.5 9.5 8.5 15.5 8.5 23.5C8.5 31.5 14.5 37.5 22.5 37.5C28.2 37.5 32.8 34.2 34.8 29.5"
                stroke="url(#cw-arc-grad)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Inner Woven Fabric Weave ('W' Fold Motif) */}
            <path
                d="M15 22.5L19.5 31.5L23.5 24L27.5 31.5L32 22.5"
                stroke="url(#cw-textile-grad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Pure Textile Sparkle / Atelier Diamond Star at (36, 12) */}
            <g transform="translate(36, 12)" filter="url(#cw-sparkle-glow)">
                <path
                    d="M0 -3.8C0.3 -1.2 1.2 -0.3 3.8 0C1.2 0.3 0.3 1.2 0 3.8C-0.3 1.2 -1.2 0.3 -3.8 0C-1.2 -0.3 -0.3 -1.2 0 -3.8Z"
                    fill="#FFFFFF"
                />
            </g>

            {/* Pure Water Micro Droplet at (11.5, 14.5) */}
            <circle cx="12" cy="14" r="1.5" fill="#BFDBFE" />
        </svg>
    );

    if (variant === 'mark') {
        return <div className={`inline-flex items-center justify-center ${className}`}>{Emblem}</div>;
    }

    const { title: titleClass, sub: subClass } = textSizes[size];

    return (
        <div className={`inline-flex items-center gap-3 ${className}`}>
            {Emblem}
            <div className="min-w-0">
                <div className="flex items-center tracking-tight leading-none">
                    <span
                        className={`font-black ${titleClass} ${
                            isDark ? 'text-white' : 'text-[#0B132B]'
                        }`}
                    >
                        Clean
                    </span>
                    <span
                        className={`font-bold ${titleClass} ${
                            isDark ? 'text-[#60A5FA]' : 'text-[#2563EB]'
                        }`}
                    >
                        Wash
                    </span>
                </div>
                {showSubtext && (
                    <p
                        className={`mt-1 font-semibold tracking-[0.22em] uppercase leading-none ${subClass} ${
                            isDark ? 'text-[#94A3B8]' : 'text-[#64748B]'
                        }`}
                    >
                        {subtext}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CleanWashLogo;
