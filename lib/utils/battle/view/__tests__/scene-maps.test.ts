import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { buildDisplayEffects, buildParticipantFaces } from "@/lib/utils/battle/view";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const effect = (duration: number) => ({ id: "e1", name: "Щит", type: "buff", duration, effects: [], appliedAt: { round: 1, timestamp: "t" } }) as unknown as ActiveEffect;

const withEffect = (duration: number): BattleParticipant => {
  const b = createMockParticipant();

  return { ...b, battleData: { ...b.battleData, activeEffects: [effect(duration)] } };
};

describe("scene-maps", () => {
  it("ефекти: незмінений вміст — той самий масив, зміна значення — новий", () => {
    const first = buildDisplayEffects([withEffect(2)]);

    const id = [...first.keys()][0];

    expect(buildDisplayEffects([withEffect(2)], first).get(id)).toBe(first.get(id));
    expect(buildDisplayEffects([withEffect(1)], first).get(id)).not.toBe(first.get(id));
  });

  it("обличчя: ім'я й аватар за id", () => {
    const p = createMockParticipant();

    expect(buildParticipantFaces([p]).get(p.basicInfo.id)).toEqual({ name: p.basicInfo.name, avatar: p.basicInfo.avatar });
  });
});
