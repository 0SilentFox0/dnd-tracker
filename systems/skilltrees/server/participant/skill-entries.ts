import type { Prisma } from '@prisma/client';

import { skillTreeContext } from './context';
import { loadCharacterProgress } from './progress';

import { prisma } from '@/lib/db';
import type { SkillEntriesLoader } from '@/lib/server/systems/types';
import type { SkillRowEntry } from '@/lib/utils/battle/participant/extract-skills';
import type {
    CampaignSpellContext,
    CharacterFromPrisma,
} from '@/lib/utils/battle/types/participant';
import {
    normalizeTree,
    RACIAL_BRANCH_ID,
    resolveLearned,
    uniqueSkills,
} from '@/lib/utils/skills/progression';

export async function resolveCharacterSkillEntries(
    character: CharacterFromPrisma,
    campaignId: string,
    preloadedSkillsById?: Record<string, Prisma.SkillGetPayload<object>>,
    preloadedMainSkillGroups?: Map<string, string | null>,
    preloadedTree?: Prisma.SkillTreeGetPayload<object> | null,
    context?: CampaignSpellContext
): Promise<SkillRowEntry[]> {
    const treeRow =
        preloadedTree !== undefined
            ? preloadedTree
            : await prisma.skillTree.findFirst({
                  where: { campaignId, race: character.race },
              });

    const learned = treeRow
        ? uniqueSkills(
              resolveLearned(
                  normalizeTree(treeRow),
                  await loadCharacterProgress(character, context)
              )
          ).flatMap((n) => (n.skillId ? [{ ...n, skillId: n.skillId }] : []))
        : [];

    const personalSkillId =
        (
            character as { personalSkillId?: string | null }
        ).personalSkillId?.trim() || null;

    const ids = [
        ...new Set([
            ...learned.map((n) => n.skillId),
            ...(personalSkillId ? [personalSkillId] : []),
        ]),
    ];

    if (ids.length === 0) return [];

    const rows = preloadedSkillsById
        ? ids.map((id) => preloadedSkillsById[id]).filter(Boolean)
        : await prisma.skill.findMany({
              where: { campaignId, id: { in: ids } },
          });

    const byId = new Map(rows.map((r) => [r.id, r]));

    const groups =
        preloadedMainSkillGroups ??
        (await loadMainSkillSpellGroups(campaignId, rows));

    const entries: SkillRowEntry[] = [];

    for (const n of learned) {
        const row = byId.get(n.skillId);

        if (!row) continue;

        const mainSkillId =
            n.kind === 'branchLevel' || n.kind === 'slot'
                ? n.branchId
                : n.kind === 'racial'
                  ? RACIAL_BRANCH_ID
                  : null;

        entries.push({
            row,
            mainSkillId,
            level: n.level ?? 'basic',
            levelNode: n.kind === 'branchLevel' || n.kind === 'racial',
            mainSkillSpellGroupId: mainSkillId
                ? (groups.get(mainSkillId) ?? null)
                : null,
        });
    }

    const personal =
        personalSkillId && !learned.some((n) => n.skillId === personalSkillId)
            ? byId.get(personalSkillId)
            : undefined;

    if (personal)
        entries.push({
            row: personal,
            mainSkillId: null,
            level: 'basic',
            levelNode: false,
            mainSkillSpellGroupId: null,
            personal: true,
        });

    return entries;
}

async function loadMainSkillSpellGroups(
    campaignId: string,
    fetchedSkills: Prisma.SkillGetPayload<object>[]
): Promise<Map<string, string | null>> {
    const mainSkillIdsToResolve = new Set<string>();

    for (const s of fetchedSkills) {
        if (s.mainSkillId) mainSkillIdsToResolve.add(s.mainSkillId);
    }

    const mainSkillSpellGroupById = new Map<string, string | null>();

    if (mainSkillIdsToResolve.size === 0) return mainSkillSpellGroupById;

    const mainSkills = await prisma.mainSkill.findMany({
        where: { campaignId, id: { in: Array.from(mainSkillIdsToResolve) } },
        select: { id: true, spellGroupId: true },
    });

    for (const ms of mainSkills) {
        mainSkillSpellGroupById.set(ms.id, ms.spellGroupId ?? null);
    }

    return mainSkillSpellGroupById;
}

export const loadSkillEntries: SkillEntriesLoader = ({ character, context }) =>
    resolveCharacterSkillEntries(
        character,
        character.campaignId,
        context?.skillsById,
        context
            ? new Map(
                  (skillTreeContext.read(context)?.mainSkills ?? []).map(
                      (m) => [m.id, m.spellGroupId]
                  )
              )
            : undefined,
        context
            ? (skillTreeContext.read(context)?.treeByRace[character.race] ??
                  null)
            : undefined,
        context
    );
