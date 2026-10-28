import { PuzzlePieceView } from "./PuzzlePieceView";

import type { DragState } from "@/lib/hooks/show";
import { pieceDiag,type PuzzlePiece } from "@/lib/utils/puzzle/generate";
import type { PuzzleSpec } from "@/types/show";

interface Props {
  drag: DragState;
  piece: PuzzlePiece;
  spec: PuzzleSpec;
  imageUrl: string;
  onRotate: (delta: number) => void;
}

export function PuzzleHand({ drag, piece, spec, imageUrl, onRotate }: Props) {
  const size = pieceDiag(piece) * drag.scale;

  return (
    <div data-testid="puzzle-hand" className="pointer-events-none fixed z-50" style={{ left: drag.clientX - size / 2, top: drag.clientY - size / 2, width: size, height: size }}>
      <PuzzlePieceView piece={piece} spec={spec} imageUrl={imageUrl} rot={drag.rot} />
      <div className="pointer-events-auto absolute -top-9 left-1/2 flex -translate-x-1/2 gap-1">
        <button type="button" aria-label="Повернути проти годинникової" className="size-8 rounded bg-black/70 text-white" onClick={() => onRotate(-45)}>
          ↺
        </button>
        <button type="button" aria-label="Повернути за годинниковою" className="size-8 rounded bg-black/70 text-white" onClick={() => onRotate(45)}>
          ↻
        </button>
      </div>
    </div>
  );
}
