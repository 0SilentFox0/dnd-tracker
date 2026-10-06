import { afterEach, describe, expect, it, vi } from "vitest";

import { readAbilities, skillAbilities } from "@/lib/utils/abilities/read";

const good = { id: "n", name: "Н", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] };

const bad = { id: "b", name: "Б", trigger: { event: "passive" }, effects: [{ kind: "teleport" }] };

describe("skillAbilities", () => {
  afterEach(() => vi.restoreAllMocks());

  it("валідна колонка", () => {
    expect(skillAbilities({ id: "s", abilities: [good] })).toEqual([good]);
  });

  it("NULL → [] без старого формату", () => {
    expect(skillAbilities({ id: "s", abilities: null, combatStats: { effects: [{ stat: "armor", type: "flat", value: 1 }] } } as never)).toEqual([]);
  });

  it("сміття → [] + warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(skillAbilities({ id: "s", abilities: { bad: true } })).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it("масив з одним зламаним вмінням — бій бере валідні", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(skillAbilities({ id: "s", abilities: [good, bad] })).toEqual([good]);
    expect(warn).toHaveBeenCalled();
  });
});

describe("readAbilities для редактора", () => {
  it("NULL → порожній список без плашки", () => {
    expect(readAbilities("race", { id: "r", abilities: null })).toEqual({ abilities: [], issues: [] });
  });

  it("масив зі зламаним вмінням віддається як є з loss-плашкою", () => {
    const r = readAbilities("skill", { id: "s", abilities: [good, bad, 42] });

    expect(r.abilities).toEqual([good, bad]);
    expect(r.issues).toEqual([expect.objectContaining({ severity: "loss", message: expect.stringMatching(/невалідн/) })]);
  });

  it("не масив — порожній список і loss-плашка", () => {
    expect(readAbilities("unit", { id: "u", abilities: { bad: true } }).issues).toEqual([expect.objectContaining({ severity: "loss" })]);
  });
});
