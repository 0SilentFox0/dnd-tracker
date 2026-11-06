import { describe, expect, it } from "vitest";

import { armourSl } from "../armour";
import { wfrpCastTest } from "../cast-test";
import { ARMOUR_SL_PER_AP } from "../constants";
import { caster } from "./fixtures";

import { mulberry32 } from "@/lib/utils/common/rng";
import type { CastTestCtx } from "@/lib/utils/rules/systems/types";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

describe("armourSl", () => {
  it("is 0 without armour", () => {
    expect(armourSl(caster())).toBe(0);
  });

  it("uses the larger of head and body AP", () => {
    expect(armourSl(caster({ ap: { head: 1, arm: 9, body: 3, leg: 9 } }))).toBe(3 * ARMOUR_SL_PER_AP);
  });

  it("is 0 for flexible armour", () => {
    const p = caster({ ap: { head: 3, arm: 0, body: 3, leg: 0 } });

    expect(armourSl({ ...p, abilities: { ...p.abilities, wfrp: { ...p.abilities.wfrp!, flexible: true } } })).toBe(0);
  });

  it("makes a cast with SL 4 fail against CN 2 at AP 3", () => {
    const spell = { id: "s", name: "Bolt", level: 1, groupId: null, definition: {} } as unknown as CastTestCtx["spell"];

    const cast = (ap: number) => wfrpCastTest({ caster: caster({ ap: { head: 0, arm: 0, body: ap, leg: 0 } }), spell, magic: { cn: 2, kind: "arcane", overcast: null }, rules: WFRP_RULES, rng: mulberry32(1), presetRoll: 10 });

    expect(cast(0).success).toBe(true);
    expect(cast(3).success).toBe(false);
  });
});
