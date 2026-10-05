import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { type BattleSpell, processSpell } from "@/lib/utils/battle/spell";

const firebolt = {
  id: "s1",
  name: "Вогняна стріла",
  level: 1,
  type: "target",
  target: "enemies",
  damageType: "damage",
  damageElement: "fire",
  groupId: null,
  damageModifier: null,
  healModifier: null,
  diceCount: 1,
  diceType: "d10",
  savingThrow: null,
  description: "",
  duration: null,
  castingTime: "1 action",
} as unknown as BattleSpell;

function cast(caster = makeParticipant({ id: "c" }), others = [makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 3 })]) {
  const withSlots = { ...caster, spellcasting: { ...caster.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };

  return processSpell({ caster: withSlots, spell: firebolt, targetIds: ["e"], allParticipants: [withSlots, ...others], currentRound: 1, battleId: "b1", damageRolls: [8], rng: seq(0) });
}

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

    expect(boosted.spellCalculation?.totalDamage ?? 0).toBeGreaterThan(plain.spellCalculation?.totalDamage ?? 0);
  });

  it("опір цілі з spellCast/before (role target) зменшує шкоду цього заклинання", () => {
    const ward = resolved({ trigger: { event: "spellCast", phase: "before", role: "target" }, effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 100, target: "self" }] });

    const r = cast(makeParticipant({ id: "c" }), [makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100, abilities: [ward] })]);

    expect(r.targetsUpdated[0].combatStats.currentHp).toBe(100);
  });
});
