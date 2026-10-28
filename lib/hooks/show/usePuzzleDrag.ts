"use client";

import { type PointerEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";

import type { PuzzleControl } from "./usePuzzleControl";

import { PUZZLE_KEEPALIVE_MS } from "@/lib/constants/show";
import { isHeldByOther } from "@/lib/utils/puzzle/hold";
import type { PuzzleSpec, PuzzleState } from "@/types/show";

export interface DragState {
  id: string;
  clientX: number;
  clientY: number;
  rot: number;
  scale: number;
  grabbed: boolean;
  released: boolean;
}

interface Args {
  puzzle: PuzzleState;
  spec: PuzzleSpec;
  userId: string;
  isDM: boolean;
  control: PuzzleControl;
  boardRef: RefObject<HTMLElement | null>;
}

const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));

export function usePuzzleDrag({ puzzle, spec, userId, isDM, control, boardRef }: Args) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const dragRef = useRef(drag);

  useEffect(() => {
    dragRef.current = drag;
  });

  const grab = useRef<Promise<boolean>>(Promise.resolve(false));

  const active = !!drag && !drag.released;

  const activeId = drag?.id;

  const start = useCallback(
    (id: string, e: PointerEvent) => {
      const piece = puzzle.pieces[id];

      if (dragRef.current || !piece) return;

      if (isHeldByOther(piece, userId)) {
        if (isDM) void control.send({ action: "puzzleRelease", pieceId: id });

        return;
      }

      e.preventDefault();

      const width = boardRef.current?.getBoundingClientRect().width ?? 0;

      setDrag({ id, clientX: e.clientX, clientY: e.clientY, rot: piece.rot, scale: width ? width / spec.imageWidth : 1, grabbed: false, released: false });
      grab.current = control.send({ action: "puzzleGrab", pieceId: id }).then((ok) => {
        setDrag((d) => (!ok ? null : d && d.id === id ? { ...d, grabbed: true } : d));

        return ok;
      });
    },
    [puzzle.pieces, userId, isDM, control, boardRef, spec.imageWidth],
  );

  const rotate = useCallback((delta: number) => setDrag((d) => (d && !d.released ? { ...d, rot: (d.rot + delta + 360) % 360 } : d)), []);

  useEffect(() => {
    if (!active) return;

    const onMove = (e: globalThis.PointerEvent) => setDrag((d) => d && { ...d, clientX: e.clientX, clientY: e.clientY });

    const onUp = async (e: globalThis.PointerEvent) => {
      const cur = dragRef.current;

      if (!cur) return;

      setDrag({ ...cur, clientX: e.clientX, clientY: e.clientY, released: true });

      if (!(await grab.current)) return;

      const rect = boardRef.current?.getBoundingClientRect();

      const inside = !!rect && e.type !== "pointercancel" && rect.width > 0 && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      await control.send(
        inside
          ? { action: "puzzleDrop", pieceId: cur.id, x: clamp(((e.clientX - rect.left) / rect.width) * spec.imageWidth, spec.imageWidth), y: clamp(((e.clientY - rect.top) / rect.height) * spec.imageHeight, spec.imageHeight), rot: cur.rot }
          : { action: "puzzleReturn", pieceId: cur.id },
      );
      setDrag(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyQ") rotate(-45);

      if (e.code === "KeyE") rotate(45);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, boardRef, control, rotate, spec.imageWidth, spec.imageHeight]);

  const grabbed = active && !!drag?.grabbed;

  useEffect(() => {
    if (!grabbed || !activeId) return;

    const timer = setInterval(() => void control.send({ action: "puzzleKeepAlive", pieceId: activeId }), PUZZLE_KEEPALIVE_MS);

    return () => clearInterval(timer);
  }, [grabbed, activeId, control]);

  const lost = grabbed && !!activeId && puzzle.pieces[activeId]?.holder?.userId !== userId;

  if (lost) setDrag(null);

  return { drag, start, rotate };
}
