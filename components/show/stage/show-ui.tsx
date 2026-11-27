import type { ButtonHTMLAttributes } from 'react';

import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';

export const SHOW_TONE = {
    rule: 'border-[var(--show-rule,var(--color-hud-rule))]',
    accent: 'border-[var(--show-accent,var(--color-hud-accent))] ring-2 ring-[var(--show-accent,var(--color-hud-accent))]',
    muted: 'text-[var(--show-muted,var(--color-hud-muted))]',
};

export function ShowButton({
    className,
    tone = 'plain',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'plain' | 'danger' }) {
    return (
        <HudButton
            type="button"
            {...props}
            className={cn(
                'inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-sm px-1.5 text-sm opacity-75 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)] hover:opacity-100 disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-[color-mix(in_srgb,var(--show-accent,var(--color-hud-accent))_15%,transparent)] aria-pressed:text-[var(--show-accent,var(--color-hud-accent))] aria-pressed:opacity-100',
                tone === 'danger' && 'hover:text-red-400',
                className
            )}
        />
    );
}
