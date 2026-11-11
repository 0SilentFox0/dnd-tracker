import { describe, expect, it } from "vitest";

import { encumbranceItemsOf } from "../useEncumbrance";

import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { encumbrance } from "@/systems/wfrp/rules/equipment";

const stats = (weight: number) => ({ type: "gear", weight, price: 1, qualities: [] });

const artifact = (id: string, weight: number) => ({ id, name: id, slot: "ring", systemStats: stats(weight) }) as never;

const special = (artifactId: string | undefined, quantity: number) => ({ id: "s", name: "s", quantity, consumable: false, ...(artifactId && { artifactId }) });

const weigh = (items: ReturnType<typeof encumbranceItemsOf>) => encumbrance(items, { base: DEFAULT_CHARACTERISTICS.base, advances: DEFAULT_CHARACTERISTICS.advances }).carried;

describe("encumbranceItemsOf", () => {
  it("counts a special item backed by an artifact by quantity", () => {
    const items = encumbranceItemsOf([artifact("rope", 2)], [], [special("rope", 3)]);

    expect(weigh(items)).toBe(2 + 2 * 3);
  });

  it("special items without a known artifact weigh nothing", () => {
    expect(weigh(encumbranceItemsOf([], [artifact("a", 1)], [special(undefined, 5), special("missing", 5)]))).toBe(1);
  });
});
