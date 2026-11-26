'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';

export function ActionsPopover({
    open,
    onOpenChange,
    anchor,
    title,
    children,
}: {
    open: boolean;
    onOpenChange(open: boolean): void;
    anchor: ReactNode;
    title?: string;
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
                    title={title ?? t('panelTitle')}
                    hud
                >
                    {children}
                </ResponsiveDialog>
            </>
        );

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>{anchor}</PopoverTrigger>
            <PopoverContent
                side="top"
                align="center"
                sideOffset={10}
                collisionPadding={12}
                aria-label={title ?? t('panelTitle')}
                className="hud-glass w-[min(420px,92vw)] p-3"
            >
                {title && (
                    <div className="hud-sc text-[15px] tracking-[.08em] text-hud-ink">
                        {title}
                    </div>
                )}
                {children}
            </PopoverContent>
        </Popover>
    );
}
