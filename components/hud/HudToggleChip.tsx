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
                'rounded-[4px] border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50',
                active
                    ? 'border-hud-line bg-hud-panel-2 text-hud-ink shadow-[inset_0_-2px_0_var(--hud-crimson)]'
                    : 'border-hud-line text-hud-muted hover:text-hud-ink',
                className
            )}
            {...props}
        />
    );
}
