import type { PuzzlePieceState } from "@/types/show";

export const isHeldByOther = (piece: PuzzlePieceState, userId: string, now = Date.now()): boolean =>
  !!piece.holder && piece.holder.userId !== userId && piece.holder.until > now;
