import 'server-only';
import { invalidateReference, ReferenceKind } from '@/lib/cache/tags';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { assertCampaignRefs } from '@/lib/server/campaigns/campaign-refs';
import { ContentError } from '@/lib/server/content/errors';
import { withCampaignContentWrite } from '@/lib/server/content/write';
import { afterContentCommit } from '@/lib/server/content/write-context';
import { jsonContentInput } from '@/lib/utils/common/json';
import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';
import {
    parseSpeciesProfile,
    profileRefIds,
} from '@/systems/wfrp/server/profile-refs';

export type RaceProfileItem = { raceId: string; profile: SpeciesProfile };

export async function listRaceProfiles(
    campaignId: string
): Promise<RaceProfileItem[]> {
    const rows = await prisma.race.findMany({
        where: { campaignId },
        select: { id: true, profile: true },
    });

    return rows.flatMap(({ id, profile }) => {
        const parsed = parseSpeciesProfile(profile);

        return parsed ? [{ raceId: id, profile: parsed }] : [];
    });
}

export async function saveRaceProfile(
    campaignId: string,
    raceId: string,
    profile: SpeciesProfile,
    invalidate: typeof invalidateReference = invalidateReference
): Promise<RaceProfileItem> {
    const race = await prisma.race.findFirst({
        where: { id: raceId, campaignId },
        select: { id: true },
    });

    if (!race) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    const refs = profileRefIds(profile);

    await assertCampaignRefs(campaignId, {
        career: refs.careers,
        feat: refs.feats,
    });

    await withCampaignContentWrite(campaignId, async () => {
        await prisma.race.update({
            where: { id: raceId },
            data: { profile: jsonContentInput(profile) },
        });
        afterContentCommit(() => invalidate(ReferenceKind.RACES, campaignId));
    });

    return { raceId, profile };
}
