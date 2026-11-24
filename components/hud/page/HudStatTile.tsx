import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface HudStatTileProps {
    icon: LucideIcon;
    short: string;
    value: string | number;
    label?: string;
    accent?: boolean;
}

export function HudStatTile({
    icon: Icon,
    short,
    value,
    label,
    accent,
}: HudStatTileProps) {
    return (
        <div
            aria-label={label}
            className={cn(
                'min-w-0 rounded-xl border bg-hud-panel/60 px-3 py-2 backdrop-blur-sm',
                accent ? 'border-hud-gold' : 'border-hud-rule'
            )}
        >
            <div
                className={cn(
                    'flex items-center gap-1.5',
                    accent ? 'text-hud-gold' : 'text-hud-muted'
                )}
            >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="hud-sc truncate text-[11px] tracking-[.08em] uppercase">
                    {short}
                </span>
            </div>
            <b
                className={cn(
                    'hud-sc block truncate text-2xl leading-8 tabular-nums',
                    accent ? 'text-hud-gold' : 'text-hud-ink'
                )}
            >
                {value}
            </b>
        </div>
    );
}
