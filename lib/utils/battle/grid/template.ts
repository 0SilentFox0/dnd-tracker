import { cellFeetOf } from './cell-feet';
import { cellsConnected, edgeBlocks, wallsOf } from './edges';
import {
    cellKey,
    cellLine,
    closestCell,
    footprintDistance,
    gridOf,
    isPlayable,
    parseCellKey,
} from './geometry';
import {
    CUBE_DIRS,
    cubeRound,
    fromCube,
    hexCenter,
    hexDisk,
    hexDistance,
    toCube,
} from './hex';
import { cellsOf, isOnMap } from './occupancy';

import { isTargetable } from '@/lib/utils/abilities/engine/core/participants';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapConfig,
    GridKind,
    GridPoint,
    SpellTemplate,
} from '@/types/battle-grid';

const CONE_TAN = 0.5;

const EPS = 1e-9;

const HEX_CONE_TAN = Math.tan(Math.PI / 6);

export function feetToCells(feet: number, rules: Ruleset): number {
    return Math.max(1, Math.floor(feet / cellFeetOf(rules)));
}

export function areaRadiusCells(feet: number): number {
    return Math.max(1, Math.floor(feet / 10));
}

export function apexOf(
    origin: GridPoint[],
    aim: GridPoint,
    grid: GridKind
): GridPoint {
    return closestCell(origin, [aim], grid);
}

function circleCells(
    r: number,
    aim: GridPoint,
    grid: GridKind
): GridPoint[] {
    if (grid === 'hex') return hexDisk(aim, r);

    const out: GridPoint[] = [];

    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++)
            out.push({ x: aim.x + dx, y: aim.y + dy });
    }

    return out;
}

function exactCircleCells(
    r: number,
    aim: GridPoint,
    grid: GridKind
): GridPoint[] {
    if (grid === 'hex') return hexDisk(aim, r);

    const out: GridPoint[] = [];

    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r)
                out.push({ x: aim.x + dx, y: aim.y + dy });
        }
    }

    return out;
}

function emanationCells(
    r: number,
    origin: GridPoint[],
    grid: GridKind
): GridPoint[] {
    return origin.flatMap((o) => circleCells(r, o, grid));
}

function cubeCells(r: number, aim: GridPoint, grid: GridKind): GridPoint[] {
    if (grid === 'hex') return hexDisk(aim, Math.floor(r / 2));

    const x0 = aim.x - Math.floor((r - 1) / 2);

    const y0 = aim.y - Math.floor((r - 1) / 2);

    const out: GridPoint[] = [];

    for (let y = y0; y < y0 + r; y++) {
        for (let x = x0; x < x0 + r; x++) out.push({ x, y });
    }

    return out;
}

function crossCells(r: number, aim: GridPoint, grid: GridKind): GridPoint[] {
    const out: GridPoint[] = [aim];

    if (grid === 'hex') {
        const c = toCube(aim);

        for (const d of CUBE_DIRS)
            for (let i = 1; i <= r; i++)
                out.push(
                    fromCube({ x: c.x + d.x * i, y: c.y + d.y * i, z: c.z + d.z * i })
                );

        return out;
    }

    for (let d = 1; d <= r; d++)
        out.push(
            { x: aim.x + d, y: aim.y },
            { x: aim.x - d, y: aim.y },
            { x: aim.x, y: aim.y + d },
            { x: aim.x, y: aim.y - d }
        );

    return out;
}

function hexConeCells(r: number, apex: GridPoint, aim: GridPoint): GridPoint[] {
    const o = hexCenter(apex);

    const t = hexCenter(aim);

    const ax = t.x - o.x;

    const ay = t.y - o.y;

    if (ax === 0 && ay === 0) return [];

    return hexDisk(apex, r).filter((c) => {
        if (c.x === apex.x && c.y === apex.y) return false;

        const p = hexCenter(c);

        const dx = p.x - o.x;

        const dy = p.y - o.y;

        const dot = dx * ax + dy * ay;

        const cross = Math.abs(dx * ay - dy * ax);

        return dot > 0 && cross <= HEX_CONE_TAN * dot + EPS;
    });
}

