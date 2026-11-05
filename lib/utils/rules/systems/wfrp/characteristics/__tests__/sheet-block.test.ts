import { describe, expect, it } from "vitest";

import { DEFAULT_CHARACTERISTICS } from "../keys";
import { wfrpSheetBlock } from "../sheet-block";

describe("wfrpSheetBlock sin", () => {
  it("reads Sin from resources, 0 when absent", () => {
    expect(wfrpSheetBlock({ characteristics: DEFAULT_CHARACTERISTICS, resources: { sin: 4 } }).sin).toBe(4);
    expect(wfrpSheetBlock({ characteristics: DEFAULT_CHARACTERISTICS, resources: {} }).sin).toBe(0);
  });
});
