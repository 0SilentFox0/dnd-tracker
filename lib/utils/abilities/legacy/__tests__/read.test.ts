import { afterEach, describe, expect, it, vi } from "vitest";

import { readAbilities, skillAbilities } from "@/lib/utils/abilities/legacy/read";

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

  it("масив з одним зламаним вмінням — бій бере валідні, а не старий формат", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const good = { id: "n", name: "Н", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] };

    const bad = { id: "b", name: "Б", trigger: { event: "passive" }, effects: [{ kind: "teleport" }] };

    expect(skillAbilities({ ...legacy, abilities: [good, bad] })).toEqual([good]);
    expect(warn).toHaveBeenCalled();
  });
});

describe("readAbilities для редактора", () => {
  it("масив зі зламаним вмінням віддається як є з loss-плашкою", () => {
    const good = { id: "n", name: "Н", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] };

    const bad = { id: "b", name: "Б", trigger: { event: "passive" }, effects: [{ kind: "teleport" }] };

    const r = readAbilities("skill", { ...legacy, abilities: [good, bad, 42] });

    expect(r.abilities).toEqual([good, bad]);
    expect(r.issues).toEqual([expect.objectContaining({ severity: "loss", message: expect.stringMatching(/невалідн/) })]);
  });
});
