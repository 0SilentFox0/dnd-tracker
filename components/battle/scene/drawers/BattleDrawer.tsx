'use client';

import { type ReactNode, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

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
    keepMounted = false,
    children,
}: {
    drawer: DrawerKey;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
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
                className={cn(HUD_SURFACE, 'h-[92dvh] border-white/25 bg-hud-surface')}
            >
                {children}
            </ResponsiveDialog>
        );

    return (
        <SideSheet
            drawer={drawer}
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            keepMounted={keepMounted}
        >
            {children}
        </SideSheet>
    );
}

function SideSheet({
    drawer,
    open,
    onOpenChange,
    title,
    keepMounted,
    children,
}: {
    drawer: DrawerKey;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    keepMounted: boolean;
    children: ReactNode;
}) {
    const t = useTranslations('battle.drawers');

    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !e.defaultPrevented) onOpenChange(false);
        };

        document.addEventListener('keydown', onKey);

        return () => document.removeEventListener('keydown', onKey);
    }, [open, onOpenChange]);

    if (!open && !keepMounted) return null;

    return (
        <section
            data-slot="side-sheet"
            data-drawer={drawer}
            aria-label={typeof title === 'string' ? title : undefined}
            hidden={!open}
            className={cn(
                HUD_GLASS,
                'absolute inset-y-0 right-0 z-40 flex w-[min(340px,100%)] flex-col rounded-none rounded-l-2xl border-r-0 pt-14'
            )}
        >
            <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-y border-white/15 pr-2 pl-4">
                <h2 className="hud-sc text-[15px] font-bold tracking-[.1em] text-[var(--gold)]">
                    {title}
                </h2>
                <HudIconButton
                    type="button"
                    aria-label={t('close')}
                    title={t('close')}
                    onClick={() => onOpenChange(false)}
                    className="size-10 text-[var(--ink)] hover:bg-white/10"
                >
                    <X className="size-4" />
                </HudIconButton>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </section>
    );
}
