import * as React from 'react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ComponentProps<'button'>;

const TONES = {
    muted: 'text-[var(--hud-muted)] hover:text-[var(--ink)]',
    danger: 'text-hud-danger hover:bg-hud-danger/15',
    gold: 'text-[var(--gold)]',
} as const;

const ICON_SIZES = { sm: 'size-8', md: 'size-10' } as const;

export const HudButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, ...props }, ref) => (
        <button
            ref={ref}
            data-slot="hud-button"
            className={cn('cursor-pointer', className)}
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
>(({ className, size = 'sm', tone, ...props }, ref) => (
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
    />
));

HudIconButton.displayName = 'HudIconButton';

export const HudTile = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, ...props }, ref) => (
        <HudButton
            ref={ref}
            data-slot="hud-tile"
            className={cn('flex w-full items-center text-left', className)}
            {...props}
        />
    )
);

HudTile.displayName = 'HudTile';
