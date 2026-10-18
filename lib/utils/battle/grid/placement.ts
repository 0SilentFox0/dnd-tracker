import { cellDistance, cellKey, footprint } from "./geometry";
import { fits, isOnMap, sizeOf } from "./occupancy";

import { ParticipantSide } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

function sideAnchors(map: BattleMapConfig, side: string): GridPoint[] {
  const cols = Array.from({ length: map.cols }, (_, i) => (side === ParticipantSide.ENEMY ? map.cols - 1 - i : i));

  const mid = (map.rows - 1) / 2;

  const rows = Array.from({ length: map.rows }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);

  return cols.flatMap((x) => rows.map((y) => ({ x, y })));
}

function nearAnchors(map: BattleMapConfig, center: GridPoint): GridPoint[] {
  const all: GridPoint[] = [];

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) all.push({ x, y });
  }

  return all.sort((a, b) => cellDistance(map.grid, a, center) - cellDistance(map.grid, b, center));
}

export function placeParticipants(map: BattleMapConfig, participants: BattleParticipant[]): BattleParticipant[] {
  const blocked = new Set(participants.filter(isOnMap).flatMap((p) => footprint(map.grid, p.battleData.position!, sizeOf(p)).map(cellKey)));

  const positions = new Map(participants.filter(isOnMap).map((p) => [p.basicInfo.id, p.battleData.position!]));

  return participants.map((p) => {
    if (p.battleData.position || p.battleData.reserved || !isActive(p)) return p;

    const size = sizeOf(p);

    // великі істоти: якір лівий верхній, тож ворожий край зсуваємо на розмір
    const shift = (a: GridPoint) => (p.basicInfo.side === ParticipantSide.ENEMY ? { x: a.x - size + 1, y: a.y } : a);

    const summoner = p.battleData.summonedBy ? positions.get(p.battleData.summonedBy) : undefined;

    const candidates = summoner ? nearAnchors(map, summoner) : sideAnchors(map, p.basicInfo.side).map(shift);

    const anchor = candidates.find((a) => fits(map, a, size, blocked));

    if (!anchor) return p;

    for (const c of footprint(map.grid, anchor, size)) blocked.add(cellKey(c));
    positions.set(p.basicInfo.id, anchor);

    return { ...p, battleData: { ...p.battleData, position: anchor } };
  });
}
