import { describe, expect, it } from "vitest";

import { convertUnits, multiattackCount } from "../convert/units";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

import { AttackType } from "@/lib/constants/battle";
import { proficiencyForChallenge } from "@/lib/constants/challenge";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { attackDamageModifier } from "@/lib/utils/battle/attack/ability";
import { calculateAttackBonus } from "@/lib/utils/battle/attack/bonus";
import { parseDice } from "@/lib/utils/common/dice";
import type { BattleAttack } from "@/types/battle";

const units = convertUnits(loadOpen5e(FIXTURE_DIR));

function engineTotals(name: string, attackName: string) {
  const unit = units.find((u) => u.name === name)!;

  const row = unit.attacks.find((a) => a.name === attackName)!;

  const base = makeParticipant({ id: "m" });

  const participant = {
    ...base,
    abilities: { ...base.abilities, strength: unit.strength, dexterity: unit.dexterity, proficiencyBonus: proficiencyForChallenge(unit.cr), damageModel: "5e" as const },
  };

  const attack: BattleAttack = { id: "a", name: row.name, type: row.type === "ranged" ? AttackType.RANGED : AttackType.MELEE, attackBonus: row.attackBonus, damageDice: row.damageDice, damageType: row.damageType, ...(row.traits && { traits: row.traits }) };

  return { toHit: calculateAttackBonus(participant, attack), damageFlat: (parseDice(row.damageDice)?.flat ?? 0) + attackDamageModifier(participant, attack) };
}

describe("monster attacks reproduce the SRD statblock through the engine formula", () => {
  it("Adult Red Dragon Rend: +14 to hit, 1d10 + 8", () => {
    expect(engineTotals("Adult Red Dragon", "Rend")).toEqual({ toHit: 14, damageFlat: 8 });
  });

  it("Goblin Warrior Scimitar and Shortbow: +4 to hit, +2 damage", () => {
    expect(engineTotals("Goblin Warrior", "Scimitar")).toEqual({ toHit: 4, damageFlat: 2 });
    expect(engineTotals("Goblin Warrior", "Shortbow")).toEqual({ toHit: 4, damageFlat: 2 });
  });
});

describe("multiattackCount", () => {
  it.each([
    ["The devil makes two Claw attacks and one Infernal Sting attack.", 3],
    ["The devil makes one Bite attack, two Claw attacks and one Fiery Mace attack.", 4],
    ["The devil makes one Claws attack and one Tail attack, or it makes two Hurl Flame attacks.", 2],
    ["The chimera makes one Ram attack, one Bite attack, and one Claw attack. It can replace the Claw attack with a use of Fire Breath if available.", 3],
    ["The behir makes one Bite attack and uses Constrict.", 1],
    ["The goblin makes two attacks, using Scimitar or Shortbow in any combination.", 2],
    ["The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast Shatter.", 3],
    ["The golem makes two Slam attacks, or it makes three Slam attacks if it used Hasten this turn.", 2],
    ["The devil makes one Beard attack and one Infernal Glaive attack.", 2],
    ["The snake uses Constrict.", 1],
  ])("%s -> %i", (desc, count) => {
    expect(multiattackCount(desc)).toBe(count);
  });
});

describe("unit overrides", () => {
  it("Octopus has no bogus Con/Cha saves", () => {
    expect(units.find((u) => u.name === "Octopus")).toMatchObject({ constitution: 11, charisma: 4, saveProficiencies: [] });
  });
});
