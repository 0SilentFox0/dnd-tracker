import { describe, expect, it } from "vitest";

import { faceLabel } from "../scene";

describe("faceLabel", () => {
  it("десятки читаються як 00..90", () => {
    expect(faceLabel(10, true)).toBe("00");
    expect(faceLabel(4, true)).toBe("40");
  });

  it("одиниці без змін", () => {
    expect(faceLabel(10, false)).toBe("10");
    expect(faceLabel(7, false)).toBe("7");
  });
});
