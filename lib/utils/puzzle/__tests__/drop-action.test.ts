import { describe, expect, it } from "vitest";

import { dropAction } from "@/lib/utils/puzzle/drop-action";

const rect = { left: 100, top: 100, right: 300, bottom: 200, width: 200, height: 100 };

const spec = { imageWidth: 2000, imageHeight: 1000 };

const piece = (board: { x: number; y: number } | null) => ({ id: "p1", rot: 90, origin: { clientX: 150, clientY: 150, board } });

describe("dropAction", () => {
  it("відпускання над дошкою → координати в пікселях картинки", () => {
    expect(dropAction(piece(null), { clientX: 200, clientY: 150, cancelled: false }, rect, spec)).toEqual({ action: "puzzleDrop", pieceId: "p1", x: 1000, y: 500, rot: 90 });
  });

  it("поза дошкою або скасування → return", () => {
    expect(dropAction(piece(null), { clientX: 50, clientY: 150, cancelled: false }, rect, spec)).toEqual({ action: "puzzleReturn", pieceId: "p1" });
    expect(dropAction(piece(null), { clientX: 200, clientY: 150, cancelled: true }, rect, spec)).toEqual({ action: "puzzleReturn", pieceId: "p1" });
  });

  it("тап по фігурі на дошці повертає на місце з поворотом +45", () => {
    expect(dropAction(piece({ x: 10, y: 20 }), { clientX: 152, clientY: 151, cancelled: false }, rect, spec)).toEqual({ action: "puzzleDrop", pieceId: "p1", x: 10, y: 20, rot: 135 });
  });
});
