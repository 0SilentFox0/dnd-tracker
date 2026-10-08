import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";

const firebolt: CastableSpell = {
  id: "s1",
  name: "Вогняна стріла",
  level: 1,
  groupId: null,
  definition: { dice: 1, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [{ kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" }], raceModifiers: [] },
};

function cast(caster = makeParticipant({ id: "c" }), others = [makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 3 })]) {
  const withSlots = { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

  return castSpell({ caster: withSlots, spell: firebolt, targetIds: ["e"], allParticipants: [withSlots, ...others], currentRound: 1, battleId: "b1", diceRolls: [5], rng: seq(0) });
}

const hpOf = (r: ReturnType<typeof cast>, id: string) => r.allParticipantsUpdated.find((p) => p.basicInfo.id === id)?.combatStats.currentHp as number;

describe("spell ability events", () => {
  it("spellCast after спрацьовує і пише в лог", () => {
    const focus = resolved({ trigger: { event: "spellCast", phase: "after", role: "caster" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const r = cast(makeParticipant({ id: "c", abilities: [focus] }), [makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 })]);

    expect(r.casterUpdated.combatStats.morale).toBe(1);
    expect(r.battleAction.resultText).toContain("📊");
  });

  it("смерть від заклинання дає kill: вбивця і союзники загиблого", () => {
    const glory = resolved({ trigger: { event: "kill", role: "killer" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] }, { id: "m" });

    const r = cast(makeParticipant({ id: "c", abilities: [glory] }), [
      makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 3 }),
      makeParticipant({ id: "e2", side: ParticipantSide.ENEMY, abilities: [mourn] }),
    ]);

    expect(r.casterUpdated.combatStats.morale).toBe(1);
    expect(r.allParticipantsUpdated?.find((p) => p.basicInfo.id === "e2")?.combatStats.morale).toBe(-1);
  });

  it("бонус шкоди з spellCast/before діє на це заклинання", () => {
    const focus = resolved({ trigger: { event: "spellCast", phase: "before", role: "caster" }, effects: [{ kind: "damageBonus", filter: { kind: "magic" }, percent: 100 }] });

    const tank = () => [makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100 })];

    const plain = cast(makeParticipant({ id: "c" }), tank());

    const boosted = cast(makeParticipant({ id: "c", abilities: [focus] }), tank());

    expect(hpOf(boosted, "e")).toBeLessThan(hpOf(plain, "e"));
  });

  it("опір цілі з spellCast/before (role target) зменшує шкоду цього заклинання", () => {
    const ward = resolved({ trigger: { event: "spellCast", phase: "before", role: "target" }, effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 100, target: "self" }] });

    const r = cast(makeParticipant({ id: "c" }), [makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100, abilities: [ward] })]);

    expect(hpOf(r, "e")).toBe(100);
  });
});
