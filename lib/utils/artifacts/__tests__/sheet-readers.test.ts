import { describe, expect, it } from "vitest";

import { getCompletedArtifactSetsPreview } from "@/lib/utils/artifacts/get-completed-artifact-sets-preview";
import { sumEquippedArtifactFlatBonuses } from "@/lib/utils/artifacts/sum-equipped-artifact-flat-bonuses";

describe("лист персонажа читає вміння", () => {
  it("sheetBonuses артефакта мають пріоритет над старими колонками", () => {
    const totals = sumEquippedArtifactFlatBonuses({ ring: "r1" } as never, [
      { id: "r1", bonuses: { strength: 5 }, sheetBonuses: { stats: { strength: 2, armorClass: 1 }, spellSlotBonusByLevel: { "1": 1 } } },
    ]);

    expect(totals.strength).toBe(2);
    expect(totals.armorClass).toBe(1);
    expect(totals.spellSlotBonusByLevel).toEqual({ "1": 1 });
  });

  it("повний сет з уміннями показується, навіть якщо setBonus лише з назвою", () => {
    const preview = getCompletedArtifactSetsPreview({ ring: "r1", amulet: "a1" } as never, [
      { id: "s1", name: "Дракон", setBonus: { name: "Кров дракона" }, abilitySummary: ["Пасивно · AC +1"], artifacts: [{ id: "r1" }, { id: "a1" }] } as never,
      { id: "s2", name: "Порожній", setBonus: null, abilitySummary: ["Пасивно · сила +1"], artifacts: [{ id: "r1" }] } as never,
    ]);

    expect(preview.map((p) => [p.displayName, p.abilitySummary])).toEqual([
      ["Кров дракона", ["Пасивно · AC +1"]],
      ["Порожній", ["Пасивно · сила +1"]],
    ]);
  });
});
