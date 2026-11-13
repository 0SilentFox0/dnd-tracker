import { Prisma } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { ContentRefSource } from '@/lib/server/systems/types';
import { collectKeysAndStrings } from '@/lib/server/templates/remap-ids';
import type { SyncDb } from '@/lib/server/templates/sync/context';
import { isRecord } from '@/lib/utils/common/is-record';
import {
    parseSpeciesProfile,
    profileRefIds,
} from '@/systems/wfrp/server/profile-refs';

const speciesProfiles = async (db: SyncDb, campaignId: string) =>
    (
        await db.race.findMany({
            where: { campaignId },
            select: { profile: true },
        })
    ).flatMap((r) => (r.profile == null ? [] : [r.profile]));

const EMPTY_PROFILE = { careerTable: [], talents: [], randomTalents: [] };

async function featRefs(db: SyncDb, campaignId: string): Promise<Set<string>> {
    const [profiles, careers] = await Promise.all([
        speciesProfiles(db, campaignId),
        db.career.findMany({ where: { campaignId }, select: { tiers: true } }),
    ]);

    return collectKeysAndStrings([
        profiles,
        careers.flatMap((c) =>
            (Array.isArray(c.tiers) ? c.tiers : []).map((t) =>
                isRecord(t) ? t.talents : null
            )
        ),
    ]);
}

async function careerRefs(
    db: SyncDb,
    campaignId: string
): Promise<Set<string>> {
    const [profiles, characters] = await Promise.all([
        speciesProfiles(db, campaignId),
        db.character.findMany({
            where: { campaignId },
            select: { characteristics: true },
        }),
    ]);

    const used = new Set<string>();

    for (const p of profiles)
        for (const id of profileRefIds(parseSpeciesProfile(p) ?? EMPTY_PROFILE)
            .careers)
            used.add(id);

    for (const { characteristics } of characters) {
        const career = isRecord(characteristics)
            ? characteristics.career
            : null;

        if (isRecord(career) && typeof career.careerId === 'string')
            used.add(career.careerId);
    }

    return used;
}

async function danglingProfileWarnings(
    db: SyncDb,
    campaignId: string
): Promise<string[]> {
    const races = await db.race.findMany({
        where: { campaignId, profile: { not: Prisma.DbNull } },
        select: { name: true, profile: true },
    });

    if (!races.length) return [];

    const [careers, feats] = await Promise.all([
        db.career.findMany({ where: { campaignId }, select: { id: true } }),
        db.feat.findMany({ where: { campaignId }, select: { id: true } }),
    ]);

    const careerIds = new Set(careers.map((c) => c.id));

    const featIds = new Set(feats.map((f) => f.id));

    return races.flatMap(({ name, profile }) => {
        const p = parseSpeciesProfile(profile);

        if (!p) return [];

        const refs = profileRefIds(p);

        const missing = [
            ...refs.careers.filter((id) => !careerIds.has(id)),
            ...refs.feats.filter((id) => !featIds.has(id)),
        ];

        return missing.length
            ? [
                  `races ${name}: dangling profile refs ${[...new Set(missing)].join(', ')}`,
              ]
            : [];
    });
}

/** Profiles and tiers reference rows by id inside JSON, so no FK stops a delete */
export const WFRP_CONTENT_REFS: readonly ContentRefSource[] = [
    {
        kind: 'feats',
        reason: 'used by a species profile or career',
        error: API_ERRORS.FEAT_IN_SPECIES_TABLE,
        referenced: featRefs,
        dangling: danglingProfileWarnings,
    },
    {
        kind: 'careers',
        reason: 'used by a species profile or character',
        error: API_ERRORS.CAREER_IN_SPECIES_TABLE,
        referenced: careerRefs,
        invalidatesOnDelete: ['feats'],
    },
];
