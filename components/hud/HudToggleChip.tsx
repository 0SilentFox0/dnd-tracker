import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type HudToggleChipProps = Omit<
    ComponentProps<'button'>,
    'type' | 'aria-pressed'
> & {
    active: boolean;
    tall?: boolean;
};

export function HudToggleChip({
    active,
    tall = false,
    className,
    ...props
}: HudToggleChipProps) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className={cn(
                tall ? 'h-8' : 'h-7',
                'rounded-md border bg-black/60 px-2 text-xs hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50',
                active
                    ? 'border-[var(--gold)] text-hud-ink'
                    : 'border-hud-rule text-hud-muted',
                className
            )}
            {...props}
        />
    );
}
