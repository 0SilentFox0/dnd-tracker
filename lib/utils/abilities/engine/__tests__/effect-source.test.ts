import { describe, expect, it } from "vitest";

import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { applySpellAdditionalModifier } from "@/lib/utils/battle/spell/process-effects";

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

  it("модифікатор спела отримує кастера як джерело", () => {
    const target = createMockParticipant();

    const [t] = applySpellAdditionalModifier(
      { id: "s1", name: "Отруйна хмара", icon: "/s.png" } as never,
      [target],
      { modifier: "poison", duration: 2, damage: 3 },
      1,
      owner,
    );

    expect(t.battleData.activeEffects.at(-1)?.source).toMatchObject({ participantId: "fin", abilityName: "Отруйна хмара", icon: "/s.png" });
  });
});
