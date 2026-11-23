'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Layers } from 'lucide-react';

import { HudButton } from '@/components/hud';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

function WorldFilterSheet({ children }: { children: ReactNode }) {
    const t = useTranslations('world.journey');

    const [open, setOpen] = useState(false);

    return (
        <>
            <HudButton
                className="world-filter-trigger hud-surface grid size-11 place-items-center rounded-lg border border-hud-rule bg-hud-surface/90 text-hud-ink backdrop-blur-sm"
                aria-label={t('filters')}
                title={t('filters')}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={(event) => {
                    event.currentTarget.focus();
                    setOpen(true);
                }}
            >
                <Layers aria-hidden className="size-4" />
            </HudButton>
            <ResponsiveDialog
                hud
                autoFocusSheet
                size="sm"
                open={open}
                onOpenChange={setOpen}
                title={t('filters')}
            >
                <div className="world-map-filter-sheet">{children}</div>
            </ResponsiveDialog>
        </>
    );
}

export function WorldFilterLegend({
    compact,
    children,
}: {
    compact: boolean;
    children: ReactNode;
}) {
    return (
        <div className="world-map-filter-legend absolute top-2 left-2 z-10 flex max-w-[calc(100%-4rem)] flex-col items-start gap-1">
            {compact ? (
                <WorldFilterSheet>{children}</WorldFilterSheet>
            ) : (
                children
            )}
        </div>
    );
}
