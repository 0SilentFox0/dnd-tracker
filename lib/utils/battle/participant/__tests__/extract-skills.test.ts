import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveCharacterSkillEntries } from "../extract-skills";

import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/db", () => ({
  prisma: { skillTree: { findFirst: vi.fn() }, skill: { findMany: vi.fn() }, mainSkill: { findMany: vi.fn() } },
}));

const row = (id: string, name: string, mainSkillId: string | null = null) => ({ id, name, mainSkillId }) as never;

const TREE = {
  id: "row-tree",
  race: "Ельф",
  skills: buildTreeJson({ race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", levels: { basic: "lvl-b", advanced: "lvl-a" }, outer: ["o1"] }], racial: { basic: "rac" } }),
} as never;

const SKILLS = { "lvl-b": row("lvl-b", "Сила удару", "attack"), "lvl-a": row("lvl-a", "Міць удару", "attack"), o1: row("o1", "Кровопуск", "attack"), rac: row("rac", "Ельфійське око"), pers: row("pers", "Особисте") };

const character = (unlocked: string[], extra: Record<string, unknown> = {}) =>
  ({ id: "c", race: "Ельф", campaignId: "camp", skillTreeProgress: { "row-tree": { unlockedSkills: unlocked } }, ...extra }) as never;

describe("resolveCharacterSkillEntries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("рівні гілки — зі levelSkillIds (назва без слова рівня), з levelNode; слот — basic без levelNode; расовий — лінія racial", async () => {
    const entries = await resolveCharacterSkillEntries(
      character(["attack_basic_level", "attack_advanced_level", "o1", "racial_basic_racial"], { personalSkillId: "pers" }),
      "camp",
      SKILLS,
      new Map([["attack", null]]),
      TREE,
    );

    expect(entries.map((e) => [e.row.id, e.mainSkillId, e.level, e.levelNode ?? false])).toEqual([
      ["lvl-b", "attack", "basic", true],
      ["lvl-a", "attack", "advanced", true],
      ["o1", "attack", "basic", false],
      ["rac", "racial", "basic", true],
      ["pers", null, "basic", false],
    ]);
  });

  it("без дерева — лише personalSkillId", async () => {
    const entries = await resolveCharacterSkillEntries(character(["o1"], { personalSkillId: "pers" }), "camp", SKILLS, new Map(), null);

    expect(entries.map((e) => e.row.id)).toEqual(["pers"]);
  });

  it("один скіл у кількох вивчених вузлах — один запис із найвищим рівнем", async () => {
    const tree = {
      id: "row-tree",
      race: "Ельф",
      skills: buildTreeJson({ race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", levels: { basic: "lvl-b", advanced: "lvl-b" } }] }),
    } as never;

    const entries = await resolveCharacterSkillEntries(character(["attack_basic_level", "attack_advanced_level"]), "camp", SKILLS, new Map([["attack", null]]), tree);

    expect(entries.map((e) => [e.row.id, e.level])).toEqual([["lvl-b", "advanced"]]);
  });
});
