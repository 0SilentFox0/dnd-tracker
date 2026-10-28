"use client";

import { useRef, useState } from "react";

import type { RosterHero } from "./useWorldHeroes";
import { useWorldMaps } from "./useWorldMaps";
import { useWorldTravel } from "./useWorldTravel";

import type { MapPoint, TravelRest, WorldMarker } from "@/types/world";

interface Options {
  campaignId: string;
  mapId: string;
  heroes: RosterHero[];
  target: MapPoint | null;
  selectedMarker: WorldMarker | null;
}

export function useTravelPanel({ campaignId, mapId, heroes, target, selectedMarker }: Options) {
  const [picked, setPicked] = useState<string[]>([]);

  const [rest, setRest] = useState<TravelRest>("none");

  const { travel, enter, exit, isPending } = useWorldTravel(campaignId, mapId);

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

  const ready = selected.length > 0 && !isPending;

  const nested = !!maps.data?.find((m) => m.id === mapId)?.parentMarkerId;

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
    canExit: nested,
    canAct: ready,
    move: () => {
      if (ready && target) run(() => travel.mutateOk({ mapId, characterIds: selected, to: target, toMarkerId: selectedMarker?.id, rest }));
    },
    enterMarker: () => {
      if (ready && selectedMarker && childMapId) run(() => enter.mutateOk({ markerId: selectedMarker.id, characterIds: selected, rest }));
    },
    exitMap: () => {
      if (ready && nested) run(() => exit.mutateOk({ mapId, characterIds: selected, rest }));
    },
  };
}
