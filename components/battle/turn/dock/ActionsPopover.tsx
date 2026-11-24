'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';

export function ActionsPopover({
    open,
    onOpenChange,
    anchor,
    children,
}: {
    open: boolean;
    onOpenChange(open: boolean): void;
    anchor: ReactNode;
    children: ReactNode;
}) {
    const t = useTranslations('battle.dock');

    const desktop = useMediaQuery(DESKTOP_QUERY);

    if (!desktop)
        return (
            <>
                {anchor}
                <ResponsiveDialog
                    open={open}
                    onOpenChange={onOpenChange}
                    title={t('panelTitle')}
                    hud
                >
                    {children}
                </ResponsiveDialog>
            </>
        );

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverAnchor asChild>
                <span className="inline-flex">{anchor}</span>
            </PopoverAnchor>
            <PopoverContent
                side="top"
                align="center"
                sideOffset={10}
                aria-label={t('panelTitle')}
                className="w-[min(420px,92vw)] border-white/20 bg-black/80 p-3"
            >
                {children}
            </PopoverContent>
        </Popover>
    );
}