function coneCells(
    r: number,
    apex: GridPoint,
    aim: GridPoint,
    grid: GridKind
): GridPoint[] {
    if (grid === 'hex') return hexConeCells(r, apex, aim);

    const ax = aim.x - apex.x;

    const ay = aim.y - apex.y;

    const out: GridPoint[] = [];

    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx === 0 && dy === 0) continue;

            const dot = dx * ax + dy * ay;

            const cross = Math.abs(dx * ay - dy * ax);

            if (dot > 0 && cross <= CONE_TAN * dot + EPS)
                out.push({ x: apex.x + dx, y: apex.y + dy });
        }
    }

    return out;
}

function hexRayCells(
    map: BattleMapConfig,
    from: GridPoint,
    through: GridPoint,
    opts: { maxCells: number; stopAtTarget?: boolean }
): GridPoint[] {
    const len = hexDistance(from, through);

    if (len === 0) return [];

    const a = toCube(from);

    const b = toCube(through);

    const k = opts.maxCells / len;

    const end = opts.stopAtTarget
        ? through
        : fromCube(
              cubeRound({
                  x: a.x + (b.x - a.x) * k,
                  y: a.y + (b.y - a.y) * k,
                  z: a.z + (b.z - a.z) * k,
              })
          );

    const out: GridPoint[] = [];

    let prev = from;

    for (const c of cellLine(from, end, 'hex').slice(1, opts.maxCells + 1)) {
        if (!isPlayable(map, c) || edgeBlocks(map, prev, c, 'fire')) break;

        prev = c;

        out.push(c);
    }

    return out;
}

export function rayCells(
    map: BattleMapConfig,
    from: GridPoint,
    through: GridPoint,
    opts: { maxCells: number; stopAtTarget?: boolean }
): GridPoint[] {
    const grid = gridOf(map);

    if (grid === 'hex') return hexRayCells(map, from, through, opts);

    const vx = through.x - from.x;

    const vy = through.y - from.y;

    const len = Math.max(Math.abs(vx), Math.abs(vy));

    if (len === 0) return [];

    const end = opts.stopAtTarget
        ? through
        : {
              x: from.x + Math.round((vx * opts.maxCells) / len),
              y: from.y + Math.round((vy * opts.maxCells) / len),
          };

    const out: GridPoint[] = [];

    let prev = from;

    for (const c of cellLine(from, end, grid).slice(1, opts.maxCells + 1)) {
        if (!isPlayable(map, c) || edgeBlocks(map, prev, c, 'fire')) break;

        prev = c;

        out.push(c);
    }

    return out;
}

export function templateCells(
    map: BattleMapConfig,
    template: SpellTemplate,
    origin: GridPoint[],
    aim: GridPoint,
    rules: Ruleset
): string[] {
    const grid = gridOf(map);

    const r = feetToCells(template.size, rules);

    const cellFeet = cellFeetOf(rules);

    const own = new Set(origin.map(cellKey));

    let raw: GridPoint[];

    if (template.shape === 'circle')
        raw = (
            template.exact
                ? exactCircleCells(Math.round(template.size / cellFeet), aim, grid)
                : circleCells(areaRadiusCells(template.size), aim, grid)
        ).filter((c) => !template.hollow || cellKey(c) !== cellKey(aim));
    else if (template.shape === 'emanation')
        raw = emanationCells(
            Math.round(template.size / cellFeet),
            origin,
            grid
        ).filter((c) => !own.has(cellKey(c)));
    else if (template.shape === 'cube') raw = cubeCells(r, aim, grid);
    else if (template.shape === 'cross') raw = crossCells(r, aim, grid);
    else if (origin.length === 0) raw = [];
    else {
        const apex = apexOf(origin, aim, grid);

        raw =
            template.shape === 'cone'
                ? coneCells(r, apex, aim, grid)
                : rayCells(map, apex, aim, { maxCells: r });

        raw = raw.filter((c) => !own.has(cellKey(c)));
    }

    const playable = raw.filter((c) => isPlayable(map, c));

    const sources =
        template.shape === 'emanation'
            ? origin
            : [aimSource(template, origin, aim, grid)];

    const visible = wallsOf(map).size
        ? playable.filter(
              (c) =>
                  template.shape === 'line' ||
                  cellsConnected(map, 'fire', sources, [c])
          )
        : playable;

    return [...new Set(visible.map(cellKey))];
}

