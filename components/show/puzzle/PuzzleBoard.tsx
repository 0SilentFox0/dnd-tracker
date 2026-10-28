import type { Ref } from "react";

import { PuzzlePieceView } from "./PuzzlePieceView";
import type { PuzzleScene } from "./types";

import { cn } from "@/lib/utils";
import { pieceDiag } from "@/lib/utils/puzzle/generate";
import { isHeldByOther } from "@/lib/utils/puzzle/hold";

const CORRECT_GLOW = "drop-shadow-[0_0_6px_hsl(142_70%_45%/0.7)]";

export function PuzzleBoard({ scene, boardRef }: { scene: PuzzleScene; boardRef: Ref<HTMLDivElement> }) {
  const { spec, state, pieces } = scene;

  const { imageWidth: W, imageHeight: H } = spec;

  return (
    <div ref={boardRef} data-testid="puzzle-board" className="relative size-full touch-none overflow-hidden rounded border border-white/20 bg-white/5">
      {state.solved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={scene.imageUrl} alt="" className="absolute inset-0 size-full" />
      ) : (
        pieces.map((piece) => {
          const s = state.pieces[piece.id];

          if (!s || s.place !== "board" || scene.draggingId === piece.id) return null;

          const other = isHeldByOther(s, scene.userId);

          return (
            <div
              key={piece.id}
              data-testid={`board-piece-${piece.id}`}
              data-correct={s.correct || undefined}
              data-held={other || undefined}
              className={cn("pointer-events-none absolute", s.correct && CORRECT_GLOW, other && "opacity-40")}
              style={{
                left: `${(s.x / W) * 100}%`,
                top: `${(s.y / H) * 100}%`,
                width: `${(pieceDiag(piece) / W) * 100}%`,
                aspectRatio: "1",
                transform: "translate(-50%, -50%)",
                zIndex: s.correct ? 1 : 2,
              }}
              onPointerDown={(e) => scene.onGrab(piece.id, e)}
            >
              <PuzzlePieceView piece={piece} spec={spec} imageUrl={scene.imageUrl} rot={s.rot} />
              {other && s.holder && <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1 text-xs text-white">{s.holder.name}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
