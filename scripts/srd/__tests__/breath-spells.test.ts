import { describe, expect, it } from "vitest";

import * as converter from "../convert/race-choices";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { spellDice5e } from "@/lib/utils/spells/model/dice";

describe("Breath Weapon domain spells", () => {
  it("generates both shapes for each damage type with DEX/half and 1/2/3/4d10", () => {
    expect(converter).toHaveProperty("convertBreathSpells");

    if (!("convertBreathSpells" in converter)) return;

    const spells = (converter.convertBreathSpells as (data: ReturnType<typeof loadOpen5e>) => import("../lib/types").SpellRow[])(loadOpen5e(FIXTURE_4F4_DIR));

    expect(spells).toHaveLength(10);

    const fire = spells.filter((s) => s.name.includes("Fire,"));

    expect(fire.map((s) => s.targeting)).toEqual([
      { kind: "template", shape: "cone", size: 15, side: "enemy", maxTargets: 20, range: 5 },
      { kind: "template", shape: "line", size: 30, side: "enemy", maxTargets: 20, range: 5 },
    ]);
    expect(fire[0]).toMatchObject({ resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellEffects: [{ kind: "dealDamage", damageType: "fire", amount: { spellRoll: 100 }, target: "eventTarget" }] });
    expect([1, 5, 11, 17].map((level) => spellDice5e(fire[0], level, 0))).toEqual([1, 2, 3, 4].map((count) => ({ count, sides: 10 })));
    expect(fire[0].description).toContain("ДМ");
  });
});
