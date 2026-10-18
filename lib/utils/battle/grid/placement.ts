import { cellDistance, cellKey, footprint } from "./geometry";
import { fits, occupiesCells, sizeOf } from "./occupancy";

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

function sideAnchors(map: BattleMapConfig, side: string): GridPoint[] {
  const cols = Array.from({ length: map.cols }, (_, i) => (side === ParticipantSide.ENEMY ? map.cols - 1 - i : i));

  const mid = (map.rows - 1) / 2;

  const byMid = Array.from({ length: map.rows }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);

  const base = byMid[0] % 2;

  const spread = cols.slice(0, Math.max(1, Math.floor(map.cols / 2)));

  const primary = spread.flatMap((x, i) => byMid.filter((y) => (y + i) % 2 === base).map((y) => ({ x, y })));

  const taken = new Set(primary.map(cellKey));

  const rest = cols.flatMap((x) => byMid.map((y) => ({ x, y }))).filter((a) => !taken.has(cellKey(a)));

  return [...primary, ...rest];
}

function nearAnchors(map: BattleMapConfig, center: GridPoint): GridPoint[] {
  const all: GridPoint[] = [];

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) all.push({ x, y });
  }

  return all.sort((a, b) => cellDistance(a, center) - cellDistance(b, center));
}

export function placeParticipants(map: BattleMapConfig, participants: BattleParticipant[]): BattleParticipant[] {
  const blocked = new Set<string>();

  const positions = new Map<string, GridPoint>();

  for (const p of participants) {
    const position = p.battleData.position;

    if (!position || !occupiesCells(p) || !fits(map, position, sizeOf(p), blocked)) continue;

    for (const c of footprint(position, sizeOf(p))) blocked.add(cellKey(c));
    positions.set(p.basicInfo.id, position);
  }

  return participants.map((p) => {
    if (!occupiesCells(p) || positions.has(p.basicInfo.id)) return p;

    const size = sizeOf(p);

    // великі істоти: якір лівий верхній, тож ворожий край зсуваємо на розмір
    const shift = (a: GridPoint) => (p.basicInfo.side === ParticipantSide.ENEMY ? { x: a.x - size + 1, y: a.y } : a);

    const summoner = p.battleData.summonedBy ? positions.get(p.battleData.summonedBy) : undefined;

    const near = p.battleData.position ?? summoner;

    const candidates = near ? nearAnchors(map, near) : sideAnchors(map, p.basicInfo.side).map(shift);

    const anchor = candidates.find((a) => fits(map, a, size, blocked));

    if (!anchor) return p;

    for (const c of footprint(anchor, size)) blocked.add(cellKey(c));
    positions.set(p.basicInfo.id, anchor);

    return { ...p, battleData: { ...p.battleData, position: anchor } };
  });
}
