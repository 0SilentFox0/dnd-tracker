import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { applyBattleResult, applyCharacterResources } from "@/lib/utils/characters/resources/battle";
import { editResources } from "@/lib/utils/characters/resources/edit";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import { CharacterResourcesSchema } from "@/lib/utils/characters/resources/schema";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

describe("sin resource", () => {
  it("schema accepts 0-10 only", () => {
    expect(CharacterResourcesSchema.safeParse({ sin: 10 }).success).toBe(true);
    expect(CharacterResourcesSchema.safeParse({ sin: 11 }).success).toBe(false);
    expect(CharacterResourcesSchema.safeParse({ sin: -1 }).success).toBe(false);
  });

  it("the DM edit sets it in wfrp only and reset keeps it", () => {
    expect(editResources({}, { sin: 3 }, undefined, {}, { fateMax: 2 })).toEqual({ sin: 3 });
    expect(editResources({}, { sin: 3 })).toEqual({});
    expect(editResources({ sin: 3, hp: 1 }, { reset: true }, undefined, {}, { fateMax: 2 })).toEqual({ fortune: 2, sin: 3 });
  });

  it("a long rest keeps it", () => {
    expect(applyRest("long", { sin: 2 }, { pool: [], longRestHitDice: "half" }).sin).toBe(2);
  });

  it("is copied into battleData and never written back by the battle", () => {
    const p = applyCharacterResources(createMockParticipant(), { resources: { sin: 3 }, inspiration: null }, WFRP_RULES);

    expect(p.battleData.sin).toBe(3);

    const changed = { ...p, battleData: { ...p.battleData, sin: 9 } };

    expect(applyBattleResult({ sin: 3 }, changed).sin).toBe(3);
  });
});
