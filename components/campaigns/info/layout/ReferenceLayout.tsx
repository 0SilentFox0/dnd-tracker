'use client';

import type { ReactNode } from 'react';

import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';

interface ReferenceLayoutProps {
    rail: ReactNode;
    list: ReactNode;
    detail: ReactNode;
    detailOpen: boolean;
    onDetailClose: () => void;
    detailTitle: ReactNode;
}

export function ReferenceLayout({
    rail,
    list,
    detail,
    detailOpen,
    onDetailClose,
    detailTitle,
}: ReferenceLayoutProps) {
    const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

    return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[220px_minmax(0,1fr)_440px]">
            <div className="sticky top-[var(--shell-header-h)] z-10 lg:col-span-2 xl:col-span-1 xl:self-start">
                {rail}
            </div>
            <div className="min-w-0">{list}</div>
            {isDesktop ? (
                <aside className="sticky top-[calc(var(--shell-header-h)+1rem)] max-h-[calc(100dvh-var(--shell-header-h)-2rem)] self-start overflow-y-auto rounded-xl bg-hud-panel p-4 shadow-[inset_0_0_0_1px_var(--color-hud-line)]">
                    {detail}
                </aside>
            ) : (
                <ResponsiveDialog
                    hud
                    open={detailOpen}
                    onOpenChange={(open) => {
                        if (!open) onDetailClose();
                    }}
                    title={detailTitle}
                >
                    {detail}
                </ResponsiveDialog>
            )}
        </div>
    );
}
