import { describe, expect, it } from "vitest";

import { spellRow } from "./helpers";

const ranged = { range: { type: "point", distance: { type: "feet", amount: 60 } }, duration: [{ type: "timed", duration: { type: "minute", amount: 1 }, concentration: true }] };

describe("autoReactionSpell", () => {
  it("an attack against the marked target answered by a reaction becomes mark + auto grantCast", () => {
    const d = spellRow(["Choose a creature within range. When a creature within 30 feet of the target makes an attack roll against the target, you can use your reaction to strike the attacker, dealing {@damage 2d8} lightning damage."], { ...ranged, damageInflict: ["lightning"] });

    expect(d).toMatchObject({
      native: {
        fields: {
          targeting: { kind: "ally", range: 60 },
          spellEffects: [
            { kind: "mark", target: "eventTarget", duration: { rounds: 10 } },
            { kind: "grantCast", cost: "reaction", cast: { targeting: { kind: "enemy", range: 30 }, resolution: { kind: "auto" }, dice: 2, dieSides: 8, anchorMarkId: "reactionAnchor", auto: { on: "attackAgainstMarked" }, effects: [{ kind: "dealDamage", damageType: "lightning" }] } },
          ],
        },
      },
    });
  });

  it("damage from a hostile creature answered by a ranged spell attack becomes an attack grant on damage", () => {
    const d = spellRow(["Choose a creature within range. A cloud follows the target. If the target takes damage from a hostile creature you can see, you can use your reaction to make a ranged spell attack, provided that creature is within 60 feet of the target. On a hit, the creature takes {@damage 2d8} lightning damage."], { ...ranged, damageInflict: ["lightning"], spellAttack: ["R"] });

    expect(d).toMatchObject({ native: { fields: { spellEffects: [{ kind: "mark" }, { kind: "grantCast", cost: "reaction", cast: { resolution: { kind: "attack" }, targeting: { range: 60 }, dice: 2, auto: { on: "damageToMarked" } } }] } } });
  });

  it("the attacker range defaults to 60 feet when the text gives none", () => {
    const d = spellRow(["When a creature makes an attack against the target, you can use your reaction to deal {@damage 1d6} fire damage to it."], { ...ranged, damageInflict: ["fire"] });

    expect(d).toMatchObject({ native: { fields: { spellEffects: [{}, { cast: { targeting: { range: 60 } } }] } } });
  });

  it("a reaction without a damage dice is not matched", () => {
    const d = spellRow(["When a creature makes an attack against the target, you can use your reaction to shove it away."], ranged);

    expect(JSON.stringify(d)).not.toContain("reactionAnchor");
  });

  it("ordinary attack-triggered wording without a reaction is not matched", () => {
    const d = spellRow(["When a creature makes an attack against the target, the attacker takes {@damage 1d6} fire damage."], { ...ranged, damageInflict: ["fire"] });

    expect(JSON.stringify(d)).not.toContain("reactionAnchor");
  });
});
