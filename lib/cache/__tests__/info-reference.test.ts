import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ options: [] as Array<{ tags?: string[] }> }));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, _key: string[], options: { tags?: string[] }) => {
    cache.options.push(options);

    return fn;
  },
}));
vi.mock("@/lib/db", () => ({ prisma: { skill: { findMany: vi.fn() }, spell: { findMany: vi.fn() } } }));

import { getCachedInfoReference } from "@/lib/cache/info-reference";
import { prisma } from "@/lib/db";

describe("довідник кампанії", () => {
  beforeEach(() => {
    cache.options = [];
    vi.mocked(prisma.skill.findMany).mockResolvedValue([
      { id: "k", name: "Удар", description: null, appearanceDescription: null, abilities: [], icon: null, image: null, mainSkill: { id: "m", name: "Напад", icon: null, color: "red" }, grantedSpell: { name: "Іскра" } },
    ] as never);
    vi.mocked(prisma.spell.findMany).mockResolvedValue([
      { id: "s", name: "Іскра", level: 1, type: "target", damageType: "damage", castingTime: null, range: null, duration: null, description: "опис", effects: ["x", 1], savingThrow: null, diceCount: 1, diceType: "d6", damageElement: "fire", appearanceDescription: null, icon: null, spellGroup: { name: "Вогонь" } },
    ] as never);
  });

  it("читає лише поля довідника явними select, без зв'язку spell", async () => {
    await getCachedInfoReference("c");

    const skillArgs = vi.mocked(prisma.skill.findMany).mock.calls[0][0] as { select: Record<string, unknown>; include?: unknown };

    const spellArgs = vi.mocked(prisma.spell.findMany).mock.calls[0][0] as { select: Record<string, unknown>; include?: unknown };

    expect(skillArgs.include).toBeUndefined();
    expect(skillArgs.select.spell).toBeUndefined();
    expect(skillArgs.select.spellEnhancementData).toBeUndefined();
    expect(spellArgs.include).toBeUndefined();
    expect(spellArgs.select.damageDistribution).toBeUndefined();
  });

  it("мапить у пропси клієнта", async () => {
    const { skills, spells } = await getCachedInfoReference("c");

    expect(skills[0]).toMatchObject({ id: "k", mainSkillName: "Напад", mainSkillColor: "red", grantedSpellName: "Іскра", abilitySummary: [] });
    expect(spells[0]).toMatchObject({ id: "s", groupName: "Вогонь", effects: ["x"] });
  });

  it("кеш позначено тегами скілів, основних навиків і заклинань", async () => {
    await getCachedInfoReference("c");

    expect(cache.options[0].tags).toEqual(["skills-c", "main-skills-c", "spells-c"]);
  });
});
