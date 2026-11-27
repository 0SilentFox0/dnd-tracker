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
        <div className="ds-panel min-w-0 p-3">
            <p className="truncate text-xs text-hud-muted uppercase">{label}</p>
            <p className="text-2xl font-semibold text-hud-ink">{value}</p>
            {delta !== undefined && delta !== null && (
                <p
                    data-testid="kpi-delta"
                    title={hint}
                    className={cn(
                        'text-xs',
                        delta === 0
                            ? 'text-hud-muted'
                            : good
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                    )}
                >
                    {formatDelta(delta)}
                </p>
            )}
        </div>
    );
}
