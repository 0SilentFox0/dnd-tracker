import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";

const owner = (() => {
  const b = createMockParticipant();

  return { ...b, basicInfo: { ...b.basicInfo, id: "fin", name: "Фіндан" } };
})();

describe("джерело ефекту", () => {
  it("effectSource бере учасника й уміння", () => {
    expect(effectSource(owner, { name: "Отруйний клинок", source: { icon: "/i.png" } })).toEqual({
      participantId: "fin", name: "Фіндан", abilityName: "Отруйний клинок", icon: "/i.png",
    });
  });

  it("upsertTimedEffect записує source у ActiveEffect", () => {
    const target = createMockParticipant();

    const next = upsertTimedEffect(
      target,
      { timedKey: "k#0", name: "Отрута", type: "debuff", rounds: 2, stackable: false, source: effectSource(owner, { name: "Отруйний клинок" }) },
      1,
    );

    expect(next.battleData.activeEffects.at(-1)?.source).toMatchObject({ participantId: "fin", abilityName: "Отруйний клинок" });
  });

  it("ефект спела отримує кастера як джерело", () => {
    const target = createMockParticipant({ basicInfo: { ...createMockParticipant().basicInfo, id: "t", side: ParticipantSide.ENEMY } });

    const caster = { ...owner, spellcasting: { ...owner.spellcasting, spellSlots: { "1": { max: 1, current: 1 } } } };

    const spell: CastableSpell = {
      id: "s1",
      name: "Отруйна хмара",
      level: 1,
      groupId: null,
      icon: "/s.png",
      definition: { dice: 0, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "auto" }, effects: [{ kind: "dot", damagePerRound: 3, damageType: "poison", duration: { rounds: 2 } }], raceModifiers: [] },
    };

    const r = castSpell({ caster, spell, targetIds: ["t"], allParticipants: [caster, target], currentRound: 1, battleId: "b", diceRolls: [] });

    const t = r.allParticipantsUpdated.find((p) => p.basicInfo.id === "t");

    expect(t?.battleData.activeEffects.at(-1)?.source).toMatchObject({ participantId: "fin", abilityName: "Отруйна хмара", icon: "/s.png" });
  });
});
