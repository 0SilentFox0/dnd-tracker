import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const TONE = {
    role: 'metal-gold metal-fill',
    meta: 'text-hud-soft shadow-[inset_0_0_0_1px_var(--color-hud-line)]',
    npc: 'bg-hud-muted/15 text-hud-muted',
    accent: 'text-hud-accent-fg shadow-[inset_0_0_0_1px_var(--color-hud-accent)]',
    danger: 'text-hud-crimson-fg shadow-[inset_0_0_0_1px_var(--color-hud-crimson)]',
} as const;

type HudPillTone = keyof typeof TONE;

interface HudPillProps {
    tone?: HudPillTone;
    icon?: ReactNode;
    className?: string;
    children: ReactNode;
}

export function HudPill({
    tone = 'meta',
    icon,
    className,
    children,
}: HudPillProps) {
    return (
        <span
            data-tone={tone}
            className={cn(
                'hud-body inline-flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 text-xs leading-none font-semibold whitespace-nowrap max-sm:text-sm [&>svg]:size-3',
                TONE[tone],
                className
            )}
        >
            {icon}
            {children}
        </span>
    );
}
