import type { ReactNode } from 'react';

import { HudButton } from '@/components/hud';

export function WorldPanelHeader({
    badge,
    title,
    subtitle,
    hideTitle = false,
}: {
    badge: ReactNode;
    title: string;
    subtitle: string;
    hideTitle?: boolean;
}) {
    return (
        <div className="mb-4 flex items-center gap-3 border-b border-hud-rule pb-3">
            <span className="metal-gold metal-fill flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]">
                {badge}
            </span>
            <div className="min-w-0">
                {hideTitle ? null : (
                    <h2 className="hud-sc truncate text-base text-hud-ink">
                        {title}
                    </h2>
                )}
                <p className="truncate text-xs text-hud-muted">{subtitle}</p>
            </div>
        </div>
    );
}

export function QuietDeleteButton({
    label,
    onClick,
}: {
    label: string;
    onClick(): void;
}) {
    return (
        <HudButton
            type="button"
            onClick={onClick}
            className="mt-6 flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-hud-danger/60 bg-hud-danger/20 px-3 text-sm font-medium text-hud-danger transition-colors hover:bg-hud-danger/30 hover:text-hud-bad"
        >
            {label}
        </HudButton>
    );
}
