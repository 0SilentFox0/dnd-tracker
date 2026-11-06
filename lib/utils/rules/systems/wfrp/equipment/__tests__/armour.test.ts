import { describe, expect, it } from "vitest";

import { armourAp } from "../armour";
import { AP_CAP } from "../constants";

const layer = (locations: Partial<Record<"head" | "arm" | "body" | "leg", number>>, qualities: unknown[] = []) => ({
  type: "armour",
  locations: { head: 0, arm: 0, body: 0, leg: 0, ...locations },
  kind: "soft",
  qualities,
  weight: 1,
  price: 1,
});

const shield = (value: number) => ({ type: "gear", weight: 1, price: 1, qualities: [{ key: "shield", value }] });

const ZERO = { head: 0, arm: 0, body: 0, leg: 0 };

describe("armourAp", () => {
  it("returns zeros without items", () => {
    expect(armourAp([])).toEqual({ ap: ZERO, flexible: false });
  });

  it("sums layers per location", () => {
    const r = armourAp([
      { slot: "armor", systemStats: layer({ body: 2, arm: 1 }) },
      { slot: "helmet", systemStats: layer({ head: 2, body: 1 }) },
    ]);

    expect(r.ap).toEqual({ head: 2, arm: 1, body: 3, leg: 0 });
  });

  it("caps each location", () => {
    const r = armourAp([
      { slot: "armor", systemStats: layer({ body: 8 }) },
      { slot: "helmet", systemStats: layer({ body: 8 }) },
    ]);

    expect(r.ap.body).toBe(AP_CAP);
  });

  it("shield adds to head/arm/body only, even without armour", () => {
    expect(armourAp([{ slot: "shield", systemStats: shield(2) }]).ap).toEqual({ head: 2, arm: 2, body: 2, leg: 0 });
    expect(armourAp([{ slot: "weapon", systemStats: shield(1) }]).ap.arm).toBe(1);
  });

  it("skips unparsable stats and ignores other slots", () => {
    const r = armourAp([
      { slot: "armor", systemStats: { type: "armour" } },
      { slot: "armor", systemStats: null },
      { slot: "ring", systemStats: layer({ body: 3 }) },
      { slot: "ring", systemStats: shield(2) },
    ]);

    expect(r).toEqual({ ap: ZERO, flexible: false });
  });

  it("is flexible only when every AP layer is flexible", () => {
    const flex = [{ key: "flexible" }];

    expect(armourAp([{ slot: "armor", systemStats: layer({ body: 1 }, flex) }]).flexible).toBe(true);
    expect(
      armourAp([
        { slot: "armor", systemStats: layer({ body: 1 }, flex) },
        { slot: "helmet", systemStats: layer({ head: 1 }) },
      ]).flexible,
    ).toBe(false);
  });
});
