import { useQuery } from "@tanstack/react-query";

import { raceProfileKeys } from "./keys";

import { getRaceProfiles, saveRaceProfile } from "@/lib/api/races";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";
import type { RaceProfileItem } from "@/types/races";

export function useRaceProfiles(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery<RaceProfileItem[]>({ queryKey: raceProfileKeys.list(campaignId), staleTime: REFERENCE_STALE_MS, queryFn: () => getRaceProfiles(campaignId), enabled: opts?.enabled ?? true });
}

export function useSaveRaceProfile(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({ raceId, profile }: { raceId: string; profile: SpeciesProfile }) => saveRaceProfile(campaignId, raceId, profile),
    invalidateKeys: [raceProfileKeys.list(campaignId)],
  });
}
