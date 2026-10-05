import { describe, expect, it, vi } from "vitest";

import { resolveLearnedSpellsFromCharacter } from "../from-character-learned-spells";

import { buildTreeJson } from "@/lib/utils/skills/progression";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const tree = { id: "row-tree", race: "Ельф", skills: buildTreeJson({ race: "Ельф", branches: [{ id: "light", name: "Світло", color: "y" }] }) };

const context = {
  skillTreeByRace: { Ельф: tree },
  mainSkills: [{ id: "light", spellGroupId: "sg", name: "Світло" }],
  spells: [{ id: "s1", level: 1, spellGroup: { id: "sg" } }],
  allSkills: [],
} as never;

describe("resolveLearnedSpellsFromCharacter", () => {
  it("рівень гілки зі школою магії додає заклинання до knownSpells", async () => {
    const character = { id: "c", race: "Ельф", campaignId: "camp", skillTreeProgress: { "row-tree": { unlockedSkills: ["light_basic_level"] } } } as never;

    expect(await resolveLearnedSpellsFromCharacter(character, ["k"], context)).toEqual(["k", "s1"]);
  });

  it("без дерева — лише knownSpells", async () => {
    const character = { id: "c", race: "Гном", campaignId: "camp", skillTreeProgress: {} } as never;

    expect(await resolveLearnedSpellsFromCharacter(character, ["k"], { ...(context as object), skillTreeByRace: {} } as never)).toEqual(["k"]);
  });
});
