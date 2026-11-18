import { z } from 'zod';

import 'server-only';
import { invalidateReference, ReferenceKind } from '@/lib/cache/tags';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { getTranslator } from '@/lib/i18n/translator';
import { saveSkillTreeSchema } from '@/lib/schemas/skills';
import { jsonContent } from '@/lib/server/assistant/actions/content-snapshot';
import { ContentError } from '@/lib/server/content/errors';
import { afterContentCommit } from '@/lib/server/content/write-context';
import { moveSkillTreeProgress } from '@/lib/server/skills/progress-move';
import {
    listSkillTrees,
    readSkillTree,
    saveSkillTree,
} from '@/lib/server/skills/skill-tree-service';
import type { SystemContentServer } from '@/lib/server/systems/content-types';
import {
    abilitiesJson,
    OwnerKind,
    skillAbilities,
} from '@/lib/utils/abilities/read';
import { NEED } from '@/lib/utils/api/need';
import { localeOrRequest } from '@/lib/utils/api/translate-error';
import { isRecord } from '@/lib/utils/common/is-record';
import { readTreeJson } from '@/lib/utils/skills/progression';

const id = z.string().min(1).max(200);

async function duplicateSkill({
    actor,
    locale,
    param,
}: Parameters<
    NonNullable<SystemContentServer['operations']>[string]['run']
>[0]) {
    const source = await prisma.skill.findFirst({
        where: { id: param('skillId'), campaignId: actor.campaignId },
    });

    if (!source || source.campaignId !== actor.campaignId)
        throw new ContentError(API_ERRORS.SKILL_NOT_FOUND, 404);

    const t = await getTranslator(await localeOrRequest(locale), 'assistant');

    const skill = await prisma.skill.create({
        data: {
            campaignId: actor.campaignId,
            name: source.name.trim()
                ? t('defaults.copyOf', { name: source.name })
                : t('defaults.skillCopy'),
            description: source.description,
            icon: source.icon,
            image: source.image ?? null,
            spellId: source.spellId,
            spellGroupId: source.spellGroupId,
            grantedSpellId: source.grantedSpellId,
            mainSkillId: source.mainSkillId,
            spellNewSpellId: source.grantedSpellId,
            abilities: abilitiesJson(skillAbilities(source)),
        },
        include: {
            spell: true,
            spellGroup: true,
            grantedSpell: true,
            mainSkill: true,
        },
    });

    afterContentCommit(() =>
        invalidateReference(ReferenceKind.SKILLS, actor.campaignId)
    );

    return skill;
}

/** A race tree names races and branches; they follow the race and main-skill names (D30). A tree without a slug stays English. */
function localizeTree(
    row: Record<string, unknown>,
    maps: Record<string, Map<string, string>>
): Record<string, unknown> {
    if (typeof row.slug !== 'string' || !row.slug) return row;

    const race = (value: unknown) =>
        typeof value === 'string' ? (maps.races.get(value) ?? value) : value;

    const { skills } = row;

    const branches =
        isRecord(skills) && Array.isArray(skills.mainSkills)
            ? skills.mainSkills
            : null;

    const mapped = isRecord(skills)
        ? {
              ...skills,
              ...('race' in skills && { race: race(skills.race) }),
              ...(branches && {
                  mainSkills: branches.map((b) =>
                      isRecord(b) && typeof b.name === 'string'
                          ? {
                                ...b,
                                name: maps.mainSkills.get(b.name) ?? b.name,
                            }
                          : b
                  ),
              }),
          }
        : skills;

    return { ...row, race: race(row.race), skills: mapped };
}

