import { describe, expect, it } from "vitest";

import { GENERIC_EN, NAME_TABLES_EN } from "../names.en";
import { GENERIC_UK, NAME_TABLES_UK } from "../names.uk";
import { createRng, generateName } from "..";

describe("generateName tables are matched by id across both languages", () => {
  it("uk and en tables share the same ids in the same order", () => {
    expect(NAME_TABLES_EN.map((t) => t.id)).toEqual(NAME_TABLES_UK.map((t) => t.id));
    expect(GENERIC_EN.id).toBe(GENERIC_UK.id);
  });

  it("a Ukrainian race name with locale en gives a non-generic English name", () => {
    const dark = NAME_TABLES_EN.find((t) => t.id === "darkElf");

    for (let seed = 1; seed <= 20; seed++) {
      const name = generateName("Темний ельф", createRng(seed), "en");

      expect(dark?.first.some((first) => name.startsWith(first))).toBe(true);
      expect(/^[A-Za-z]+$/.test(name)).toBe(true);
    }
  });

  it("an English race name with locale uk gives a Ukrainian name", () => {
    expect(/^[А-ЯҐІЇЄа-яґіїє']+$/.test(generateName("Dwarf", createRng(3), "uk"))).toBe(true);
  });

  it("is deterministic for a seed", () => {
    expect(generateName("Гном", createRng(7), "uk")).toBe(generateName("Гном", createRng(7), "uk"));
  });
});
