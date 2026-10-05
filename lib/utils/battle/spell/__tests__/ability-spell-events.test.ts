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
});
