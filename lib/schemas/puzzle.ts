import { z } from "zod";

const pieceId = z.string().regex(/^p\d{1,3}(-\d{1,3})?$/);

export const puzzleCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("puzzleGrab"), pieceId }),
  z.object({ action: z.literal("puzzleKeepAlive"), pieceId }),
  z.object({ action: z.literal("puzzleDrop"), pieceId, x: z.number().finite(), y: z.number().finite(), rot: z.number().finite() }),
  z.object({ action: z.literal("puzzleReturn"), pieceId }),
  z.object({ action: z.literal("puzzleRelease"), pieceId: pieceId.optional() }),
  z.object({ action: z.literal("puzzleReset") }),
]);
