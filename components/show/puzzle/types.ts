import type { PointerEvent } from "react";

import type { PuzzlePiece } from "@/lib/utils/puzzle/generate";
import type { PuzzleSpec, PuzzleState } from "@/types/show";

export interface PuzzleScene {
  pieces: PuzzlePiece[];
  state: PuzzleState;
  spec: PuzzleSpec;
  imageUrl: string;
  userId: string;
  draggingId: string | null;
  onGrab: (pieceId: string, e: PointerEvent) => void;
}
