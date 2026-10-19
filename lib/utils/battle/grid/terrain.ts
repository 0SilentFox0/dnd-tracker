import { cellKey, inBounds, neighbors } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { AttackType } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleMapConfig, BattleParticipant, GridPoint, TerrainCell, TerrainDiff } from "@/types/battle";

export function terrainAt(map: Pick<BattleMapConfig, "terrain">, p: GridPoint): TerrainCell | undefined {
  return map.terrain?.[cellKey(p)];
}

export function hazardCells(map: Pick<BattleMapConfig, "terrain">): Set<string> {
  const terrain = map.terrain ?? {};

  return new Set(Object.keys(terrain).filter((k) => terrain[k].kind === "hazard"));
}

function threatens(p: BattleParticipant, mover: BattleParticipant): boolean {
  return (
    p.basicInfo.side !== mover.basicInfo.side &&
    isActive(p) &&
    isOnMap(p) &&
    !getDisabledAttackKinds(p).melee &&
    p.battleData.attacks.some((a) => attackKindOf(a.type) === AttackType.MELEE)
  );
}

export function threatCells(
  map: Pick<BattleMapConfig, "cols" | "rows">,
  participants: BattleParticipant[],
  mover: BattleParticipant,
): Set<string> {
  const enemyCells = participants.filter((p) => threatens(p, mover)).flatMap(cellsOf);

  const own = new Set(enemyCells.map(cellKey));

  const result = new Set<string>();

  for (const n of enemyCells.flatMap(neighbors)) {
    const key = cellKey(n);

    if (inBounds(map, n) && !own.has(key)) result.add(key);
  }

  return result;
}

export function replaceTerrain(map: BattleMapConfig, terrain: Record<string, TerrainCell> | null | undefined): BattleMapConfig {
  const { terrain: _old, ...rest } = map;

  return terrain && Object.keys(terrain).length > 0 ? { ...rest, terrain } : rest;
}

// барʼєр без строку не має жити вічно: прибирається на першому ж переході раунду
const isExpired = (c: TerrainCell, round: number) => c.kind === "barrier" && (c.untilRound === undefined || c.untilRound < round);

export function pruneExpiredBarriers(map: BattleMapConfig, round: number): BattleMapConfig | null {
  const terrain = map.terrain;

  if (!terrain || !Object.values(terrain).some((c) => isExpired(c, round))) return null;

  return replaceTerrain(map, Object.fromEntries(Object.entries(terrain).filter(([, c]) => !isExpired(c, round))));
}

export function applyTerrain(map: BattleMapConfig, cells: string[], value: TerrainCell | null): BattleMapConfig {
  const terrain = { ...map.terrain };

  for (const key of cells) {
    if (value) terrain[key] = { ...value };
    else delete terrain[key];
  }

  return replaceTerrain(map, terrain);
}

const terrainId = (c: TerrainCell) => `${c.kind}|${c.label ?? ""}|${c.untilRound ?? ""}`;

export function diffTerrain(before: BattleMapConfig["terrain"], after: BattleMapConfig["terrain"]): TerrainDiff | null {
  const prev = before ?? {};

  const next = after ?? {};

  const groups = new Map<string, { cell: TerrainCell; keys: string[] }>();

  for (const [key, cell] of Object.entries(next)) {
    const old = prev[key];

    if (old && terrainId(old) === terrainId(cell)) continue;

    const id = terrainId(cell);

    const group = groups.get(id) ?? { cell, keys: [] };

    group.keys.push(key);
    groups.set(id, group);
  }

  const removed = Object.keys(prev).filter((key) => !(key in next));

  if (groups.size === 0 && removed.length === 0) return null;

  return { ...(groups.size > 0 && { set: [...groups.values()] }), ...(removed.length > 0 && { removed }) };
}

export function applyTerrainDiff(map: BattleMapConfig, diff: TerrainDiff): BattleMapConfig {
  const terrain = { ...map.terrain };

  for (const key of diff.removed ?? []) delete terrain[key];

  for (const { cell, keys } of diff.set ?? []) for (const key of keys) terrain[key] = { ...cell };

  return replaceTerrain(map, terrain);
}
