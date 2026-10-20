import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { aimView } from "@/lib/utils/battle/grid/map-scene";
import { assertAbilityAim } from "@/lib/utils/battle/validation/ability-aim";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleMapConfig } from "@/types/battle";

const map: BattleMapConfig = {
  cols: 12,
  rows: 12,
  background: null,
  opacity: 0.4,
  maze: { walls: ["6:5:e"], exit: { x: 11, y: 11 }, difficulty: "medium", teleports: [], fog: [], marks: {}, dark: false },
};

const base = createMockParticipant();

const actor = createMockParticipant({ battleData: { ...base.battleData, position: { x: 5, y: 5 }, facing: "e" } });

const ability = {
  id: "a",
  name: "Постріл",
  trigger: { event: "action" },
  effects: [{ kind: "note", text: "x" }],
  key: "unit:u:a",
  source: { type: "unit", id: "u", name: "U" },
  aim: { kind: "cell", range: 60 },
} as ResolvedAbility;

describe("приціл здібності в лабіринті", () => {
  it("клітинка в полі зору — ок; за стіною чи позаду — відмова", () => {
    expect(assertAbilityAim(ability, map, actor, { x: 6, y: 5 })).toEqual({ x: 6, y: 5 });
    expect(() => assertAbilityAim(ability, map, actor, { x: 8, y: 5 })).toThrow("Точка поза полем зору");
    expect(() => assertAbilityAim(ability, map, actor, { x: 2, y: 5 })).toThrow("Точка поза полем зору");
  });

  it("прев'ю шаблону на карті не малює приціл поза полем зору", () => {
    const aim = { template: { shape: "circle" as const, size: 5 }, casterId: actor.basicInfo.id, range: 60, onAim: () => undefined };

    expect(aimView({ map, participants: [actor] }, aim, { x: 6, y: 5 })).not.toBeNull();
    expect(aimView({ map, participants: [actor] }, aim, { x: 8, y: 5 })).toBeNull();
  });
});
