'use client';

import { cn } from '@/lib/utils';

export interface TooltipEntry {
    name?: string | number;
    value?: number | string | null;
    color?: string;
}

export function ChartTooltipBody({
    title,
    entries,
    format,
    single,
}: {
    title: string;
    entries: TooltipEntry[];
    format: (v: number) => string;
    single: boolean;
}) {
    return (
        <div className="min-w-32 rounded-lg border border-hud-line bg-hud-panel-2 px-3 py-2 text-xs text-hud-ink shadow-lg">
            <p className="mb-1 text-hud-muted">{title}</p>
            <ul className="space-y-0.5">
                {entries.map((e) => (
                    <li
                        key={String(e.name)}
                        className="flex items-center gap-2 tabular-nums"
                    >
                        <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: e.color }}
                        />
                        {!single && (
                            <span className="min-w-0 flex-1 truncate">
                                {e.name}
                            </span>
                        )}
                        <span
                            className={cn(
                                'font-semibold',
                                single && 'flex-1 text-right'
                            )}
                        >
                            {typeof e.value === 'number' ? format(e.value) : '—'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
