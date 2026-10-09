import { describe, expect, it } from "vitest";

import { fitWithin } from "@/lib/utils/common/image-resize";

describe("fitWithin", () => {
  it("не збільшує малі фото", () => expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 }));
  it("зменшує по довшій стороні, зберігаючи пропорцію", () => expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 }));
  it("горизонтальне", () => expect(fitWithin(4000, 1000, 1200)).toEqual({ width: 1200, height: 300 }));
});
