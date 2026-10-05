import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { CharacterFromPrisma } from "../../types/participant";
import { resolveCharacterSkillEntries } from "../extract-skills";

const skill = (id: string, name: string, mainSkillId: string | null, spellGroupId: string | null = null) =>
  ({ id, name, mainSkillId, spellGroupId, mainSkillData: {}, combatStats: {}, bonuses: {}, skillTriggers: [], abilities: null }) as unknown as Prisma.SkillGetPayload<object>;

const character = (progress: Record<string, { level?: string; unlockedSkills?: string[] }>, personalSkillId: string | null = null) =>
  ({ skillTreeProgress: progress, personalSkillId }) as unknown as CharacterFromPrisma;

describe("resolveCharacterSkillEntries", () => {
  const skillsById = {
    b: skill("b", "Хаос — Базовий", "m"),
    e: skill("e", "Хаос — Експерт", "m"),
    leaf: skill("leaf", "Пекельна сила", "m", "own"),
    p: skill("p", "Особистий", null),
  };

  it("рівневий id → рядок скіла цього рівня, школа з mainSkill", async () => {
    const entries = await resolveCharacterSkillEntries(character({ m: { level: "expert", unlockedSkills: ["m_expert_level", "leaf"] } }, "p"), "c", skillsById, new Map([["m", "chaos"]]));

    expect(entries.map((e) => [e.row.id, e.level, e.mainSkillId, e.mainSkillSpellGroupId])).toEqual([
      ["e", "expert", "m", "chaos"],
      ["leaf", "expert", "m", "chaos"],
      ["p", "basic", null, null],
    ]);
  });

  it("невідомі id пропускаються", async () => {
    expect(await resolveCharacterSkillEntries(character({ m: { unlockedSkills: ["ghost"] } }), "c", skillsById, new Map())).toEqual([]);
  });
});
