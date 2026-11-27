import type { ComponentProps } from 'react';

import {
    HUD_CHIP_ACTIVE_CLASS,
    HUD_CHIP_CLASS,
} from '@/components/hud/page/chip-class';
import { DISABLED_CLASS } from '@/components/ui/disabled';
import { cn } from '@/lib/utils';

type HudToggleChipProps = Omit<
    ComponentProps<'button'>,
    'type' | 'aria-pressed'
> & {
    active: boolean;
};

export function HudToggleChip({
    active,
    className,
    ...props
}: HudToggleChipProps) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className={cn(
                HUD_CHIP_CLASS,
                'ds-interactive',
                DISABLED_CLASS,
                active && HUD_CHIP_ACTIVE_CLASS,
                className
            )}
            {...props}
        />
    );
}
