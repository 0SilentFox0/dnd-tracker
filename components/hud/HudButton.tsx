import * as React from 'react';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ButtonProps = React.ComponentProps<'button'>;

const TONES = {
    muted: 'text-[var(--hud-muted)] hover:text-[var(--ink)]',
    danger: 'text-hud-danger hover:bg-hud-danger/15',
    gold: 'text-hud-accent-fg',
} as const;

const ICON_SIZES = { sm: 'size-8', md: 'size-10' } as const;

export const HudButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, ...props }, ref) => (
        <button
            ref={ref}
            type="button"
            data-slot="hud-button"
            className={cn('ds-interactive cursor-pointer', className)}
            {...props}
        />
    )
);

HudButton.displayName = 'HudButton';

export const HudIconButton = React.forwardRef<
    HTMLButtonElement,
    ButtonProps & {
        size?: keyof typeof ICON_SIZES;
        tone?: keyof typeof TONES;
    }
>(({ className, size = 'sm', tone, title, ...props }, ref) => {
    const label = props['aria-label'] ?? title;

    const tip = title ?? label;

    const wrap = !!tip && !props.disabled;

    const button = (
        <HudButton
            ref={ref}
            data-slot="hud-icon-button"
            className={cn(
                'flex items-center justify-center',
                ICON_SIZES[size],
                tone && TONES[tone],
                className
            )}
            {...props}
            {...(label && { 'aria-label': label })}
            {...(!wrap && { title })}
        />
    );

    if (!wrap) return button;

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

HudIconButton.displayName = 'HudIconButton';
