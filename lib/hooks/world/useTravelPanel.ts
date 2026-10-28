"use client";

import { useRef, useState } from "react";

import type { RosterHero } from "./useWorldHeroes";
import { useWorldMaps } from "./useWorldMaps";
import { useWorldTravel } from "./useWorldTravel";

import { useCampaignRules } from "@/lib/hooks/campaigns";
import type { MapPoint, TravelRest, WorldMarker } from "@/types/world";

export interface TravelMoved {
  kind: "travel" | "enter" | "exit";
  fromMapId: string;
  destMapId: string;
}

interface Options {
  campaignId: string;
  mapId: string;
  heroes: RosterHero[];
  onMapIds: string[];
  target: MapPoint | null;
  selectedMarker: WorldMarker | null;
  onMoved?(e: TravelMoved): void;
}

export function useTravelPanel({ campaignId, mapId, heroes, onMapIds, target, selectedMarker, onMoved }: Options) {
  const [picked, setPicked] = useState<string[]>([]);

  const [rest, setRest] = useState<TravelRest>("none");

  const { travel, enter, exit, rest: restMutation, isPending } = useWorldTravel(campaignId);

  const { data: rules } = useCampaignRules(campaignId);

  const maps = useWorldMaps(campaignId);

  const selected = picked.filter((id) => heroes.some((h) => h.id === id));

  const toggle = (id: string) => setPicked(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const allSelected = heroes.length > 0 && selected.length === heroes.length;

  const selectAll = () => setPicked(allSelected ? [] : heroes.map((h) => h.id));

  const busy = useRef(false);

  // a second click can land before the first render disables the button
  const run = (action: () => Promise<unknown>) => {
    if (busy.current) return;

    busy.current = true;
    void action().finally(() => (busy.current = false));
  };

  // mutation errors are already notified by useCrudMutation
  const moved = async (kind: TravelMoved["kind"], request: Promise<{ positions: { mapId: string }[] }>) => {
    const result = await request.catch(() => null);

    if (result) onMoved?.({ kind, fromMapId: mapId, destMapId: result.positions[0]?.mapId ?? mapId });
  };

  const ready = selected.length > 0 && !isPending;

  const nested = !!maps.data?.find((m) => m.id === mapId)?.parentMarkerId;

  const canExit = ready && nested && selected.every((id) => onMapIds.includes(id));

  const restEnabled = !!rules?.outOfCombat.persistResources;

  const canRest = ready && restEnabled && rest !== "none" && selected.every((id) => onMapIds.includes(id));

  const childMapId = selectedMarker?.childMapId ?? null;

  return {
    selected,
    toggle,
    allSelected,
    selectAll,
    rest,
    setRest,
    isPending,
    canMove: ready && !!target,
    canEnter: !!childMapId,
    nested,
    canExit,
    canAct: ready,
    restEnabled,
    restOff: !!rules && !restEnabled,
    canRest,
    restNow: () => {
      if (canRest) run(() => restMutation.mutateOk({ mapId, characterIds: selected, kind: rest }));
    },
    move: () => {
      if (ready && target) run(() => moved("travel", travel.mutateAsync({ mapId, characterIds: selected, to: target, toMarkerId: selectedMarker?.id, rest })));
    },
    enterMarker: () => {
      if (ready && selectedMarker && childMapId) run(() => moved("enter", enter.mutateAsync({ markerId: selectedMarker.id, characterIds: selected, rest })));
    },
    exitMap: () => {
      if (canExit) run(() => moved("exit", exit.mutateAsync({ mapId, characterIds: selected, rest })));
    },
  };
}
