'use client';

import type { ReactNode } from 'react';

import {
    type GameShellNavItem,
    HudGameShell,
} from '@/components/hud';
import { HeaderActions } from '@/components/layout/HeaderActions';

export function GameShellClient({
    items,
    activeId,
    title,
    breadcrumbRootLabel,
    fit,
    children,
}: {
    items: GameShellNavItem[];
    activeId: string;
    title: string;
    breadcrumbRootLabel?: string;
    fit?: boolean;
    children: ReactNode;
}) {
    return (
        <HudGameShell
            items={items}
            activeId={activeId}
            header={{ title, breadcrumbRootLabel }}
            fit={fit}
            actions={
                <>
                    <div className="hidden items-center gap-2 sm:flex">
                        <HeaderActions />
                    </div>
                    <div className="game-shell-mobile-actions flex items-center gap-1.5 sm:hidden">
                        <HeaderActions mode="primary" />
                    </div>
                </>
            }
            menuActions={<HeaderActions mode="secondary" />}
        >
            {children}
        </HudGameShell>
    );
}
