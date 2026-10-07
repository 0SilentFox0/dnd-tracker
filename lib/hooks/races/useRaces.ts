import { useQuery } from "@tanstack/react-query";

import { raceKeys } from "./keys";

import {
  createRace,
  deleteRace,
  getRaces,
  updateRace,
} from "@/lib/api/races";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { useCrudMutation } from "@/lib/hooks/common";
import { skillKeys } from "@/lib/hooks/skills/keys";
import { unitKeys } from "@/lib/hooks/units/keys";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Race, RaceFormData } from "@/types/races";

const raceDependentKeys = (campaignId: string) => [
  raceKeys.list(campaignId),
  unitKeys.list(campaignId),
  characterKeys.lists(campaignId),
  skillKeys.trees(campaignId),
];

export function useRaces(campaignId: string, initialRaces?: Race[]) {
  return useQuery<Race[]>({
    queryKey: raceKeys.list(campaignId),
    staleTime: REFERENCE_STALE_MS,
    queryFn: () => getRaces(campaignId),
    ...(initialRaces && initialRaces.length > 0
      ? { initialData: initialRaces }
      : {}),
  });
}

export function useCreateRace(campaignId: string) {
  return useCrudMutation({
    mutationFn: (data: RaceFormData) => createRace(campaignId, data),
    invalidateKeys: [raceKeys.list(campaignId)],
  });
}

export function useUpdateRace(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({
      raceId,
      data,
    }: {
      raceId: string;
      data: Partial<RaceFormData>;
    }) => updateRace(campaignId, raceId, data),
    invalidateKeys: raceDependentKeys(campaignId),
  });
}

export function useDeleteRace(campaignId: string) {
  return useCrudMutation({
    mutationFn: (raceId: string) => deleteRace(campaignId, raceId),
    invalidateKeys: raceDependentKeys(campaignId),
  });
}
