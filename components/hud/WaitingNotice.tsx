import type { ReactNode } from 'react';
import { Hourglass } from 'lucide-react';

import { cn } from '@/lib/utils';

export function WaitingNotice({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            role="status"
            className={cn(
                'flex min-h-10 items-center justify-center gap-3 border-y border-hud-line bg-hud-panel-2 px-3 py-1.5 text-center',
                className
            )}
        >
            <Hourglass className="size-4 shrink-0 text-hud-muted" />
            <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">
                {children}
            </span>
        </div>
    );
}
