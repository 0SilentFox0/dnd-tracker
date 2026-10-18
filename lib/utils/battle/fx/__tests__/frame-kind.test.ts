import { describe, expect, it } from "vitest";

import { frameKindOf } from "@/lib/utils/battle/fx";

describe("frameKindOf", () => {
  it("heal wins over the element", () => {
    expect(frameKindOf({ element: "fire", kind: "heal", delayMs: 0 })).toBe("heal");
  });

  it("physical splits by attack kind; no attack kind → blade", () => {
    expect(frameKindOf({ element: "physical", kind: "damage", delayMs: 0, attack: "ranged" })).toBe("physical-ranged");
    expect(frameKindOf({ element: "physical", kind: "damage", delayMs: 0, attack: "melee" })).toBe("physical-melee");
    expect(frameKindOf({ element: "physical", kind: "damage", delayMs: 0 })).toBe("physical-melee");
  });

  it("other elements map to themselves", () => {
    expect(frameKindOf({ element: "cold", kind: "damage", delayMs: 0, attack: "ranged" })).toBe("cold");
  });
});
