"use client";

import { worldKeys } from "./keys";

import { enterMarker, exitMap, travelHeroes } from "@/lib/api/world";
import { useCrudMutation } from "@/lib/hooks/common";

export function useWorldTravel(campaignId: string, mapId: string | null) {
  const invalidateKeys = () => [worldKeys.viewAll(campaignId), worldKeys.map(campaignId, mapId ?? ""), worldKeys.log(campaignId)];

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

  return { travel, enter, exit, isPending: travel.isPending || enter.isPending || exit.isPending };
}
