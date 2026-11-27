import { cn } from '@/lib/utils';

export interface LegendItem {
    id: string;
    label: string;
    color: string;
    dashed?: boolean;
}

export function ChartLegend({
    items,
    caption,
}: {
    items: LegendItem[];
    caption?: string;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-hud-muted">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {items.length > 1 &&
                    items.map((it) => (
                        <li key={it.id} className="flex items-center gap-1.5">
                            <span
                                aria-hidden
                                className={cn(
                                    'inline-block h-0.5 w-4',
                                    it.dashed && 'h-0 border-t-2 border-dashed'
                                )}
                                style={{
                                    background: it.dashed
                                        ? undefined
                                        : it.color,
                                    borderColor: it.color,
                                }}
                            />
                            <span className="text-hud-text">{it.label}</span>
                        </li>
                    ))}
            </ul>
            {caption && <span>{caption}</span>}
        </div>
    );
}
