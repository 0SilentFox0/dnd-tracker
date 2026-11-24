import type { Prisma } from '@prisma/client';

import { cacheTags } from '@/lib/cache/tags';
import { type CacheOptions, versionedCache } from '@/lib/cache/versioned';
import { prisma } from '@/lib/db';
import { currentContentWrite } from '@/lib/server/content/write-context';
import type { InterruptSpell } from '@/lib/utils/battle/counter/types';
import { withStoredColumns } from '@/lib/utils/rules/systems/column-view';
import { readSpellDefinition } from '@/lib/utils/spells/model/read';
import { toUnit } from '@/lib/utils/units/to-unit';

// A guarded write must use the transaction snapshot, never a previously cached reference.
const referenceCache = <T>(
    campaignId: string,
    callback: () => Promise<T>,
    keyParts: string[],
    options: CacheOptions
): (() => Promise<T>) =>
    currentContentWrite()
        ? callback
        : versionedCache(campaignId, callback, keyParts, options);

export const REFERENCE_REVALIDATE_SECONDS = 300;

export async function getCachedSpells(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.spell.findMany({
                where: { campaignId },
                include: { spellGroup: true },
                orderBy: { level: 'asc' },
            }),
        [cacheTags.spells(campaignId)],
        {
            tags: [cacheTags.spells(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

const UNIT_LIST_ORDER: Prisma.UnitOrderByWithRelationInput[] = [
    { level: 'asc' },
    { name: 'asc' },
];

export async function getCachedUnits(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.unit
                .findMany({ where: { campaignId }, orderBy: UNIT_LIST_ORDER })
                .then((units) => units.map(toUnit)),
        ['units-v2', cacheTags.units(campaignId)],
        {
            tags: [cacheTags.units(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedRaces(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.race.findMany({
                omit: { abilities: true },
                where: { campaignId },
                orderBy: { createdAt: 'desc' },
            }),
        [cacheTags.races(campaignId)],
        {
            tags: [cacheTags.races(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedClasses(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.gameClass.findMany({
                where: { campaignId },
                orderBy: { createdAt: 'asc' },
            }),
        [cacheTags.classes(campaignId)],
        {
            tags: [cacheTags.classes(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedFeats(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.feat.findMany({
                where: { campaignId },
                orderBy: [{ type: 'asc' }, { name: 'asc' }],
            }),
        [cacheTags.feats(campaignId)],
        {
            tags: [cacheTags.feats(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedMainSkills(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.mainSkill.findMany({
                where: { campaignId },
                orderBy: { createdAt: 'asc' },
            }),
        [cacheTags.mainSkills(campaignId)],
        {
            tags: [cacheTags.mainSkills(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedSummonPool(campaignId: string) {
    return referenceCache(
        campaignId,
        async () => {
            const [units, races] = await Promise.all([
                prisma.unit.findMany({
                    where: { campaignId },
                    omit: { createdAt: true },
                }),
                prisma.race.findMany({
                    where: { campaignId },
                    select: {
                        id: true,
                        campaignId: true,
                        name: true,
                        abilities: true,
                        passiveAbility: true,
                    },
                }),
            ]);

            return { units: units.map(withStoredColumns), races };
        },
        [cacheTags.units(campaignId), 'summon-pool'],
        {
            tags: [cacheTags.units(campaignId), cacheTags.races(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedInterruptSpells(
    campaignId: string
): Promise<InterruptSpell[]> {
    return referenceCache(
        campaignId,
        async () => {
            const rows = await prisma.spell.findMany({
                where: {
                    campaignId,
                    spellEffects: {
                        array_contains: [{ kind: 'interruptCast' }],
                    },
                },
            });

            return rows.map((row) => {
                const { targeting } = readSpellDefinition(row);

                return {
                    id: row.id,
                    name: row.name,
                    level: row.level,
                    range: ('range' in targeting && targeting.range) || 60,
                };
            });
        },
        [cacheTags.spells(campaignId), 'interrupt-spells'],
        {
            tags: [cacheTags.spells(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedBackgrounds(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.background.findMany({
                where: { campaignId },
                orderBy: { name: 'asc' },
            }),
        [cacheTags.backgrounds(campaignId)],
        {
            tags: [cacheTags.backgrounds(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}

export async function getCachedCareers(campaignId: string) {
    return referenceCache(
        campaignId,
        async () =>
            prisma.career.findMany({
                where: { campaignId },
                orderBy: { name: 'asc' },
            }),
        [cacheTags.careers(campaignId)],
        {
            tags: [cacheTags.careers(campaignId)],
            revalidate: REFERENCE_REVALIDATE_SECONDS,
        }
    )();
}
