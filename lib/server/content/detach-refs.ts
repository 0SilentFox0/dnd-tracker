import type { PrismaClient } from '@prisma/client';

import { bypassLayer } from '@/lib/db/content-layer';

type Db = Pick<
    PrismaClient,
    'spell' | 'skill' | 'mainSkill' | 'unit' | 'artifact' | 'characterSkills'
>;

export type DetachKind =
    | 'spellGroup'
    | 'race'
    | 'mainSkill'
    | 'spell'
    | 'unit'
    | 'artifactSet'
    | 'skillTree';

type Target = { model: keyof Db; column: string; cascade?: boolean };

const REFERRERS: Record<DetachKind, Target[]> = {
    spellGroup: [
        { model: 'spell', column: 'groupId' },
        { model: 'mainSkill', column: 'spellGroupId' },
        { model: 'skill', column: 'spellGroupId' },
    ],
    race: [{ model: 'unit', column: 'raceId' }],
    mainSkill: [{ model: 'skill', column: 'mainSkillId' }],
    spell: [
        { model: 'skill', column: 'spellId' },
        { model: 'skill', column: 'spellNewSpellId' },
        { model: 'skill', column: 'grantedSpellId' },
    ],
    unit: [{ model: 'spell', column: 'summonUnitId' }],
    artifactSet: [{ model: 'artifact', column: 'setId' }],
    skillTree: [
        { model: 'characterSkills', column: 'skillTreeId', cascade: true },
    ],
};

/** Bundle table → the reference kind that must be detached when one of its rows is removed. */
export const DETACH_KIND_BY_TABLE: Record<string, DetachKind> = {
    spellGroups: 'spellGroup',
    races: 'race',
    mainSkills: 'mainSkill',
    spells: 'spell',
    units: 'unit',
    artifactSets: 'artifactSet',
    skillTrees: 'skillTree',
};

/** Content FKs are gone (base rows can be referenced), so the old ON DELETE SET NULL is done here; `ids: "all"` nulls every reference of that kind. */
export async function detachRefs(
    db: Db,
    campaignId: string,
    kind: DetachKind,
    ids: string[] | 'all'
): Promise<void> {
    if (ids !== 'all' && !ids.length) return;

    for (const { model, column, cascade } of REFERRERS[kind]) {
        const match = { [column]: ids === 'all' ? { not: null } : { in: ids } };

        const where =
            model === 'characterSkills'
                ? { ...match, character: { campaignId } }
                : { campaignId, ...match };

        const delegate = db[model] as unknown as {
            updateMany(args: unknown): Promise<unknown>;
            deleteMany(args: unknown): Promise<unknown>;
        };

        await bypassLayer(() =>
            cascade
                ? delegate.deleteMany({ where })
                : delegate.updateMany({ where, data: { [column]: null } })
        );
    }
}
