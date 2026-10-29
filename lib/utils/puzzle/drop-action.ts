import { clamp } from "@/lib/utils/common/clamp";
import type { PuzzleCommand,PuzzleSpec } from "@/types/show";

const TAP_PX = 5;

interface Release {
  clientX: number;
  clientY: number;
  cancelled: boolean;
}

interface Dragged {
  id: string;
  rot: number;
  origin: { clientX: number; clientY: number; board: { x: number; y: number } | null };
}

type Rect = Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;

export function dropAction(cur: Dragged, at: Release, rect: Rect | undefined, spec: Pick<PuzzleSpec, "imageWidth" | "imageHeight">): PuzzleCommand {
  const inside = !!rect && !at.cancelled && rect.width > 0 && at.clientX >= rect.left && at.clientX <= rect.right && at.clientY >= rect.top && at.clientY <= rect.bottom;

  const { board } = cur.origin;

  if (board && !at.cancelled && Math.hypot(at.clientX - cur.origin.clientX, at.clientY - cur.origin.clientY) <= TAP_PX) return { action: "puzzleDrop", pieceId: cur.id, x: board.x, y: board.y, rot: (cur.rot + 45) % 360 };

  if (inside) {
    return {
      action: "puzzleDrop",
      pieceId: cur.id,
      x: clamp(((at.clientX - rect.left) / rect.width) * spec.imageWidth, 0, spec.imageWidth),
      y: clamp(((at.clientY - rect.top) / rect.height) * spec.imageHeight, 0, spec.imageHeight),
      rot: cur.rot,
    };
  }

  return { action: "puzzleReturn", pieceId: cur.id };
}
