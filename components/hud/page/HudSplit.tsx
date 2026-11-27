'use client';

import { type CSSProperties, type ReactNode, useId } from 'react';

import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

export interface HudSplitAside {
    content: ReactNode;
    width?: 'sm' | 'md';
    title: ReactNode;
    mobile: 'stack' | { open: boolean; onClose: () => void };
}

const ASIDE_WIDTH = { sm: 'var(--aside-w)', md: 'var(--aside-w-md)' } as const;

export function HudSplit({
    rail,
    aside,
    children,
    className,
}: {
    rail?: ReactNode;
    aside: HudSplitAside;
    children: ReactNode;
    className?: string;
}) {
    const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

    const titleId = useId();

    const { content, width = 'sm', title, mobile } = aside;

    const dialog = mobile !== 'stack';

    const panel = (
        <aside
            aria-labelledby={titleId}
            className={cn(
                'ds-panel p-4 lg:sticky lg:top-[calc(var(--shell-header-h)+16px)] lg:max-h-[calc(100dvh-var(--shell-header-h)-2rem)] lg:self-start lg:overflow-y-auto'
            )}
        >
            <h2 id={titleId} className="sr-only">
                {title}
            </h2>
            {content}
        </aside>
    );

    return (
        <div
            style={{ '--split-aside': ASIDE_WIDTH[width] } as CSSProperties}
            className={cn(
                'grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_var(--split-aside)]',
                rail &&
                    'xl:grid-cols-[var(--rail-w)_minmax(0,1fr)_var(--split-aside)]',
                className
            )}
        >
            {rail && (
                <div
                    data-slot="hud-split-rail"
                    className="sticky top-[var(--shell-header-h)] z-10 lg:col-span-2 xl:col-span-1 xl:self-start"
                >
                    {rail}
                </div>
            )}
            <div data-slot="hud-split-main" className="min-w-0">
                {children}
            </div>
            {dialog && !isDesktop ? (
                <ResponsiveDialog
                    hud
                    open={mobile.open}
                    onOpenChange={(open) => {
                        if (!open) mobile.onClose();
                    }}
                    title={title}
                >
                    {content}
                </ResponsiveDialog>
            ) : (
                panel
            )}
        </div>
    );
}
