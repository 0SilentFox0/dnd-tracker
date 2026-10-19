"use client";

import { createContext, type ReactNode, useContext } from "react";
import { ChevronRight } from "lucide-react";

/** Нижня смуга вкладки «Карта» на телефоні: панелі, що інакше лягли б поверх карти, рендеряться сюди в потоці. */
export const MapStripSlotContext = createContext<HTMLElement | null>(null);

export const useMapStripSlot = () => useContext(MapStripSlotContext);

/** Стовпчик повідомлень угорі телефона: тост і картка результату стають одне під одним, а не одне на одному. */
export const NoticeStackContext = createContext<HTMLElement | null>(null);

export const useNoticeStack = () => useContext(NoticeStackContext);

export function MapStripRow({ children, onExpand }: { children: ReactNode; onExpand: () => void }) {
  return (
    <button type="button" onClick={onExpand} className="flex h-10 w-full items-center gap-2 text-left text-[15px] text-[var(--ink)]">
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight className="size-5 shrink-0 text-[var(--hud-muted)]" />
    </button>
  );
}
