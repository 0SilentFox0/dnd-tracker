"use client";

import { type MouseEvent, type PointerEvent, useRef } from "react";

import { moveId } from "@/lib/utils/battle/turn";

const THRESHOLD = 6;

export const DRAG_ATTR = "data-pid";

export function useInitiativeDrag(ids: string[], onReorder?: (order: string[]) => void) {
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);

  const suppressClick = useRef(false);

  if (!onReorder) return null;

  return (id: string) => ({
    [DRAG_ATTR]: id,
    onPointerDown: (e: PointerEvent) => {
      drag.current = { id, x: e.clientX, y: e.clientY, moved: false };
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current;

      if (d && !d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > THRESHOLD) d.moved = true;
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current;

      drag.current = null;

      if (!d?.moved) return;

      suppressClick.current = true;

      const targetId = document.elementFromPoint(e.clientX, e.clientY)?.closest(`[${DRAG_ATTR}]`)?.getAttribute(DRAG_ATTR);

      const to = targetId ? ids.indexOf(targetId) : -1;

      if (to === -1 || targetId === d.id) return;

      onReorder(moveId(ids, d.id, to));
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onClickCapture: (e: MouseEvent) => {
      if (!suppressClick.current) return;

      suppressClick.current = false;

      e.stopPropagation();
    },
  });
}
