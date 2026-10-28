"use client";

import { worldKeys } from "./keys";

import { enterMarker, exitMap, restHeroes, travelHeroes } from "@/lib/api/world";
import { useCrudMutation } from "@/lib/hooks/common";
import type { RestRequest } from "@/types/world";

export function useWorldTravel(campaignId: string) {
  const invalidateKeys = () => [worldKeys.viewAll(campaignId), worldKeys.mapAll(campaignId), worldKeys.log(campaignId)];

  const travel = useCrudMutation({
    mutationFn: (data: Parameters<typeof travelHeroes>[1]) => travelHeroes(campaignId, data),
    invalidateKeys,
    errorText: "Не вдалося перемістити героїв",
  });

  const enter = useCrudMutation({
    mutationFn: (data: Parameters<typeof enterMarker>[1]) => enterMarker(campaignId, data),
    invalidateKeys,
    errorText: "Не вдалося зайти на карту",
  });

  const exit = useCrudMutation({
    mutationFn: (data: Parameters<typeof exitMap>[1]) => exitMap(campaignId, data),
    invalidateKeys,
    errorText: "Не вдалося вийти з карти",
  });

  const rest = useCrudMutation({
    mutationFn: (data: RestRequest) => restHeroes(campaignId, data),
    invalidateKeys,
    errorText: "Не вдалося провести відпочинок",
  });

  return { travel, enter, exit, rest, isPending: travel.isPending || enter.isPending || exit.isPending || rest.isPending };
}