export const SKILLTREES_CONTENT: SystemContentServer = {
    operations: {
        'skill-trees.list': {
            row: {
                method: 'GET',
                path: '/skill-trees',
                summary: 'Skill trees',
                description: 'Skill trees of all campaign races.',
                need: NEED.read('member'),
                response: 'list',
                tag: 'Skills',
            },
            kind: 'skills',
            run: ({ actor }) => listSkillTrees(actor),
        },
        'skill-trees.save': {
            row: {
                method: 'PATCH',
                path: '/skill-trees/{treeId}',
                summary: 'Save skill tree',
                description:
                    'Saves a race tree, creating it if missing. Character progress is carried over. 409 — progress changed concurrently, retry.',
                need: NEED.write,
                body: saveSkillTreeSchema,
                response: 'object',
                errors: [409],
                invalidBody: API_ERRORS.INVALID_SKILL_TREE,
                tag: 'Skills',
            },
            pathParams: { treeId: id.optional() },
            kind: 'skills',
            run: ({ actor, body, input }) =>
                saveSkillTree(actor, {
                    ...(body as z.output<typeof saveSkillTreeSchema>),
                    ...(input.treeId ? { treeId: String(input.treeId) } : {}),
                }),
            assistant: {
                confirm: 'always',
                erasesProgress: 'effects.skillTreeReplace',
                state: async (_actor, input, find) => ({
                    tables: {
                        skillTrees: await find('skillTree', {
                            OR: [
                                ...(input.treeId
                                    ? [{ id: String(input.treeId) }]
                                    : []),
                                ...((input.body as { race?: string })?.race
                                    ? [
                                          {
                                              race: (
                                                  input.body as {
                                                      race: string;
                                                  }
                                              ).race,
                                          },
                                      ]
                                    : []),
                            ],
                        }),
                    },
                }),
                preview: ({ rows, input, body, field }) => {
                    const row =
                        rows('skillTrees').find(
                            (row) => row.id === input.treeId
                        ) ??
                        rows('skillTrees').find(
                            (row) => row.race === body.race
                        );

                    field(
                        'skillTrees',
                        row ?? { id: 'new', race: body.race },
                        'skills',
                        body.skills
                    );
                },
            },
        },
        'skills.duplicate': {
            row: {
                method: 'POST',
                path: '/skills/{skillId}/duplicate',
                summary: 'Duplicate skill',
                description:
                    'A copy of the skill with a "(copy)" suffix in the author\'s language.',
                need: NEED.write,
                response: 'item',
                tag: 'Skills',
            },
            pathParams: { skillId: id },
            run: duplicateSkill,
            assistant: {
                state: async (_actor, input, find) => ({
                    tables: {
                        skills: await find('skill', { id: input.skillId }),
                    },
                }),
                preview: ({ owned, field, t }) => {
                    const row = owned('skills', 'skillId');

                    field(
                        'skills',
                        row,
                        'name',
                        String(row.name).trim()
                            ? t('defaults.copyOf', { name: String(row.name) })
                            : t('defaults.skillCopy')
                    );
                },
            },
        },
    },
    abilityOwners: {
        [OwnerKind.SKILL]: {
            contentKind: 'skills',
            order: 10,
            load: (where) =>
                prisma.skill.findMany({
                    where,
                    select: { id: true, name: true },
                }),
            find: (where) => prisma.skill.findFirst({ where }),
        },
    },
    schemaTargets: {
        'skill-tree': { id: 'SkillTreeSave', schema: saveSkillTreeSchema },
    },
    readActions: {
        'skill-trees.get': {
            id: 'skill-trees.get',
            title: 'Race skill tree',
            description: 'Current skill tree by race name',
            need: NEED.read('member'),
            input: z.object({ race: z.string().min(1) }),
            effect: 'read',
            execute: async (caller, input) => {
                const row = await readSkillTree(
                    caller.actor,
                    (input as { race: string }).race
                );

                return {
                    data: jsonContent(
                        row
                            ? { id: row.id, race: row.race, skills: row.skills }
                            : null
                    ),
                    affected: [],
                    warnings: [],
                };
            },
        },
    },
    aliases: {
        get_skill_tree: {
            actionId: 'skill-trees.get',
            payload: (input) => ({ race: input.race }),
        },
    },
    template: {
        localize: { skillTrees: localizeTree },
        afterSyncUpdate: {
            skillTrees: async (db, { campaignId, before, after }) => {
                const from = before && readTreeJson(before.skills).id;

                const to = readTreeJson(after.skills).id;

                if (!before || !from || !to || from === to) return;

                await moveSkillTreeProgress(
                    db,
                    campaignId,
                    String(before.race),
                    from,
                    to
                );
            },
        },
        usageSelect: {
            skillTreeProgress: true,
            characterSkills: {
                select: { skillTreeId: true, unlockedSkills: true },
            },
        },
    },
};
