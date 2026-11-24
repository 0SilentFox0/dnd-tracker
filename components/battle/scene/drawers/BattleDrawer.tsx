'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Minus } from 'lucide-react';

import type { DrawerKey } from './rail-items';

import { HUD_GLASS, HUD_SURFACE, HudIconButton } from '@/components/hud';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export function BattleDrawer({
    drawer,
    open,
    onOpenChange,
    title,
    side = 'right',
    keepMounted = false,
    children,
}: {
    drawer: DrawerKey;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    side?: 'left' | 'right';
    keepMounted?: boolean;
    children: ReactNode;
}) {
    const desktop = useMediaQuery(DESKTOP_QUERY);

    if (!desktop)
        return (
            <ResponsiveDialog
                open={open}
                onOpenChange={onOpenChange}
                title={title}
                className={cn(HUD_SURFACE, 'border-white/25 bg-hud-surface')}
            >
                {children}
            </ResponsiveDialog>
        );

    return (
        <FloatingPanel
            drawer={drawer}
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            side={side}
            keepMounted={keepMounted}
        >
            {children}
        </FloatingPanel>
    );
}

function FloatingPanel({
    drawer,
    open,
    onOpenChange,
    title,
    side,
    keepMounted,
    children,
}: {
    drawer: DrawerKey;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    side: 'left' | 'right';
    keepMounted: boolean;
    children: ReactNode;
}) {
    const t = useTranslations('battle.drawers');

    if (!open && !keepMounted) return null;

    return (
        <section
            data-slot="floating-panel"
            data-drawer={drawer}
            aria-label={typeof title === 'string' ? title : undefined}
            hidden={!open}
            onKeyDown={(e) => {
                if (e.key === 'Escape') onOpenChange(false);
            }}
            className={cn(
                HUD_GLASS,
                'absolute top-20 bottom-28 z-40 flex w-[min(260px,calc(100vw-96px))] flex-col rounded-xl',
                side === 'left' ? 'left-3' : 'right-[68px]'
            )}
        >
            <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/15 pr-1.5 pl-3">
                <h2 className="hud-sc text-[13px] font-bold tracking-[.1em] text-[var(--gold)]">
                    {title}
                </h2>
                <HudIconButton
                    type="button"
                    aria-label={t('collapse')}
                    title={t('collapse')}
                    onClick={() => onOpenChange(false)}
                    className="size-8 text-[var(--ink)] hover:bg-white/10"
                >
                    <Minus className="size-4" />
                </HudIconButton>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
        </section>
    );
}
