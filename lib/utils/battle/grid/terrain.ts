import { cellKey, inBounds, neighbors } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { AttackType, HAZARD_DICE_PATTERN } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { BattleMapConfig, BattleParticipant, TerrainCell, TerrainDamage, TerrainDiff } from "@/types/battle";

/** Шкода небезпеки ДМ; порожні чи некоректні кубики — без шкоди (лише підсвітка). */
export function hazardDamage(dice: string, type: string): (TerrainDamage & { dice: string }) | undefined {
  const formula = dice.trim();

  return HAZARD_DICE_PATTERN.test(formula) ? { dice: formula, type } : undefined;
}

export function isObscured(map: Pick<BattleMapConfig, "terrain"> | null | undefined, p: BattleParticipant): boolean {
  const terrain = map?.terrain;

  return !!terrain && isOnMap(p) && cellsOf(p).some((c) => terrain[cellKey(c)]?.obscured);
}

/** Зона заклинання без шкоди (туман, тригер-зона) небезпекою не вважається. */
export const isDamagingCell = (c: TerrainCell) => c.kind === "hazard" && (!!c.damage || !c.zoneId);

export function hazardCells(map: Pick<BattleMapConfig, "terrain">): Set<string> {
  const terrain = map.terrain ?? {};

  return new Set(Object.keys(terrain).filter((k) => isDamagingCell(terrain[k])));
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

function withoutOrphanZones(map: BattleMapConfig): BattleMapConfig {
  const { spellZones, ...rest } = map;

  if (!spellZones) return map;

  const used = new Set(Object.values(map.terrain ?? {}).flatMap((c) => (c.zoneId ? [c.zoneId] : [])));

  const kept = Object.fromEntries(Object.entries(spellZones).filter(([id]) => used.has(id)));

  return Object.keys(kept).length > 0 ? { ...rest, spellZones: kept } : rest;
}

export function replaceTerrain(map: BattleMapConfig, terrain: Record<string, TerrainCell> | null | undefined): BattleMapConfig {
  const { terrain: _old, ...rest } = map;

  return withoutOrphanZones(terrain && Object.keys(terrain).length > 0 ? { ...rest, terrain } : rest);
}

// барʼєр без строку не має жити вічно: прибирається на першому ж переході раунду; решта місцевості без строку — постійна
function isExpired(c: TerrainCell, round: number): boolean {
  if (c.kind === "barrier") return c.untilRound === undefined || c.untilRound < round;

  return c.untilRound !== undefined && c.untilRound < round;
}

export function pruneExpiredTerrain(map: BattleMapConfig, round: number): BattleMapConfig | null {
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

export function removeSpellZones(map: BattleMapConfig, cells: string[]): BattleMapConfig {
  const terrain = map.terrain ?? {};

  const ids = new Set(cells.flatMap((k) => (terrain[k]?.zoneId ? [terrain[k].zoneId] : [])));

  if (ids.size === 0) return map;

  return replaceTerrain(map, Object.fromEntries(Object.entries(terrain).filter(([, c]) => !c.zoneId || !ids.has(c.zoneId))));
}

const terrainId = (c: TerrainCell) => `${c.kind}|${c.label ?? ""}|${c.untilRound ?? ""}|${c.damage ? JSON.stringify(c.damage) : ""}|${c.difficult ? 1 : 0}${c.obscured ? 1 : 0}|${c.zoneId ?? ""}`;

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
