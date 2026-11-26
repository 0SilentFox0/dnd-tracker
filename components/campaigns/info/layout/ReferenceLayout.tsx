'use client';

import type { ReactNode } from 'react';

import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';

export function ReferenceLayout({
    rail,
    list,
    detail,
    detailOpen,
    onDetailClose,
    detailTitle,
}: {
    rail: ReactNode;
    list: ReactNode;
    detail: ReactNode;
    detailOpen: boolean;
    onDetailClose: () => void;
    detailTitle: string;
}) {
    const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

    return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[13.75rem_minmax(0,1fr)_27.5rem]">
            <div className="lg:col-span-2 xl:col-span-1">{rail}</div>
            <div className="min-w-0 space-y-2">{list}</div>
            {isDesktop ? (
                <aside
                    aria-label={detailTitle}
                    className="ds-panel sticky top-[var(--shell-header-h,57px)] max-h-[calc(100dvh-var(--shell-header-h,57px)-1rem)] self-start overflow-y-auto p-4"
                >
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
                    className="max-h-[90dvh] overflow-y-auto"
                >
                    {detail}
                </ResponsiveDialog>
            )}
        </div>
    );
}
