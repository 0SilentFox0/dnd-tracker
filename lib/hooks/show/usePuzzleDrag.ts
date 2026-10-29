"use client";

import {
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { PuzzleControl } from "./usePuzzleControl";

import { PUZZLE_KEEPALIVE_MS } from "@/lib/constants/show";
import { clamp } from "@/lib/utils/common/clamp";
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
  pointerId: number;
  origin: {
    clientX: number;
    clientY: number;
    board: { x: number; y: number } | null;
  };
}

interface Origin {
  pointerId: number;
  clientX: number;
  clientY: number;
}

const NON_PASSIVE: AddEventListenerOptions = { passive: false };

const TAP_PX = 5;

const LONG_PRESS_MS = 200;

const SCROLL_SLOP_PX = 8;

interface Args {
  puzzle: PuzzleState;
  spec: PuzzleSpec;
  userId: string;
  isDM: boolean;
  control: PuzzleControl;
  boardRef: RefObject<HTMLElement | null>;
}


export function usePuzzleDrag({
  puzzle,
  spec,
  userId,
  isDM,
  control,
  boardRef,
}: Args) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const dragRef = useRef(drag);

  useEffect(() => {
    dragRef.current = drag;
  });

  const grab = useRef<Promise<boolean>>(Promise.resolve(false));

  const active = !!drag && !drag.released;

  const activeId = drag?.id;

  const begin = useCallback(
    (id: string, at: Origin) => {
      const piece = puzzle.pieces[id];

      if (dragRef.current || !piece) return;

      const width = boardRef.current?.getBoundingClientRect().width ?? 0;

      const board = piece.place === "board" ? { x: piece.x, y: piece.y } : null;

      setDrag({
        id,
        clientX: at.clientX,
        clientY: at.clientY,
        rot: piece.rot,
        scale: width ? width / spec.imageWidth : 1,
        grabbed: false,
        released: false,
        pointerId: at.pointerId,
        origin: { clientX: at.clientX, clientY: at.clientY, board },
      });
      grab.current = control
        .send({ action: "puzzleGrab", pieceId: id })
        .then((ok) => {
          setDrag((d) =>
            !ok ? null : d && d.id === id ? { ...d, grabbed: true } : d,
          );

          return ok;
        });
    },
    [puzzle.pieces, control, boardRef, spec.imageWidth],
  );

  const cancelPending = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelPending.current?.(), []);

  const start = useCallback(
    (id: string, e: PointerEvent) => {
      const piece = puzzle.pieces[id];

      if (dragRef.current || cancelPending.current || !piece) return;

      if (isHeldByOther(piece, userId)) {
        if (isDM) void control.send({ action: "puzzleRelease", pieceId: id });

        return;
      }

      const at = {
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
      };

      if (e.pointerType !== "touch" || piece.place !== "tray") {
        e.preventDefault();
        begin(id, at);

        return;
      }

      // Touch on the tray: a long press or a mostly vertical move picks the piece; a horizontal move is the strip scrolling.
      const finish = () => {
        clearTimeout(timer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        cancelPending.current = null;
      };

      const pick = (from: Origin) => {
        finish();
        begin(id, from);
      };

      const timer = setTimeout(() => pick({ ...at }), LONG_PRESS_MS);

      const onMove = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== at.pointerId) return;

        const dx = Math.abs(ev.clientX - at.clientX);

        const dy = Math.abs(ev.clientY - at.clientY);

        if (dy > SCROLL_SLOP_PX && dy > dx)
          pick({
            pointerId: ev.pointerId,
            clientX: ev.clientX,
            clientY: ev.clientY,
          });
        else if (dx > SCROLL_SLOP_PX) finish();
      };

      const onEnd = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId === at.pointerId) finish();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
      cancelPending.current = finish;
    },
    [puzzle.pieces, userId, isDM, control, begin],
  );

  const rotate = useCallback(
    (delta: number) =>
      setDrag((d) =>
        d && !d.released ? { ...d, rot: (d.rot + delta + 360) % 360 } : d,
      ),
    [],
  );

  useEffect(() => {
    if (!active) return;

    const onMove = (e: globalThis.PointerEvent) => {
      if (e.pointerId === dragRef.current?.pointerId)
        setDrag((d) => d && { ...d, clientX: e.clientX, clientY: e.clientY });
    };

    const onUp = async (e: globalThis.PointerEvent) => {
      const cur = dragRef.current;

      if (!cur || e.pointerId !== cur.pointerId) return;

      setDrag({
        ...cur,
        clientX: e.clientX,
        clientY: e.clientY,
        released: true,
      });

      if (!(await grab.current)) return;

      const rect = boardRef.current?.getBoundingClientRect();

      const inside =
        !!rect &&
        e.type !== "pointercancel" &&
        rect.width > 0 &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      const tap =
        e.type === "pointerup" &&
        cur.origin.board &&
        Math.hypot(
          e.clientX - cur.origin.clientX,
          e.clientY - cur.origin.clientY,
        ) <= TAP_PX;

      await control.send(
        tap && cur.origin.board
          ? {
              action: "puzzleDrop",
              pieceId: cur.id,
              x: cur.origin.board.x,
              y: cur.origin.board.y,
              rot: (cur.rot + 45) % 360,
            }
          : inside
            ? {
                action: "puzzleDrop",
                pieceId: cur.id,
                x: clamp(
                  ((e.clientX - rect.left) / rect.width) * spec.imageWidth,
                  0,
                  spec.imageWidth,
                ),
                y: clamp(
                  ((e.clientY - rect.top) / rect.height) * spec.imageHeight,
                  0,
                  spec.imageHeight,
                ),
                rot: cur.rot,
              }
            : { action: "puzzleReturn", pieceId: cur.id },
      );
      setDrag(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyQ") rotate(-45);

      if (e.code === "KeyE") rotate(45);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      rotate(e.deltaY > 0 ? 45 : -45);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };

    window.addEventListener("wheel", onWheel, NON_PASSIVE);
    window.addEventListener("touchmove", onTouchMove, NON_PASSIVE);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("wheel", onWheel, NON_PASSIVE);
      window.removeEventListener("touchmove", onTouchMove, NON_PASSIVE);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, boardRef, control, rotate, spec.imageWidth, spec.imageHeight]);

  const grabbed = active && !!drag?.grabbed;

  useEffect(() => {
    if (!grabbed || !activeId) return;

    const timer = setInterval(
      () => void control.send({ action: "puzzleKeepAlive", pieceId: activeId }),
      PUZZLE_KEEPALIVE_MS,
    );

    return () => clearInterval(timer);
  }, [grabbed, activeId, control]);

  const lost =
    grabbed && !!activeId && puzzle.pieces[activeId]?.holder?.userId !== userId;

  if (lost) setDrag(null);

  return { drag, start, rotate };
}
