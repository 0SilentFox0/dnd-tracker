import { cellKey, cellLine, closestCell, footprintDistance, isPlayable } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { CELL_FEET } from "@/lib/constants/battle";
import { isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant, GridPoint, SpellTemplate } from "@/types/battle";

const CONE_TAN = 0.5;

const EPS = 1e-9;

export function feetToCells(feet: number): number {
  return Math.max(1, Math.floor(feet / CELL_FEET));
}

export function apexOf(origin: GridPoint[], aim: GridPoint): GridPoint {
  return closestCell(origin, [aim]);
}

function circleCells(map: BattleMapConfig, r: number, aim: GridPoint): GridPoint[] {
  const out: GridPoint[] = [];

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= (r + 0.5) ** 2) out.push({ x: aim.x + dx, y: aim.y + dy });
    }
  }

  return out.filter((c) => isPlayable(map, c));
}

function cubeCells(r: number, aim: GridPoint): GridPoint[] {
  const x0 = aim.x - Math.floor((r - 1) / 2);

  const y0 = aim.y - Math.floor((r - 1) / 2);

  const out: GridPoint[] = [];

  for (let y = y0; y < y0 + r; y++) {
    for (let x = x0; x < x0 + r; x++) out.push({ x, y });
  }

  return out;
}

function coneCells(r: number, apex: GridPoint, aim: GridPoint): GridPoint[] {
  const ax = aim.x - apex.x;

  const ay = aim.y - apex.y;

  const out: GridPoint[] = [];

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx === 0 && dy === 0) continue;

      const dot = dx * ax + dy * ay;

      const cross = Math.abs(dx * ay - dy * ax);

      if (dot > 0 && cross <= CONE_TAN * dot + EPS) out.push({ x: apex.x + dx, y: apex.y + dy });
    }
  }

  return out;
}

export function rayCells(map: BattleMapConfig, from: GridPoint, through: GridPoint, opts: { maxCells: number; stopAtTarget?: boolean }): GridPoint[] {
  const vx = through.x - from.x;

  const vy = through.y - from.y;

  const len = Math.max(Math.abs(vx), Math.abs(vy));

  if (len === 0) return [];

  const end = opts.stopAtTarget ? through : { x: from.x + Math.round((vx * opts.maxCells) / len), y: from.y + Math.round((vy * opts.maxCells) / len) };

  const out: GridPoint[] = [];

  for (const c of cellLine(from, end).slice(1, opts.maxCells + 1)) {
    if (!isPlayable(map, c)) break;

    out.push(c);
  }

  return out;
}

export function templateCells(map: BattleMapConfig, template: SpellTemplate, origin: GridPoint[], aim: GridPoint): string[] {
  const r = feetToCells(template.size);

  const own = new Set(origin.map(cellKey));

  let raw: GridPoint[];

  if (template.shape === "circle") raw = circleCells(map, r, aim);
  else if (template.shape === "cube") raw = cubeCells(r, aim);
  else if (origin.length === 0) raw = [];
  else {
    const apex = apexOf(origin, aim);

    raw = template.shape === "cone" ? coneCells(r, apex, aim) : rayCells(map, apex, aim, { maxCells: r });

    raw = raw.filter((c) => !own.has(cellKey(c)));
  }

  return [...new Set(raw.filter((c) => isPlayable(map, c)).map(cellKey))];
}

export function participantsInCells(participants: BattleParticipant[], cells: string[], from: GridPoint): BattleParticipant[] {
  const set = new Set(cells);

  return participants
    .filter((p) => isTargetable(p) && isOnMap(p) && cellsOf(p).some((c) => set.has(cellKey(c))))
    .map((p, i) => ({ p, i, d: footprintDistance([from], cellsOf(p)) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.p);
}

const centered = (t: SpellTemplate) => t.shape === "circle" || t.shape === "cube";

/** Конус і лінія задають лише напрямок, тож дальність стосується тільки кола й куба. */
export function templateAimAllowed(origin: GridPoint[], template: SpellTemplate, aim: GridPoint, rangeFeet: number | undefined): boolean {
  return !centered(template) || aimInRange(origin, aim, rangeFeet);
}

export function templateArea(map: BattleMapConfig, participants: BattleParticipant[], caster: BattleParticipant, template: SpellTemplate, aim: GridPoint): { cells: string[]; targets: BattleParticipant[] } {
  const origin = cellsOf(caster);

  const cells = templateCells(map, template, origin, aim);

  return { cells, targets: participantsInCells(participants, cells, centered(template) || origin.length === 0 ? aim : apexOf(origin, aim)) };
}

export function aimInRange(origin: GridPoint[], aim: GridPoint, rangeFeet: number | undefined): boolean {
  if (rangeFeet === undefined) return true;

  return footprintDistance(origin, [aim]) <= feetToCells(rangeFeet);
}
