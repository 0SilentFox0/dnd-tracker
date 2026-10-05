import { afterEach, describe, expect, it, vi } from "vitest";

import { skillAbilities } from "@/lib/utils/abilities/legacy/read";

const legacy = { id: "s", name: "С", combatStats: { effects: [{ stat: "armor", type: "flat", value: 1 }] }, bonuses: {}, skillTriggers: [{ type: "simple", trigger: "passive" }] };

describe("skillAbilities", () => {
  afterEach(() => vi.restoreAllMocks());

  it("валідна колонка має пріоритет", () => {
    const abilities = [{ id: "n", name: "Н", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }];

    expect(skillAbilities({ ...legacy, abilities })).toEqual(abilities);
  });

  it("NULL → конвертер", () => {
    expect(skillAbilities({ ...legacy, abilities: null })[0].effects).toEqual([{ kind: "modifyStat", stat: "armor", flat: 1 }]);
  });

  it("сміття → конвертер + warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(skillAbilities({ ...legacy, abilities: { bad: true } })).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });
});
