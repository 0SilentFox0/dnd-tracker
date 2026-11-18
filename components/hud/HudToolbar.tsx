import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type HudToolbarProps = ComponentProps<'div'> & { label?: string };

export function HudToolbar({
    label,
    className,
    children,
    ...props
}: HudToolbarProps) {
    return (
        <div
            role={label ? 'toolbar' : undefined}
            aria-label={label}
            className={cn(
                'flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
