import { describe, expect, it } from "vitest";

import { parseDamageDice } from "@/lib/utils/skills/spell-enhancement";

describe("parseDamageDice", () => {
  it("splits count and sides", () => expect(parseDamageDice("2d8")).toEqual({ count: "2", sides: "8" }));
  it("defaults sides to 6 and count to empty", () => expect(parseDamageDice(undefined)).toEqual({ count: "", sides: "6" }));
});
