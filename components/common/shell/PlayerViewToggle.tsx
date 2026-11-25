'use client';

import { MonitorPlay } from 'lucide-react';

import { HudIconButton } from '@/components/hud';
import { cn } from '@/lib/utils';

export function PlayerViewToggle({
    enabled,
    onToggle,
    labels,
    className,
}: {
    enabled: boolean;
    onToggle: () => void;
    labels: { on: string; off: string };
    className?: string;
}) {
    const label = enabled ? labels.on : labels.off;

    return (
        <HudIconButton
            type="button"
            onClick={onToggle}
            aria-label={label}
            aria-pressed={enabled}
            title={`${label} (P)`}
            className={cn(
                'hover:bg-white/10',
                enabled ? 'text-hud-crimson-fg' : 'text-hud-muted',
                className
            )}
        >
            <MonitorPlay className="size-4" />
        </HudIconButton>
    );
}
