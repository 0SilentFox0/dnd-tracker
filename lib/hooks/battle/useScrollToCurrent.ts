"use client";

import { type RefObject, useEffect } from "react";

/** Докручує прокручувану карту так, щоб жетон поточного ходу був у видимій зоні. */
export function useScrollToCurrent(outerRef: RefObject<HTMLElement | null>, containerRef: RefObject<HTMLElement | null>, currentId: string | null, scrolls: boolean) {
  useEffect(() => {
    const outer = outerRef.current;

    if (!currentId || !outer || !scrolls) return;

    const token = [...(containerRef.current?.querySelectorAll<HTMLElement>('[data-fx-anchor="map"]') ?? [])].find((el) => el.dataset.fxParticipant === currentId);

    if (!token) return;

    const t = token.getBoundingClientRect();

    const o = outer.getBoundingClientRect();

    const dy = t.top < o.top ? t.top - o.top : t.bottom > o.bottom ? t.bottom - o.bottom : 0;

    const dx = t.left < o.left ? t.left - o.left : t.right > o.right ? t.right - o.right : 0;

    if (dy !== 0 || dx !== 0) outer.scrollBy({ top: dy, left: dx, behavior: "smooth" });
    // scrolls — щоб спрацювати й після першого виміру, коли вкладку відкрили посеред ходу
  }, [currentId, outerRef, containerRef, scrolls]);
}
