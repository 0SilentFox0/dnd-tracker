import { describe, expect, it } from "vitest";

import { buildDisplayEffects, collapseSystemConditions } from "../index";

import { textRef } from "@/lib/i18n/text-ref";
import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { applyWfrpConditionTo } from "@/lib/utils/rules/systems/wfrp/conditions/apply";
import { wfrpConditions } from "@/lib/utils/rules/systems/wfrp/conditions/levels";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const src = textRef("battleWfrp.log.removed", { target: "x", condition: "y" });

const bleeding = (p: BattleParticipant, levels: number) => applyWfrpConditionTo(p, { key: "bleeding", levels, round: 1, sourceName: src }).participant;

const buff = { id: "buff", type: "buff", name: "Bless", abilityKey: "bless", duration: 3, effects: [] } as unknown as ActiveEffect;

const bled = () => {
  const base = bleeding(bleeding(makeParticipant({ id: "a" }), 1), 2);

  return { ...base, battleData: { ...base.battleData, activeEffects: [base.battleData.activeEffects[0], buff, ...base.battleData.activeEffects.slice(1)] } };
};

describe("collapseSystemConditions", () => {
  it("folds same-condition effects into the first one with the summed level", () => {
    const p = bled();

    const out = collapseSystemConditions(p.battleData.activeEffects, wfrpConditions(p));

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: p.battleData.activeEffects[0].id, level: 3 });
    expect(out[1]).toBe(buff);
  });

  it("returns the input untouched without levels", () => {
    const effects = bled().battleData.activeEffects;

    expect(collapseSystemConditions(effects, [])).toBe(effects);
  });
});

describe("buildDisplayEffects", () => {
  it("collapses only under a system with conditions", () => {
    const p = bled();

    expect(buildDisplayEffects([p], undefined, WFRP_RULES).get("a")).toHaveLength(2);
    expect(buildDisplayEffects([p], undefined, DEFAULT_RULES).get("a")).toHaveLength(3);
    expect(buildDisplayEffects([p]).get("a")).toHaveLength(3);
  });
});
