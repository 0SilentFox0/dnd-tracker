import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function HudSectionTitle({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <h2
            className={cn(
                'hud-sc flex items-center gap-3 text-[13px] tracking-[.12em] text-hud-gold uppercase',
                className
            )}
        >
            {children}
            <span aria-hidden className="h-px flex-1 bg-hud-rule" />
        </h2>
    );
}
