'use client';

import type { ReactNode } from 'react';

import {
    type GameShellNavItem,
    HudGameShell,
} from '@/components/hud';
import { HeaderActions } from '@/components/layout/HeaderActions';

export function GameShell({
    items,
    activeId,
    title,
    breadcrumbRootLabel,
    children,
}: {
    items: GameShellNavItem[];
    activeId: string;
    title: string;
    breadcrumbRootLabel?: string;
    children: ReactNode;
}) {
    return (
        <HudGameShell
            items={items}
            activeId={activeId}
            title={title}
            breadcrumbRootLabel={breadcrumbRootLabel}
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
