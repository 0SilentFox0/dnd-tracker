import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { Race, RaceFormData } from "@/types/races";

export function useRaces(campaignId: string, initialRaces?: Race[]) {
  return useQuery<Race[]>({
    queryKey: ["races", campaignId],
    staleTime: REFERENCE_STALE_MS,
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/races`);

      if (!response.ok) {
        throw new Error("Failed to fetch races");
      }

      return response.json();
    },
    ...(initialRaces && initialRaces.length > 0 ? { initialData: initialRaces } : {}),
  });
}

export function useCreateRace(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RaceFormData) => {
      const response = await fetch(`/api/campaigns/${campaignId}/races`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Failed to create race");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["races", campaignId] });
    },
  });
}

export function useUpdateRace(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      raceId,
      data,
    }: {
      raceId: string;
      data: Partial<RaceFormData>;
    }) => {
      const response = await fetch(
        `/api/campaigns/${campaignId}/races/${raceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Failed to update race");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["races", campaignId] });
    },
  });
}

export function useDeleteRace(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (raceId: string) => {
      const response = await fetch(
        `/api/campaigns/${campaignId}/races/${raceId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();

        throw new Error(error.error || "Failed to delete race");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["races", campaignId] });
    },
  });
}
