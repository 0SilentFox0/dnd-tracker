import { useQuery } from "@tanstack/react-query";

import {
  createRace,
  deleteRace,
  getRaces,
  updateRace,
} from "@/lib/api/races";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Race, RaceFormData } from "@/types/races";

export function useRaces(campaignId: string, initialRaces?: Race[]) {
  return useQuery<Race[]>({
    queryKey: ["races", campaignId],
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
    invalidateKeys: [["races", campaignId]],
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
    invalidateKeys: [["races", campaignId]],
  });
}

export function useDeleteRace(campaignId: string) {
  return useCrudMutation({
    mutationFn: (raceId: string) => deleteRace(campaignId, raceId),
    invalidateKeys: [["races", campaignId]],
  });
}
