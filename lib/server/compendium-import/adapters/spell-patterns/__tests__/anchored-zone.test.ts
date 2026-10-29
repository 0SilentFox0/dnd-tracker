import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

import { SpellDefinitionSchema } from "@/lib/utils/spells/model/schema";

const timed = { range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }], savingThrow: ["charisma"] };

const text = "Choose a creature within range. Each creature within 20 feet of the target must make a Charisma saving throw. On a failed save, the creature can't take actions or bonus actions. The effect on a creature ends if it starts its turn outside the area.";

describe("anchoredZoneSpell", () => {
  it("aura around the target with save, conditions and the leave rule", () => {
    const d = spellRow([text], timed);

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "enemy", range: 60 },
          resolution: { kind: "auto" },
          spellEffects: [
            {
              kind: "anchoredZone",
              radiusFeet: 20,
              side: "all",
              endsWhenStartOutside: true,
              duration: { rounds: 10 },
              onEnter: { save: { ability: "charisma" }, effects: [{ condition: "skip_action" }, { condition: "no_bonus_action" }] },
            },
          ],
        },
      },
    });
  });

  it("the derived fields pass the spell schema", () => {
    const d = spellRow([text], timed);

    expect("native" in d && SpellDefinitionSchema.safeParse({ cost: "action", raceModifiers: [], effects: [], ...d.native.fields }).success).toBe(true);
  });

  it("without an area around the target or an action restriction it is not matched", () => {
    expect(JSON.stringify(spellRow(["Each creature within 20 feet of you must make a Charisma saving throw or be {@condition prone}."], { ...timed, conditionInflict: ["prone"] }))).not.toContain("anchoredZone");
    expect(JSON.stringify(spellRow(["Each creature within 20 feet of the target must make a Charisma saving throw or take 2d6 psychic damage."], { ...timed, damageInflict: ["psychic"] }))).not.toContain("anchoredZone");
  });
});
