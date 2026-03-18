import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createRace,
  deleteRace,
  getRaces,
  updateRace,
} from "@/lib/api/races";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Race, RaceFormData } from "@/types/races";

export function useRaces(campaignId: string, initialRaces?: Race[]) {
  return useQuery<Race[]>({
    queryKey: ["races", campaignId],
    staleTime: REFERENCE_STALE_MS,
    queryFn: () => getRaces(campaignId),
    ...(initialRaces && initialRaces.length > 0 ? { initialData: initialRaces } : {}),
  });
}

export function useCreateRace(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RaceFormData) => createRace(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["races", campaignId] });
    },
  });
}

export function useUpdateRace(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      raceId,
      data,
    }: {
      raceId: string;
      data: Partial<RaceFormData>;
    }) => updateRace(campaignId, raceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["races", campaignId] });
    },
  });
}

export function useDeleteRace(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (raceId: string) => deleteRace(campaignId, raceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["races", campaignId] });
    },
  });
}
