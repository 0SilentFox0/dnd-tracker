import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";

import { prisma } from "@/lib/db";
import type { SkillEntry } from "@/lib/utils/abilities/build/collect";
import { normalizeTree, RACIAL_BRANCH_ID, resolveLearned, uniqueSkills } from "@/lib/utils/skills/progression";

/** Скіли, на які посилаються вивчені вузли дерева раси персонажів і їхні personalSkillId. */
export function referencedSkillIds(
  characters: Array<Pick<CharacterFromPrisma, "race" | "skillTreeProgress" | "personalSkillId">>,
  trees: Array<Prisma.SkillTreeGetPayload<object>>,
): string[] {
  const treeByRace = new Map(trees.map((t) => [t.race, t]));

  const ids = new Set<string>();

  for (const c of characters) {
    const tree = treeByRace.get(c.race);

    if (tree) {
      for (const n of resolveLearned(normalizeTree(tree), c.skillTreeProgress)) if (n.skillId) ids.add(n.skillId);
    }

    const personal = c.personalSkillId?.trim();

    if (personal) ids.add(personal);
  }

  return [...ids];
}

export type SkillRowEntry = SkillEntry & { row: Prisma.SkillGetPayload<object> };

/** Вивчені вузли дерева раси + personalSkillId → рядки скілів з лінією для бою. */
export async function resolveCharacterSkillEntries(
  character: CharacterFromPrisma,
  campaignId: string,
  preloadedSkillsById?: Record<string, Prisma.SkillGetPayload<object>>,
  preloadedMainSkillGroups?: Map<string, string | null>,
  preloadedTree?: Prisma.SkillTreeGetPayload<object> | null,
): Promise<SkillRowEntry[]> {
  const treeRow = preloadedTree !== undefined ? preloadedTree : await prisma.skillTree.findFirst({ where: { campaignId, race: character.race } });

  const learned = treeRow ? uniqueSkills(resolveLearned(normalizeTree(treeRow), character.skillTreeProgress)).flatMap((n) => (n.skillId ? [{ ...n, skillId: n.skillId }] : [])) : [];

  const personalSkillId = (character as { personalSkillId?: string | null }).personalSkillId?.trim() || null;

  const ids = [...new Set([...learned.map((n) => n.skillId), ...(personalSkillId ? [personalSkillId] : [])])];

  if (ids.length === 0) return [];

  const rows = preloadedSkillsById
    ? ids.map((id) => preloadedSkillsById[id]).filter(Boolean)
    : await prisma.skill.findMany({ where: { campaignId, id: { in: ids } } });

  const byId = new Map(rows.map((r) => [r.id, r]));

  const groups = preloadedMainSkillGroups ?? (await loadMainSkillSpellGroups(rows));

  const entries: SkillRowEntry[] = [];

  for (const n of learned) {
    const row = byId.get(n.skillId);

    if (!row) continue;

    const mainSkillId = n.kind === "branchLevel" || n.kind === "slot" ? n.branchId : n.kind === "racial" ? RACIAL_BRANCH_ID : null;

    entries.push({
      row,
      mainSkillId,
      level: n.level ?? "basic",
      levelNode: n.kind === "branchLevel" || n.kind === "racial",
      mainSkillSpellGroupId: mainSkillId ? (groups.get(mainSkillId) ?? null) : null,
    });
  }

  const personal = personalSkillId && !learned.some((n) => n.skillId === personalSkillId) ? byId.get(personalSkillId) : undefined;

  if (personal) entries.push({ row: personal, mainSkillId: null, level: "basic", levelNode: false, mainSkillSpellGroupId: null });

  return entries;
}

/**
 * Підтягує spellGroupId з MainSkill (школа магії як вузол дерева).
 * Робимо одним додатковим запитом, щоб не міняти контракт preloadedSkillsById.
 */
async function loadMainSkillSpellGroups(
  fetchedSkills: Prisma.SkillGetPayload<object>[],
): Promise<Map<string, string | null>> {
  const mainSkillIdsToResolve = new Set<string>();

  for (const s of fetchedSkills) {
    if (s.mainSkillId) mainSkillIdsToResolve.add(s.mainSkillId);
  }

  const mainSkillSpellGroupById = new Map<string, string | null>();

  if (mainSkillIdsToResolve.size === 0) return mainSkillSpellGroupById;

  const mainSkills = await prisma.mainSkill.findMany({
    where: { id: { in: Array.from(mainSkillIdsToResolve) } },
    select: { id: true, spellGroupId: true },
  });

  for (const ms of mainSkills) {
    mainSkillSpellGroupById.set(ms.id, ms.spellGroupId ?? null);
  }

  return mainSkillSpellGroupById;
}
