'use client';

import type { ReactNode } from 'react';

import type { DrawerKey } from './rail-items';

import { HUD_SURFACE } from '@/components/hud';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SideSheet } from '@/components/ui/side-sheet';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

const onRail = (e: Event) =>
    e.target instanceof Element && !!e.target.closest('[data-drawer-rail]');

export function BattleDrawer({
    drawer,
    open,
    onOpenChange,
    title,
    keepOnOutside = false,
    keepMounted = false,
    children,
}: {
    drawer: DrawerKey;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    keepOnOutside?: boolean;
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
        <SideSheet
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            keepMounted={keepMounted}
            className={cn(
                HUD_SURFACE,
                'right-[68px] w-[min(400px,calc(100vw-96px))]'
            )}
            onInteractOutside={(e) => {
                if (keepOnOutside || onRail(e)) e.preventDefault();
            }}
        >
            <div data-drawer={drawer}>{children}</div>
        </SideSheet>
    );
}
