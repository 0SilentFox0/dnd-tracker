'use client';

import { createContext, type ReactNode, useContext } from 'react';
import { ChevronRight } from 'lucide-react';

import { HudButton } from '@/components/hud';

export const MapStripSlotContext = createContext<HTMLElement | null>(null);

export const useMapStripSlot = () => useContext(MapStripSlotContext);

export const NoticeStackContext = createContext<HTMLElement | null>(null);

export const useNoticeStack = () => useContext(NoticeStackContext);

export function MapStripRow({
    children,
    onExpand,
}: {
    children: ReactNode;
    onExpand: () => void;
}) {
    return (
        <HudButton
            type="button"
            onClick={onExpand}
            className="flex h-10 w-full items-center gap-2 text-left text-[15px] text-[var(--ink)]"
        >
            <span className="min-w-0 flex-1 truncate">{children}</span>
            <ChevronRight className="size-5 shrink-0 text-[var(--hud-muted)]" />
        </HudButton>
    );
}