function aimSource(
    template: SpellTemplate,
    origin: GridPoint[],
    aim: GridPoint,
    grid: GridKind
): GridPoint {
    if (template.shape === 'cone' && origin.length)
        return apexOf(origin, aim, grid);

    return aim;
}

export function participantsInCells(
    participants: BattleParticipant[],
    cells: string[],
    from: GridPoint,
    grid: GridKind
): BattleParticipant[] {
    const set = new Set(cells);

    return participants
        .filter(
            (p) =>
                isTargetable(p) &&
                isOnMap(p) &&
                cellsOf(p, grid).some((c) => set.has(cellKey(c)))
        )
        .map((p, i) => ({
            p,
            i,
            d: footprintDistance([from], cellsOf(p, grid), grid),
        }))
        .sort((a, b) => a.d - b.d || a.i - b.i)
        .map((x) => x.p);
}

export const isCenteredTemplate = (t: SpellTemplate) =>
    t.shape === 'circle' || t.shape === 'cube' || t.shape === 'cross';

export function areaCentre(
    cells: string[],
    grid: GridKind
): GridPoint | undefined {
    const points = cells.map(parseCellKey);

    if (points.length === 0) return undefined;

    if (grid === 'hex') return hexAreaCentre(points);

    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;

    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    return points.reduce((best, p) =>
        Math.hypot(p.x - cx, p.y - cy) < Math.hypot(best.x - cx, best.y - cy)
            ? p
            : best
    );
}

function hexAreaCentre(points: GridPoint[]): GridPoint {
    const centres = points.map(hexCenter);

    const cx = centres.reduce((sum, p) => sum + p.x, 0) / points.length;

    const cy = centres.reduce((sum, p) => sum + p.y, 0) / points.length;

    const dist = (i: number) =>
        Math.hypot(centres[i].x - cx, centres[i].y - cy);

    let best = 0;

    for (let i = 1; i < points.length; i++) if (dist(i) < dist(best)) best = i;

    return points[best];
}

export function templateCentre(
    template: SpellTemplate,
    aim: GridPoint,
    cells: string[],
    grid: GridKind
): GridPoint | undefined {
    return isCenteredTemplate(template) ? aim : areaCentre(cells, grid);
}

export function templateAimAllowed(
    origin: GridPoint[],
    template: SpellTemplate,
    aim: GridPoint,
    rangeFeet: number | undefined,
    rules: Ruleset,
    grid: GridKind
): boolean {
    return (
        !isCenteredTemplate(template) ||
        aimInRange(origin, aim, rangeFeet, rules, grid)
    );
}

export function templateArea(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    caster: BattleParticipant,
    template: SpellTemplate,
    aim: GridPoint,
    rules: Ruleset
): { cells: string[]; targets: BattleParticipant[] } {
    const grid = gridOf(map);

    const origin = cellsOf(caster, grid);

    const cells = templateCells(map, template, origin, aim, rules);

    return {
        cells,
        targets: participantsInCells(
            participants,
            cells,
            isCenteredTemplate(template) || origin.length === 0
                ? aim
                : apexOf(origin, aim, grid),
            grid
        ),
    };
}

export function aimInRange(
    origin: GridPoint[],
    aim: GridPoint,
    rangeFeet: number | undefined,
    rules: Ruleset,
    grid: GridKind
): boolean {
    if (rangeFeet === undefined) return true;

    return footprintDistance(origin, [aim], grid) <= feetToCells(rangeFeet, rules);
}
