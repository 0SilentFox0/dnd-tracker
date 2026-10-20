import { pickAttack } from "./attack-reach";
import { cellKey, footprint, parseCellKey } from "./geometry";
import { cellsOf, isOnMap, sizeOf } from "./occupancy";
import { moveBudget, reachable } from "./path";
import { hazardCells, threatCells } from "./terrain";

import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleAttack, BattleMapConfig, BattleMapMark, BattleParticipant, GridPoint } from "@/types/battle";

export type CellMark = BattleMapMark;

export function moveMarks(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, opts: { dmUserId?: string | null } = {}): Map<string, number> {
  return reachable(map, participants, mover, moveBudget({ map, dmUserId: opts.dmUserId ?? null }, mover));
}

export const isMoveMark = (m: CellMark | number | undefined): boolean => typeof m === "number" || m === "move" || m === "move-danger";

export interface MoveStep {
  anchor: GridPoint;
  cost: number;
}

function closerStep(a: MoveStep, b: MoveStep, from: GridPoint): boolean {
  if (a.cost !== b.cost) return a.cost < b.cost;

  const d = (s: MoveStep) => [Math.max(Math.abs(s.anchor.x - from.x), Math.abs(s.anchor.y - from.y)), Math.abs(s.anchor.x - from.x) + Math.abs(s.anchor.y - from.y), s.anchor.y, s.anchor.x];

  const [da, db] = [d(a), d(b)];

  const i = da.findIndex((v, k) => v !== db[k]);

  return i !== -1 && da[i] < db[i];
}

/** Клітинка зони → якір, куди ставити токен: велика істота клікає будь-яку клітинку нового footprint, а не лише його лівий верхній кут. */
export function moveSteps(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, opts: { dmUserId?: string | null } = {}): Map<string, MoveStep> {
  const anchors = moveMarks(map, participants, mover, opts);

  const size = sizeOf(mover);

  const from = mover.battleData.position;

  const steps = new Map<string, MoveStep>();

  if (size === 1 || !from) {
    for (const [key, cost] of anchors) steps.set(key, { anchor: parseCellKey(key), cost });

    return steps;
  }

  const own = new Set(cellsOf(mover).map(cellKey));

  for (const [key, cost] of anchors) {
    const step = { anchor: parseCellKey(key), cost };

    for (const cell of footprint(step.anchor, size)) {
      const k = cellKey(cell);

      const kept = steps.get(k);

      if (!own.has(k) && (!kept || closerStep(step, kept, from))) steps.set(k, step);
    }
  }

  return steps;
}

export function moveZoneMarks(
  map: BattleMapConfig,
  participants: BattleParticipant[],
  mover: BattleParticipant,
  opts: { dmUserId?: string | null; steps?: Map<string, MoveStep> } = {},
): Map<string, CellMark | number> {
  const danger = new Set([...threatCells(map, participants, mover), ...hazardCells(map)]);

  const marks = new Map<string, CellMark | number>();

  for (const [key, { cost }] of opts.steps ?? moveSteps(map, participants, mover, opts)) marks.set(key, danger.has(key) ? "move-danger" : cost);

  return marks;
}

export function targetMarks(map: BattleMapConfig, participants: BattleParticipant[], attacker: BattleParticipant, attacks: BattleAttack[]): Map<string, CellMark> {
  const marks = new Map<string, CellMark>();

  for (const t of participants) {
    if (t.basicInfo.side === attacker.basicInfo.side || !isOnMap(t) || !isActive(t)) continue;

    const mark: CellMark = pickAttack(map, participants, attacker, attacks, t).attack ? "target" : "invalid-target";

    for (const c of cellsOf(t)) marks.set(cellKey(c), mark);
  }

  return marks;
}
