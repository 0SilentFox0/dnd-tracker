import { describe, expect, it } from "vitest";

import { puzzleCommandSchema } from "@/lib/schemas/puzzle";

describe("puzzleCommandSchema", () => {
  it.each(["p0-0", "p3-12", "p7", "p59"])("accepts generator id %s", (pieceId) => {
    expect(puzzleCommandSchema.safeParse({ action: "puzzleGrab", pieceId }).success).toBe(true);
  });

  it.each(["constructor", "__proto__", "toString", "p", "p1-", "x1", "p1-2-3"])("rejects %s", (pieceId) => {
    expect(puzzleCommandSchema.safeParse({ action: "puzzleGrab", pieceId }).success).toBe(false);
    expect(puzzleCommandSchema.safeParse({ action: "puzzleRelease", pieceId }).success).toBe(false);
  });
});
