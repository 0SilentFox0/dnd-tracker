import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function formatDelta(delta: number): string {
    const pct = Math.round(delta * 100);

    return `${pct > 0 ? '+' : ''}${pct}%`;
}

export function KpiTile({
    label,
    value,
    delta,
    invert,
    hint,
}: {
    label: string;
    value: string | number;
    delta?: number | null;
    invert?: boolean;
    hint?: string;
}) {
    const good =
        delta === undefined || delta === null
            ? null
            : invert
              ? delta < 0
              : delta > 0;

    return (
        <div className="ds-panel min-w-0 space-y-1 p-4">
            <p className="truncate text-xs text-hud-muted uppercase">{label}</p>
            <p className="text-2xl font-semibold text-hud-ink tabular-nums">{value}</p>
            {delta !== undefined && delta !== null && (
                <p
                    data-testid="kpi-delta"
                    title={hint}
                    className={cn(
                        'flex items-center gap-0.5 text-xs font-medium tabular-nums',
                        delta === 0
                            ? 'text-hud-muted'
                            : good
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                    )}
                >
                    {delta > 0 && <ArrowUpRight aria-hidden className="size-3.5" />}
                    {delta < 0 && <ArrowDownRight aria-hidden className="size-3.5" />}
                    {formatDelta(delta)}
                </p>
            )}
        </div>
    );
}
