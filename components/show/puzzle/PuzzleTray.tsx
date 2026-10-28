import { PuzzlePieceView } from "./PuzzlePieceView";
import type { PuzzleScene } from "./types";

import { cn } from "@/lib/utils";
import { isHeldByOther } from "@/lib/utils/puzzle/hold";

export function PuzzleTray({ scene }: { scene: PuzzleScene }) {
  return (
    <div data-testid="puzzle-tray" className="flex gap-2 overflow-auto p-2 md:grid md:grid-cols-2 md:content-start">
      {scene.pieces.map((piece) => {
        const s = scene.state.pieces[piece.id];

        if (!s || s.place !== "tray" || scene.draggingId === piece.id) return null;

        const other = isHeldByOther(s, scene.userId);

        return (
          <div
            key={piece.id}
            data-testid={`tray-piece-${piece.id}`}
            data-held={other || undefined}
            className={cn("relative size-20 shrink-0 touch-none", other && "opacity-40")}
            onPointerDown={(e) => scene.onGrab(piece.id, e)}
          >
            <PuzzlePieceView piece={piece} spec={scene.spec} imageUrl={scene.imageUrl} rot={s.rot} />
            {other && s.holder && <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1 text-center text-xs text-white">{s.holder.name}</span>}
          </div>
        );
      })}
    </div>
  );
}
