import type { RaceProfileItem } from './types';

import { campaignGet, campaignPut } from '@/lib/api/client';
import { systemPath } from '@/lib/api/system';
import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';

export const getRaceProfiles = async (campaignId: string) =>
    (
        await campaignGet<{ profiles: RaceProfileItem[] }>(
            campaignId,
            systemPath.campaign('race-profiles')
        )
    ).profiles;

export const saveRaceProfile = (
    campaignId: string,
    raceId: string,
    profile: SpeciesProfile
) =>
    campaignPut<RaceProfileItem>(
        campaignId,
        `${systemPath.campaign('race-profile')}?${new URLSearchParams({ raceId })}`,
        profile
    );
