import { describe, expect, it } from "vitest";

import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";

const ability = { id: "rage-bonus", name: "Bonus", trigger: { event: "passive" as const }, effects: [{ kind: "modifyStat" as const, stat: "armor" as const, flat: { scale: "bonus" } }] };

describe("collectCharacterAbilities + choice groups", () => {
  it("resolves group abilities with their source and class scale; no groups → same as before", () => {
    const columns = [{ key: "bonus", label: "Bonus", values: Array.from({ length: 20 }, (_, i) => String(i < 4 ? 1 : 2)) }];

    const out = collectCharacterAbilities({ skills: [], race: null, artifacts: [], completedSets: [], choiceGroups: [{ source: { type: "feat", id: "f1", name: "Alert" }, abilities: [ability], scale: { classId: "c", level: 5, columns } }] });

    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ source: { type: "feat", id: "f1" }, effects: [{ flat: 2 }] });
    expect(collectCharacterAbilities({ skills: [], race: null, artifacts: [], completedSets: [] })).toEqual([]);
  });
});
