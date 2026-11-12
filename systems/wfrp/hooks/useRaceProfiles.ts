import { useQuery } from '@tanstack/react-query';

import { useCrudMutation } from '@/lib/hooks/common';
import { raceProfileKeys } from '@/lib/hooks/races';
import { REFERENCE_STALE_MS } from '@/lib/providers/query-provider';
import { getRaceProfiles, saveRaceProfile } from '@/systems/wfrp/api/races';
import type { RaceProfileItem } from '@/systems/wfrp/api/types';
import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';

export function useRaceProfiles(
    campaignId: string,
    opts?: { enabled?: boolean }
) {
    return useQuery<RaceProfileItem[]>({
        queryKey: raceProfileKeys.list(campaignId),
        staleTime: REFERENCE_STALE_MS,
        queryFn: () => getRaceProfiles(campaignId),
        enabled: opts?.enabled ?? true,
    });
}

export function useSaveRaceProfile(campaignId: string) {
    return useCrudMutation({
        mutationFn: ({
            raceId,
            profile,
        }: {
            raceId: string;
            profile: SpeciesProfile;
        }) => saveRaceProfile(campaignId, raceId, profile),
        invalidateKeys: [raceProfileKeys.list(campaignId)],
    });
}
