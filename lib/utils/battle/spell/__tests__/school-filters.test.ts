import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";

const spellOf = (key: string): CastableSpell => {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(key);

  return { id: key, name: s.name, level: s.level, groupId: s.school, definition: { ...s.definition, raceModifiers: [] } };
};

const vulnerable = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: -25, school: "Хаос" }] });

const absorb = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellAbsorb", school: "Хаос", percent: 50 }] });

function hitWith(key: string, targetAbilities: ReturnType<typeof resolved>[]) {
  const caster = makeParticipant({ id: "c" });

  const target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100, abilities: targetAbilities });

  const r = castSpell({ caster, spell: spellOf(key), targetIds: ["t"], allParticipants: [caster, target], currentRound: 1, battleId: "b", diceRolls: [10, 10, 10], rng: seq(0.5), isDMCast: true });

  return r.allParticipantsUpdated.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp as number;
}

const schoolOf = (key: string) => SPELLS.find((s) => s.key === key)?.school;

describe("шкільні фільтри заклинань", () => {
  const plainLoss = 100 - hitWith("eldritch-arrow", []);

  it("вразливість до Хаосу: +25 % від заклинань Хаосу, інші школи без змін", () => {
    expect(schoolOf("eldritch-arrow")).toBe("Хаос");
    expect(100 - hitWith("eldritch-arrow", [vulnerable])).toBe(Math.floor(plainLoss * 1.25));

    const light = SPELLS.find((s) => s.school !== "Хаос" && s.definition.effects.some((e) => e.kind === "dealDamage") && s.definition.targeting.kind === "enemy");

    if (!light) throw new Error("no non-chaos damage spell");

    expect(hitWith(light.key, [vulnerable])).toBe(hitWith(light.key, []));
  });

  it("поглинання: лікує частину шкоди від заклинання Хаосу, не від інших шкіл", () => {
    expect(plainLoss).toBeGreaterThan(0);

    const loss = 100 - hitWith("eldritch-arrow", [absorb]);

    expect(loss).toBe(plainLoss - Math.floor(plainLoss / 2));

    const other = SPELLS.find((s) => s.school !== "Хаос" && s.definition.effects.some((e) => e.kind === "dealDamage") && s.definition.targeting.kind === "enemy");

    expect(hitWith(other?.key ?? "", [absorb])).toBe(hitWith(other?.key ?? "", []));
  });
});
