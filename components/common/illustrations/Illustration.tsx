import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface IllustrationProps {
    className?: string;
}

export function Illustration({
    className,
    children,
}: IllustrationProps & { children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 160 120"
            aria-hidden
            focusable="false"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('h-24 w-auto text-hud-muted sm:h-[120px]', className)}
        >
            {children}
        </svg>
    );
}

export const ACCENT = 'var(--color-hud-accent, currentColor)';
