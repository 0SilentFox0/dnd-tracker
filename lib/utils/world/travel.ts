import { clamp01, coversPoint } from "./geometry";

import type { MapPoint, RevealShape } from "@/types/world";

export type HeroPos = { characterId: string; mapId: string; x: number; y: number } | null;

export type TravelPlan = {
  moves: { characterId: string; from: HeroPos; to: MapPoint }[];
  reveals: { characterId: string; shape: RevealShape }[];
};

export function planTravel(args: {
  positions: Map<string, HeroPos>;
  characterIds: string[];
  mapId: string;
  to: MapPoint;
  radius: number;
  aspect: number;
}): TravelPlan {
  const to = { x: clamp01(args.to.x), y: clamp01(args.to.y) };

  const plan: TravelPlan = { moves: [], reveals: [] };

  for (const characterId of args.characterIds) {
    const from = args.positions.get(characterId) ?? null;

    plan.moves.push({ characterId, from, to });
    plan.reveals.push({
      characterId,
      shape: from && from.mapId === args.mapId ? { t: "s", x1: from.x, y1: from.y, x2: to.x, y2: to.y } : { t: "p", x: to.x, y: to.y },
    });
  }

  return plan;
}

function planArrival(characterIds: string[], to: MapPoint): TravelPlan {
  return {
    moves: characterIds.map((characterId) => ({ characterId, from: null, to })),
    reveals: characterIds.map((characterId) => ({ characterId, shape: { t: "p", x: to.x, y: to.y } })),
  };
}

export function planEnter(args: {
  marker: { id: string; mapId: string };
  childMap: { id: string; entryX: number; entryY: number };
  characterIds: string[];
}): TravelPlan {
  return planArrival(args.characterIds, { x: args.childMap.entryX, y: args.childMap.entryY });
}

export function planExit(args: {
  map: { id: string; parentMarker: { mapId: string; x: number; y: number } | null };
  characterIds: string[];
}): TravelPlan {
  if (!args.map.parentMarker) throw new Error("NOT_NESTED");

  return planArrival(args.characterIds, { x: args.map.parentMarker.x, y: args.map.parentMarker.y });
}

export function dedupePoint(existing: RevealShape[], p: MapPoint, radius: number, aspect: number): boolean {
  return coversPoint(existing, p, radius, aspect);
}
