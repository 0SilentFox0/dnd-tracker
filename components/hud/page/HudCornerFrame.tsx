import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const CORNER = 'pointer-events-none absolute size-3 border-hud-gold-strong';

export function HudCornerFrame({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('relative p-1.5', className)}>
            {children}
            <span
                aria-hidden
                className={cn(CORNER, 'top-0 left-0 border-t-2 border-l-2')}
            />
            <span
                aria-hidden
                className={cn(CORNER, 'top-0 right-0 border-t-2 border-r-2')}
            />
            <span
                aria-hidden
                className={cn(CORNER, 'bottom-0 left-0 border-b-2 border-l-2')}
            />
            <span
                aria-hidden
                className={cn(CORNER, 'right-0 bottom-0 border-r-2 border-b-2')}
            />
        </div>
    );
}
