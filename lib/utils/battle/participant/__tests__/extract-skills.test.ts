/**
 * Тести для extractActiveSkillsFromCharacter — фокус на damageType
 * auto-detection (нещодавно введено для magic damage school bonus
 * пайплайну).
 *
 * `prisma.mainSkill.findMany` мокаємо, бо він викликається завжди
 * для resolve spellGroupId з MainSkill. `preloadedSkillsById`
 * передаємо щоб обійти `prisma.skill.findMany`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    skill: {
      findMany: vi.fn(),
    },
    mainSkill: {
      findMany: vi.fn(),
    },
  },
}));

import { extractActiveSkillsFromCharacter } from "../extract-skills";

import { prisma } from "@/lib/db";

const mockMainSkillFindMany = prisma.mainSkill.findMany as ReturnType<
  typeof vi.fn
>;

const mockSkillFindMany = prisma.skill.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockMainSkillFindMany.mockReset();
  mockSkillFindMany.mockReset();
  mockMainSkillFindMany.mockResolvedValue([]);
  mockSkillFindMany.mockResolvedValue([]);
});

interface MakeCharOpts {
  unlockedSkills?: Record<string, string[]>;
  level?: "basic" | "advanced" | "expert";
  personalSkillId?: string | null;
}

function makeCharacter(opts: MakeCharOpts = {}) {
  const skillTreeProgress: Record<
    string,
    { level: string; unlockedSkills: string[] }
  > = {};

  for (const [mainSkillId, skillIds] of Object.entries(
    opts.unlockedSkills ?? {},
  )) {
    skillTreeProgress[mainSkillId] = {
      level: opts.level ?? "basic",
      unlockedSkills: skillIds,
    };
  }

  return {
    id: "char-1",
    skillTreeProgress,
    personalSkillId: opts.personalSkillId ?? null,
  } as unknown as Parameters<typeof extractActiveSkillsFromCharacter>[0];
}

function makeSkill(overrides: Partial<Record<string, unknown>>) {
  return {
    id: "skill-1",
    campaignId: "camp-1",
    name: "Test Skill",
    icon: null,
    description: null,
    bonuses: {},
    combatStats: {},
    spellEnhancementTypes: [],
    spellEnhancementData: null,
    spellEffectIncrease: null,
    spellTargetChange: null,
    spellAdditionalModifier: null,
    spellNewSpellId: null,
    mainSkillId: null,
    spellId: null,
    spellGroupId: null,
    skillTriggers: null,
    ...overrides,
  } as unknown as Parameters<
    typeof extractActiveSkillsFromCharacter
  >[2] extends infer T
    ? T extends Record<string, infer V>
      ? V
      : never
    : never;
}

describe("extractActiveSkillsFromCharacter — damageType auto-detection", () => {
  it("returns empty array when character has no unlocked skills", async () => {
    const result = await extractActiveSkillsFromCharacter(
      makeCharacter(),
      "camp-1",
      {},
    );

    expect(result).toEqual([]);
  });

  it("detects damageType='ranged' from ranged_damage effect", async () => {
    const skill = makeSkill({
      id: "s-ranged",
      name: "Стрільба з лука — Просунутий",
      combatStats: {
        effects: [{ stat: "ranged_damage", type: "percent", value: 15 }],
      },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-1": ["s-ranged"] } }),
      "camp-1",
      { "s-ranged": skill },
    );

    expect(result).toHaveLength(1);
    expect(result[0].damageType).toBe("ranged");
  });

  it("detects damageType='melee' from melee_damage effect", async () => {
    const skill = makeSkill({
      id: "s-melee",
      name: "Удар",
      combatStats: {
        effects: [{ stat: "melee_damage", type: "percent", value: 10 }],
      },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-1": ["s-melee"] } }),
      "camp-1",
      { "s-melee": skill },
    );

    expect(result[0].damageType).toBe("melee");
  });

  it("detects damageType='magic' from spell_damage effect", async () => {
    const skill = makeSkill({
      id: "s-magic",
      name: "Магія Хаосу — Експерт",
      combatStats: {
        effects: [{ stat: "spell_damage", type: "percent", value: 25 }],
      },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-magic": ["s-magic"] } }),
      "camp-1",
      { "s-magic": skill },
    );

    expect(result[0].damageType).toBe("magic");
  });

  it("detects damageType='magic' from chaos_spell_damage suffix", async () => {
    const skill = makeSkill({
      id: "s-chaos",
      name: "Магія Хаосу — Експерт",
      combatStats: {
        effects: [{ stat: "chaos_spell_damage", type: "percent", value: 25 }],
      },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-magic": ["s-chaos"] } }),
      "camp-1",
      { "s-chaos": skill },
    );

    expect(result[0].damageType).toBe("magic");
  });

  it("detects damageType='magic' from spellEffectIncrease (no damage effects)", async () => {
    const skill = makeSkill({
      id: "s-empower",
      name: "Підсилення",
      combatStats: { effects: [] },
      spellEffectIncrease: 10,
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-1": ["s-empower"] } }),
      "camp-1",
      { "s-empower": skill },
    );

    expect(result[0].damageType).toBe("magic");
  });

  it("detects damageType='magic' from MainSkill.spellGroupId binding", async () => {
    const skill = makeSkill({
      id: "s-school",
      name: "Школа Льоду",
      mainSkillId: "ms-ice",
      combatStats: { effects: [] },
    });

    mockMainSkillFindMany.mockResolvedValue([
      { id: "ms-ice", spellGroupId: "spell-group-ice" },
    ]);

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-ice": ["s-school"] } }),
      "camp-1",
      { "s-school": skill },
    );

    expect(result[0].damageType).toBe("magic");
    expect(result[0].spellGroupId).toBe("spell-group-ice");
  });

  it("respects explicit combatStats.damageType when set", async () => {
    const skill = makeSkill({
      id: "s-explicit",
      name: "Explicit",
      combatStats: {
        damageType: "magic",
        effects: [{ stat: "ranged_damage", type: "percent", value: 5 }],
      },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-1": ["s-explicit"] } }),
      "camp-1",
      { "s-explicit": skill },
    );

    // ranged-only override доpushує до ranged лише якщо було melee.
    // Тут було magic — лишається magic.
    expect(result[0].damageType).toBe("magic");
  });

  it("upgrades melee→ranged when only ranged effect present", async () => {
    const skill = makeSkill({
      id: "s-mismatch",
      name: "Mismatch",
      combatStats: {
        damageType: "melee",
        effects: [{ stat: "ranged_damage", type: "percent", value: 10 }],
      },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-1": ["s-mismatch"] } }),
      "camp-1",
      { "s-mismatch": skill },
    );

    expect(result[0].damageType).toBe("ranged");
  });

  it("falls back to skillIdToLevel when name has no level keyword", async () => {
    const skill = makeSkill({
      id: "s-no-level",
      name: "Якась атака",
      combatStats: { effects: [] },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({
        unlockedSkills: { "ms-1": ["s-no-level"] },
        level: "advanced",
      }),
      "camp-1",
      { "s-no-level": skill },
    );

    expect(result[0].level).toBe("advanced");
  });

  it("infers level from skill name when present", async () => {
    const skill = makeSkill({
      id: "s-named",
      name: "Удар — Експерт",
      combatStats: { effects: [] },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({
        unlockedSkills: { "ms-1": ["s-named"] },
        level: "basic",
      }),
      "camp-1",
      { "s-named": skill },
    );

    expect(result[0].level).toBe("expert");
  });

  it("returns Unknown Skill stub when skill id not in preloaded map", async () => {
    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ unlockedSkills: { "ms-1": ["s-missing"] } }),
      "camp-1",
      {},
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toMatch(/^Unknown Skill/);
    expect(result[0].effects).toEqual([]);
  });

  it("includes personalSkillId when set", async () => {
    const skill = makeSkill({
      id: "personal-1",
      name: "Personal",
      combatStats: { effects: [] },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({ personalSkillId: "personal-1" }),
      "camp-1",
      { "personal-1": skill },
    );

    expect(result).toHaveLength(1);
    expect(result[0].skillId).toBe("personal-1");
  });

  it("does not duplicate personalSkillId when already in unlockedSkills", async () => {
    const skill = makeSkill({
      id: "shared-1",
      name: "Shared",
      combatStats: { effects: [] },
    });

    const result = await extractActiveSkillsFromCharacter(
      makeCharacter({
        unlockedSkills: { "ms-1": ["shared-1"] },
        personalSkillId: "shared-1",
      }),
      "camp-1",
      { "shared-1": skill },
    );

    expect(result).toHaveLength(1);
  });
});
