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
        <div className="ds-panel flex min-w-0 flex-col gap-1 px-3 py-2.5">
            <p className="truncate text-sm text-hud-muted">{label}</p>
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-3xl leading-none font-semibold text-hud-ink tabular-nums">
                    {value}
                </p>
                {delta !== undefined && delta !== null && (
                    <p
                        data-testid="kpi-delta"
                        title={hint}
                        className={cn(
                            'flex items-center gap-0.5 text-sm font-medium tabular-nums',
                            delta === 0
                                ? 'text-hud-muted'
                                : good
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                        )}
                    >
                        {delta > 0 && (
                            <ArrowUpRight aria-hidden className="size-4" />
                        )}
                        {delta < 0 && (
                            <ArrowDownRight aria-hidden className="size-4" />
                        )}
                        {formatDelta(delta)}
                    </p>
                )}
            </div>
        </div>
    );
}
