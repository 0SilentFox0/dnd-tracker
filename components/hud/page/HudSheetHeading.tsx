import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function HudSheetHeading({
    children,
    legend,
    className,
}: {
    children: ReactNode;
    legend?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1',
                className
            )}
        >
            <h2 className="hud-sc text-lg leading-tight text-hud-ink">
                {children}
            </h2>
            {legend && (
                <small className="inline-flex items-center gap-2 text-[13px] text-hud-muted">
                    {legend}
                </small>
            )}
        </div>
    );
}
