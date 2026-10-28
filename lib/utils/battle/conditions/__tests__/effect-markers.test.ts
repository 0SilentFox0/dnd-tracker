import { describe, expect, it } from "vitest";

import { EffectMarker } from "@/lib/constants/battle";
import { CONDITION_5E_KEYS, isCondition5eKey } from "@/lib/utils/abilities/schema/kinds";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { hasCondition } from "@/lib/utils/battle/conditions";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const withMarkers = (...types: string[]): BattleParticipant => {
  const p = createMockParticipant();

  const effect = { id: "e", name: "e", type: "condition", effects: types.map((type) => ({ type, value: 1 })) } as unknown as ActiveEffect;

  return { ...p, battleData: { ...p.battleData, activeEffects: [effect] } };
};

describe("hasCondition == hasEffectMarker", () => {
  it.each([[["frightened"]], [["paralyzed", EffectMarker.IMMOBILIZED]], [[]]])("маркери %j", (markers) => {
    const p = withMarkers(...markers);

    for (const key of CONDITION_5E_KEYS) expect(hasCondition(p, key)).toBe(hasEffectMarker(p, key));
  });

  it("EffectMarker дає ті самі рядки, що й раніше", () => {
    expect(Object.values(EffectMarker).sort()).toEqual(["disengaged", "immobilized", "no_bonus_action", "no_reaction", "skip_action"]);
    expect(hasEffectMarker(withMarkers("skip_action"), EffectMarker.SKIP_ACTION)).toBe(true);
  });

  it("isCondition5eKey", () => {
    expect(isCondition5eKey("prone")).toBe(true);
    expect(isCondition5eKey("immobilized")).toBe(false);
    expect(isCondition5eKey(undefined)).toBe(false);
  });
});
