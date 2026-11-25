'use client';

import { createContext, type ReactNode, useContext } from 'react';
import { createPortal } from 'react-dom';

export const MapStripSlotContext = createContext<HTMLElement | null>(null);

export const useMapStripSlot = () => useContext(MapStripSlotContext);

export const NoticeStackContext = createContext<HTMLElement | null>(null);

export const useNoticeStack = () => useContext(NoticeStackContext);

export function InNoticeStack({ children }: { children: ReactNode }) {
    const stack = useNoticeStack();

    return stack ? createPortal(children, stack) : null;
}
