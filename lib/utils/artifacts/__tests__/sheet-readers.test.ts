import { describe, expect, it } from "vitest";

import { getCompletedArtifactSetsPreview } from "@/lib/utils/artifacts/get-completed-artifact-sets-preview";

describe("лист персонажа читає вміння", () => {
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
