import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function RollResultView({
    total,
    detail,
    accent,
    children,
}: {
    total: ReactNode;
    detail: ReactNode;
    accent?: { tone: 'crit' | 'fumble'; label: string };
    children?: ReactNode;
}) {
    return (
        <div aria-live="polite" className="motion-rise text-center">
            {accent && (
                <div
                    className={cn(
                        'text-xs font-bold tracking-[.08em] uppercase',
                        accent.tone === 'crit'
                            ? 'text-hud-gold'
                            : 'text-hud-danger'
                    )}
                >
                    {accent.label}
                </div>
            )}
            <div
                className={cn(
                    'text-4xl font-bold tabular-nums',
                    accent?.tone === 'fumble'
                        ? 'text-hud-danger'
                        : 'text-hud-ink'
                )}
            >
                {total}
            </div>
            <div className="text-xs text-hud-muted">{detail}</div>
            {children}
        </div>
    );
}
