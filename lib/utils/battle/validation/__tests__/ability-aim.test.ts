import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { assertAbilityAim } from "@/lib/utils/battle/validation/ability-aim";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleMapConfig } from "@/types/battle";

const map: BattleMapConfig = { cols: 20, rows: 20, background: null, opacity: 0.4 };

const actor = createMockParticipant({ battleData: { ...createMockParticipant().battleData, position: { x: 5, y: 5 } } });

const ability = (aim?: ResolvedAbility["aim"]): ResolvedAbility => ({
  id: "a",
  name: "Постріл",
  trigger: { event: "action" },
  effects: [{ kind: "note", text: "x" }],
  key: "unit:u:a",
  source: { type: "unit", id: "u", name: "U" },
  ...(aim && { aim }),
} as ResolvedAbility);

describe("assertAbilityAim", () => {
  it("requires a cell on a map", () => {
    expect(() => assertAbilityAim(ability({ kind: "cell", range: 30 }), map, actor, undefined)).toThrow("Оберіть клітинку на карті");
  });

  it("rejects a cell out of range", () => {
    expect(() => assertAbilityAim(ability({ kind: "cell", range: 30 }), map, actor, { x: 15, y: 5 })).toThrow("Задалеко");
  });

  it("accepts a cell in range", () => {
    expect(assertAbilityAim(ability({ kind: "direction", range: 30 }), map, actor, { x: 8, y: 5 })).toEqual({ x: 8, y: 5 });
  });

  it("ignores the cell without a map", () => {
    expect(assertAbilityAim(ability({ kind: "cell", range: 30 }), null, actor, undefined)).toBeUndefined();
  });

  it("ignores abilities without aim", () => {
    expect(assertAbilityAim(ability(), map, actor, { x: 1, y: 1 })).toBeUndefined();
  });
});
