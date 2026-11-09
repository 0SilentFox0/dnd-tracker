import { describe, expect, it } from "vitest";

import { readGrimData } from "../data";
import { validateGrimData } from "../validate-data";

describe("grim-d100 catalog", () => {
  it("passes the validator", () => {
    expect(validateGrimData(readGrimData())).toEqual({ ok: true });
  });
});
