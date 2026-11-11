// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BattleSceneDataContext, useBattleRules } from "@/lib/hooks/battle";
import type { BattleSceneData } from "@/lib/hooks/battle/types";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { RuleSystemKey } from "@/lib/utils/rules/systems";
import { sceneOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";

const render = (key: RuleSystemKey, momentum?: { ally?: true }) => {
  const value = { battle: { rules: { ...DEFAULT_RULES, system: { key } }, system: momentum && sceneOf(momentum) } } as unknown as BattleSceneData;

  const wrapper = ({ children }: { children: ReactNode }) => <BattleSceneDataContext.Provider value={value}>{children}</BattleSceneDataContext.Provider>;

  return renderHook(() => useBattleRules(), { wrapper }).result.current;
};

describe("useBattleRules", () => {
  it("homm: d20 flags", () => {
    expect(render("homm")).toMatchObject({ dice: 20, d20Stats: true, spells: true, woundsLabel: "hp", distance: { unit: "ft", perCell: 5 } });
  });

  it("wfrp: d100 flags", () => {
    const rules = render("wfrp", { ally: true });

    expect(rules.sceneHeldBy("ally")).toBe(true);
    expect(rules.sceneHeldBy("enemy")).toBe(false);
    expect(rules).toMatchObject({
      dice: 100,
      d20Stats: false,
      spells: true,
      magic: true,
      actionEconomy: { bonusAction: false, reaction: false },
      distance: { unit: "yd", perCell: 2 },
      woundsLabel: "wounds",
    });
  });
});
