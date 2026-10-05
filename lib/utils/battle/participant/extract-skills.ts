/**
 * Витягування активних скілів з character.skillTreeProgress та characterSkills.
 *
 * Сама extractActiveSkillsFromCharacter — orchestrator (CODE_AUDIT 1.7):
 *   1. Збирає всі skill IDs з прогресу + personalSkillId
 *   2. Резолвить ID-рівнів (mainSkillId_expert_level) → реальні Skill rows
 *   3. Підвантажує MainSkill.spellGroupId map (для школи магії)
 *   4. Будує ActiveSkill для кожного ID через buildActiveSkillFromRow
 *
 * Деталізована логіка побудови — у sibling-файлі build-active-skill.ts.
 */

import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";
import {
  inferLevelFromSkillName,
  parseMainSkillLevelId,
} from "./parse";

import { prisma } from "@/lib/db";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { SkillEntry } from "@/lib/utils/abilities/build/collect";

/**
 * Витягує активні скіли з character. Розв'язує id рівнів (mainSkillId_expert_level) у реальні скіли.
 */
export type SkillRowEntry = SkillEntry & { row: Prisma.SkillGetPayload<object> };

/** Розв'язує id зі skillTreeProgress (і рівневі `${mainSkillId}_expert_level`) у рядки скілів. */
export async function resolveCharacterSkillEntries(
  character: CharacterFromPrisma,
  campaignId: string,
  preloadedSkillsById?: Record<string, Prisma.SkillGetPayload<object>>,
  preloadedMainSkillGroups?: Map<string, string | null>,
): Promise<SkillRowEntry[]> {
  const skillTreeProgress =
    (character.skillTreeProgress as Record<string, { level?: SkillLevel; unlockedSkills?: string[] }>) || {};

  const allSkillIds: string[] = [];

  const skillIdToMainSkill: Record<string, string> = {};

  const skillIdToLevel: Record<string, SkillLevel> = {};

  for (const [mainSkillId, progress] of Object.entries(skillTreeProgress)) {
    for (const skillId of progress.unlockedSkills ?? []) {
      allSkillIds.push(skillId);
      skillIdToMainSkill[skillId] = mainSkillId;
      skillIdToLevel[skillId] = progress.level || SkillLevel.BASIC;
    }
  }

  const personalSkillId = (character as { personalSkillId?: string | null }).personalSkillId;

  if (personalSkillId?.trim() && !allSkillIds.includes(personalSkillId)) {
    allSkillIds.push(personalSkillId);
    skillIdToLevel[personalSkillId] = SkillLevel.BASIC;
  }

  if (allSkillIds.length === 0) return [];

  const directIds = allSkillIds.filter((id) => !parseMainSkillLevelId(id));

  const levelIds = allSkillIds.filter((id) => parseMainSkillLevelId(id));

  const mainSkillIdsFromLevels = new Set(
    levelIds
      .map(parseMainSkillLevelId)
      .filter((p): p is { mainSkillId: string; level: string } => p != null)
      .map((p) => p.mainSkillId),
  );

  const fetchedSkills = await fetchSkillsFor(campaignId, directIds, mainSkillIdsFromLevels, preloadedSkillsById);

  const skillsMap = new Map<string, Prisma.SkillGetPayload<object>>();

  for (const s of fetchedSkills) skillsMap.set(s.id, s);

  for (const levelId of levelIds) {
    const parsed = parseMainSkillLevelId(levelId);

    if (!parsed) continue;

    const match = fetchedSkills.find((s) => {
      const msId = s.mainSkillId ?? (s.mainSkillData as { mainSkillId?: string } | undefined)?.mainSkillId;

      return msId === parsed.mainSkillId && inferLevelFromSkillName(s.name) === parsed.level;
    });

    if (match) skillsMap.set(levelId, match);
  }

  const groups = preloadedMainSkillGroups ?? (await loadMainSkillSpellGroups(fetchedSkills));

  const entries: SkillRowEntry[] = [];

  for (const skillId of allSkillIds) {
    const row = skillsMap.get(skillId);

    if (!row) continue;

    const mainSkillId = row.mainSkillId ?? skillIdToMainSkill[skillId] ?? null;

    entries.push({
      row,
      mainSkillId: mainSkillId || null,
      level: inferLevelFromSkillName(row.name) ?? skillIdToLevel[skillId] ?? SkillLevel.BASIC,
      mainSkillSpellGroupId: row.mainSkillId ? (groups.get(row.mainSkillId) ?? null) : null,
    });
  }

  return entries;
}

async function fetchSkillsFor(
  campaignId: string,
  directIds: string[],
  mainSkillIdsFromLevels: Set<string>,
  preloadedSkillsById?: Record<string, Prisma.SkillGetPayload<object>>,
): Promise<Prisma.SkillGetPayload<object>[]> {
  if (preloadedSkillsById) {
    const byDirect = directIds
      .map((id) => preloadedSkillsById[id])
      .filter(Boolean);

    const byMainSkill = Object.values(preloadedSkillsById).filter(
      (s) =>
        mainSkillIdsFromLevels.size > 0 &&
        s.mainSkillId &&
        mainSkillIdsFromLevels.has(s.mainSkillId),
    );

    return [
      ...new Map([...byDirect, ...byMainSkill].map((s) => [s.id, s])).values(),
    ];
  }

  const orConditions: Array<
    { id: { in: string[] } } | { mainSkillId: { in: string[] } }
  > = [];

  if (directIds.length > 0) orConditions.push({ id: { in: directIds } });

  if (mainSkillIdsFromLevels.size > 0) {
    orConditions.push({
      mainSkillId: { in: Array.from(mainSkillIdsFromLevels) },
    });
  }

  if (orConditions.length === 0) return [];

  return prisma.skill.findMany({
    where: { campaignId, OR: orConditions },
  });
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
