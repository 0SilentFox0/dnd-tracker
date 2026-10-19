import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "./fixtures";

import { ELF_UNITS } from "@/data/library/units/elves";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { BattleParticipant } from "@/types/battle";

const dancer = (movementUsed?: number): BattleParticipant => {
  const step = ELF_UNITS.find((u) => u.key === "elves-wind-dancer")?.abilities.find((a) => a.id === "unit-wind-step");

  if (!step) throw new Error("unit-wind-step");

  const p = makeParticipant({ id: "d", abilities: [resolved(step, { type: "unit", id: "d" })] });

  return { ...p, battleData: { ...p.battleData, ...(movementUsed !== undefined && { movementUsed }) } };
};

const melee = (p: BattleParticipant) => collectModifiers([p], "d", { damage: { kind: "melee" } }).flat;

describe("cells_moved у формулах", () => {
  it("+2 шкоди за кожну пройдену клітинку", () => {
    expect(melee(dancer(3))).toBe(6);
  });

  it("без руху — нуль", () => {
    expect(melee(dancer(0))).toBe(0);
    expect(melee(dancer())).toBe(0);
  });
});
