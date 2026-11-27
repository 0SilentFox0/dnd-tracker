import type { ReactNode } from 'react';

import '@/components/hud/hud.css';
import { HUD_SURFACE } from '@/components/hud/surface';
import { HudPortalClassProvider } from '@/components/ui/portal-class';
import { cn } from '@/lib/utils';

export const HUD_PAGE_WIDTH = {
    page: 'max-w-[75rem]',
    list: 'max-w-page',
    narrow: 'max-w-3xl',
    wide: '',
} as const;

export function HudPage({
    width = 'page',
    className,
    children,
}: {
    width?: keyof typeof HUD_PAGE_WIDTH;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div
            className={cn(
                HUD_SURFACE,
                'hud-page mx-auto w-full space-y-3 px-4 py-6 sm:px-6',
                HUD_PAGE_WIDTH[width],
                className
            )}
        >
            <HudPortalClassProvider value={HUD_SURFACE}>
                {children}
            </HudPortalClassProvider>
        </div>
    );
}
