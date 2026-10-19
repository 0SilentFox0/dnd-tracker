import { cellDistance, cellKey, cellLine, footprintDistance, inBounds, isPlayable, parseCellKey } from "./geometry";
import { cellsOf, isOnMap } from "./occupancy";

import { CELL_FEET } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleMapConfig, BattleParticipant, GridPoint, SpellTemplate } from "@/types/battle";

const CONE_TAN = 0.5;

const EPS = 1e-9;

export function feetToCells(feet: number): number {
  return Math.max(1, Math.floor(feet / CELL_FEET));
}

/** Коло на карті — квадрат 3×3 до 15 фт і 5×5 від 20 фт, щоб площа читалася на сітці. */
export function areaRadiusCells(feet: number): number {
  return Math.max(1, Math.floor(feet / 10));
}

export function apexOf(origin: GridPoint[], aim: GridPoint): GridPoint {
  return origin.reduce((best, c) => (cellDistance(c, aim) < cellDistance(best, aim) ? c : best), origin[0]);
}

function circleCells(r: number, aim: GridPoint): GridPoint[] {
  const out: GridPoint[] = [];

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) out.push({ x: aim.x + dx, y: aim.y + dy });
  }

  return out;
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

function lineCells(map: BattleMapConfig, r: number, apex: GridPoint, aim: GridPoint): GridPoint[] {
  const vx = aim.x - apex.x;

  const vy = aim.y - apex.y;

  const len = Math.max(Math.abs(vx), Math.abs(vy));

  if (len === 0) return [];

  const end = { x: apex.x + Math.round((vx * r) / len), y: apex.y + Math.round((vy * r) / len) };

  const out: GridPoint[] = [];

  for (const c of cellLine(apex, end).slice(1)) {
    if (!inBounds(map, c)) break;

    if (isPlayable(map, c)) out.push(c);
  }

  return out;
}

export function templateCells(map: BattleMapConfig, template: SpellTemplate, origin: GridPoint[], aim: GridPoint): string[] {
  const r = feetToCells(template.size);

  const own = new Set(origin.map(cellKey));

  let raw: GridPoint[];

  if (template.shape === "circle") raw = circleCells(areaRadiusCells(template.size), aim);
  else if (template.shape === "cube") raw = cubeCells(r, aim);
  else if (origin.length === 0) raw = [];
  else {
    const apex = apexOf(origin, aim);

    raw = template.shape === "cone" ? coneCells(r, apex, aim) : lineCells(map, r, apex, aim);

    raw = raw.filter((c) => !own.has(cellKey(c)));
  }

  return [...new Set(raw.filter((c) => isPlayable(map, c)).map(cellKey))];
}

export function participantsInCells(participants: BattleParticipant[], cells: string[], from: GridPoint): BattleParticipant[] {
  const set = new Set(cells);

  return participants
    .filter((p) => isActive(p) && isOnMap(p) && cellsOf(p).some((c) => set.has(cellKey(c))))
    .map((p, i) => ({ p, i, d: footprintDistance([from], cellsOf(p)) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.p);
}

const centered = (t: SpellTemplate) => t.shape === "circle" || t.shape === "cube";

/** Клітинка шаблону, найближча до його центроїда. */
export function areaCentre(cells: string[]): GridPoint | undefined {
  const points = cells.map(parseCellKey);

  if (points.length === 0) return undefined;

  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;

  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  return points.reduce((best, p) => (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? p : best));
}

/** Центр для FX: у кола й куба — точка прицілу, у конуса й лінії вона лише напрямок. */
export function templateCentre(template: SpellTemplate, aim: GridPoint, cells: string[]): GridPoint | undefined {
  return centered(template) ? aim : areaCentre(cells);
}

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
