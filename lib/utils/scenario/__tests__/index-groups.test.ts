import { describe, expect, it } from "vitest";

import { groupIndex } from "@/lib/utils/scenario/index-groups";
import type { ScenarioPageSummary } from "@/types/scenario";

const page = (over: Partial<ScenarioPageSummary>): ScenarioPageSummary => ({ id: "x", kind: "scene", arc: null, title: "x", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 0, updatedAt: "", ...over });

describe("groupIndex", () => {
  it("сцени за арками в порядку першої появи, номер наскрізний за sortOrder", () => {
    const groups = groupIndex([
      page({ id: "b", arc: "Особисті", sortOrder: 2 }),
      page({ id: "a", arc: "Арка перша", sortOrder: 1 }),
      page({ id: "c", arc: "Арка перша", sortOrder: 0 }),
      page({ id: "h", kind: "hero", sortOrder: 0 }),
      page({ id: "n", kind: "note", sortOrder: 0 }),
      page({ id: "z", arc: null, sortOrder: 3 }),
    ]);

    expect(groups.arcs.map((g) => [g.arc, g.pages.map((p) => `${p.id}${p.number}`)])).toEqual([
      ["Арка перша", ["c1", "a2"]],
      ["Особисті", ["b3"]],
      ["Без арки", ["z4"]],
    ]);
    expect(groups.heroes.map((p) => p.id)).toEqual(["h"]);
    expect(groups.notes.map((p) => p.id)).toEqual(["n"]);
  });
});
