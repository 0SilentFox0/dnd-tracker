import {
    cellKey,
    inBounds,
    isPlayable,
    marginCells,
    type Margins,
} from './geometry';
import { applyTerrain, replaceTerrain } from './terrain';
import { parseEdgeKey } from './walls';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { maxEdgesFor } from '@/lib/utils/battle/map-storage/limits';
import { clamp } from '@/lib/utils/common/clamp';
import type {
    BattleMapConfig,
    DoorState,
    GridPoint,
    TerrainCell,
} from '@/types/battle';

const NO_MARGINS: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

function withBlocked(
    map: BattleMapConfig,
    keys: Iterable<string>
): BattleMapConfig {
    const blocked = [...new Set(keys)];

    const { blocked: _old, ...rest } = map;

    return blocked.length ? { ...rest, blocked } : rest;
}

function keepTerrain(
    map: BattleMapConfig,
    keep: (key: string) => boolean
): BattleMapConfig {
    if (!map.terrain) return map;

    return replaceTerrain(
        map,
        Object.fromEntries(Object.entries(map.terrain).filter(([k]) => keep(k)))
    );
}

export function marginsBlocked(
    cols: number,
    rows: number,
    m: Margins
): string[] {
    return marginCells({ cols, rows }, m);
}

export function inferMargins(map: BattleMapConfig): Margins {
    const blocked = new Set(map.blocked ?? []);

    if (!blocked.size) return { ...NO_MARGINS };

    const rowFull = (y: number) =>
        Array.from({ length: map.cols }, (_, x) => x).every((x) =>
            blocked.has(cellKey({ x, y }))
        );

    const colFull = (x: number) =>
        Array.from({ length: map.rows }, (_, y) => y).every((y) =>
            blocked.has(cellKey({ x, y }))
        );

    const run = (
        size: number,
        isFull: (i: number) => boolean,
        reverse: boolean
    ) => {
        let n = 0;

        while (n < size && isFull(reverse ? size - 1 - n : n)) n++;

        return n;
    };

    return {
        top: run(map.rows, rowFull, false),
        bottom: run(map.rows, rowFull, true),
        left: run(map.cols, colFull, false),
        right: run(map.cols, colFull, true),
    };
}

export type CellTool = 'blocked' | 'wall' | 'hazard' | 'erase';

export type EdgeTool = 'edge-wall' | 'edge-bars' | 'edge-door' | 'edge-erase';

export type SetupTool = CellTool | EdgeTool;

export function isEdgeTool(tool: SetupTool | null): tool is EdgeTool {
    return tool !== null && tool.startsWith('edge-');
}

export function paintCells(
    map: BattleMapConfig,
    cells: GridPoint[],
    tool: CellTool,
    hazard: Pick<TerrainCell, 'label' | 'damage'> = {}
): BattleMapConfig {
    const keys = cells.filter((p) => inBounds(map, p)).map(cellKey);

    const blocked = new Set(map.blocked ?? []);

    for (const key of keys) {
        if (tool === 'blocked') blocked.add(key);
        else blocked.delete(key);
    }

    const value =
        tool === 'wall'
            ? { kind: 'wall' as const }
            : tool === 'hazard'
              ? {
                    kind: 'hazard' as const,
                    ...(hazard.label && { label: hazard.label }),
                    ...(hazard.damage && { damage: hazard.damage }),
                }
              : null;

    return applyTerrain(withBlocked(map, blocked), keys, value);
}

export function resizeMap(
    map: BattleMapConfig,
    cols: number,
    rows: number
): BattleMapConfig {
    const next = { ...map, cols, rows };

    const inside = (k: string) => {
        const [x, y] = k.split(':').map(Number);

        return inBounds(next, { x, y });
    };

    const edgeInside = (edge: string) => {
        const { a, b } = parseEdgeKey(edge);

        return inBounds(next, a) && inBounds(next, b);
    };

    const resized = withEdges(
        keepTerrain(
            withBlocked(next, (map.blocked ?? []).filter(inside)),
            inside
        ),
        {
            walls: (map.walls ?? []).filter(edgeInside),
            bars: (map.bars ?? []).filter(edgeInside),
        }
    );

    return withDoors(
        resized,
        Object.fromEntries(
            Object.entries(map.doors ?? {}).filter(([edge]) => edgeInside(edge))
        )
    );
}

function withDoors(
    map: BattleMapConfig,
    doors: Record<string, DoorState>
): BattleMapConfig {
    const { doors: _doors, ...rest } = map;

    return Object.keys(doors).length ? { ...rest, doors } : rest;
}

export type EdgeOp =
    | 'add-walls'
    | 'add-bars'
    | 'remove-walls'
    | 'remove-bars'
    | 'erase';

function withEdges(
    map: BattleMapConfig,
    edges: { walls: Iterable<string>; bars: Iterable<string> }
): BattleMapConfig {
    const { walls: _walls, bars: _bars, ...rest } = map;

    const walls = [...new Set(edges.walls)];

    const bars = [...new Set(edges.bars)];

    return {
        ...rest,
        ...(walls.length ? { walls } : {}),
        ...(bars.length ? { bars } : {}),
    };
}

export type EdgePaint = { map: BattleMapConfig; overflow: boolean };

/** Додає/прибирає ребра; стіна й ґрати не живуть на одному ребрі — остання дія перемагає, понад ліміт — відкидається (`overflow`). */
export function paintEdges(
    map: BattleMapConfig,
    edges: string[],
    op: EdgeOp
): EdgePaint {
    const valid = edges.filter((edge) => {
        const { a, b } = parseEdgeKey(edge);

        return inBounds(map, a) && inBounds(map, b);
    });

    if (!valid.length) return { map, overflow: false };

    const walls = new Set(map.walls ?? []);

    const bars = new Set(map.bars ?? []);

    for (const edge of valid) {
        if (op === 'add-walls') {
            walls.add(edge);
            bars.delete(edge);
        } else if (op === 'add-bars') {
            bars.add(edge);
            walls.delete(edge);
        } else {
            if (op !== 'remove-bars') walls.delete(edge);

            if (op !== 'remove-walls') bars.delete(edge);
        }
    }

    const max = maxEdgesFor(map);

    const grows = (next: Set<string>, prev?: string[]) =>
        next.size > max && next.size > (prev?.length ?? 0);

    if (grows(walls, map.walls) || grows(bars, map.bars))
        return { map, overflow: true };

    const doors = { ...map.doors };

    for (const edge of valid) {
        if (op === 'erase' || walls.has(edge) || bars.has(edge))
            delete doors[edge];
    }

    return {
        map: withDoors(withEdges(map, { walls, bars }), doors),
        overflow: false,
    };
}

/** Ставить зачинені (за потреби замкнені) двері або прибирає їх; двері витісняють стіну й ґрати на ребрі, понад ліміт — відкидається (`overflow`). */
export function paintDoors(
    map: BattleMapConfig,
    edges: { add: string[]; remove: string[] },
    locked = false
): EdgePaint {
    const inside = (edge: string) => {
        const { a, b } = parseEdgeKey(edge);

        return inBounds(map, a) && inBounds(map, b);
    };

    const doors = { ...map.doors };

    for (const edge of edges.remove) delete doors[edge];

    for (const edge of edges.add.filter(inside))
        doors[edge] = { open: false, ...(locked && { locked }) };

    if (Object.keys(doors).length > MAP_LIMITS.doorsMax)
        return { map, overflow: true };

    const gone = new Set(edges.add.filter(inside));

    const walls = (map.walls ?? []).filter((e) => !gone.has(e));

    const bars = (map.bars ?? []).filter((e) => !gone.has(e));

    return {
        map: withDoors(withEdges(map, { walls, bars }), doors),
        overflow: false,
    };
}

export function applyMargins(
    map: BattleMapConfig,
    m: Margins,
    prev: Margins = inferMargins(map)
): BattleMapConfig {
    const old = new Set(marginsBlocked(map.cols, map.rows, prev));

    const drawn = (map.blocked ?? []).filter((k) => !old.has(k));

    const margin = new Set(marginsBlocked(map.cols, map.rows, m));

    return keepTerrain(
        withBlocked(map, [...margin, ...drawn]),
        (k) => !margin.has(k)
    );
}

export const MIN_SIDE = MAP_LIMITS.minSide;

export const MAX_SIDE = MAP_LIMITS.photoMaxSide;

export const MAX_MARGIN = 10;

export const MIN_PLAYABLE = 2;

const OPPOSITE: Record<keyof Margins, keyof Margins> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
};

export function marginLimit(
    map: Pick<BattleMapConfig, 'cols' | 'rows'>,
    margins: Margins,
    key: keyof Margins
): number {
    const span = key === 'top' || key === 'bottom' ? map.rows : map.cols;

    return clamp(span - margins[OPPOSITE[key]] - MIN_PLAYABLE, 0, MAX_MARGIN);
}

export function clampMargins(
    map: Pick<BattleMapConfig, 'cols' | 'rows'>,
    margins: Margins
): Margins {
    const next = { ...margins };

    for (const key of ['top', 'bottom', 'left', 'right'] as const)
        next[key] = clamp(next[key], 0, marginLimit(map, next, key));

    return next;
}

export function hasPlayableArea(
    map: Pick<BattleMapConfig, 'cols' | 'rows' | 'blocked' | 'terrain'>,
    side = MIN_PLAYABLE
): boolean {
    for (let y = 0; y + side <= map.rows; y++) {
        for (let x = 0; x + side <= map.cols; x++) {
            let ok = true;

            for (let dy = 0; dy < side && ok; dy++)
                for (let dx = 0; dx < side && ok; dx++)
                    ok = isPlayable(map, { x: x + dx, y: y + dy });

            if (ok) return true;
        }
    }

    return false;
}

const STORAGE_URL =
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/\S+$/;

export function isPreviewSafeBackground(
    src: string | null | undefined
): src is string {
    if (!src) return false;

    return (
        /^\/battle-maps\/[\w.-]+\.(webp|jpg|png)$/.test(src) ||
        /^data:image\/(png|jpeg|webp);base64,/.test(src) ||
        STORAGE_URL.test(src)
    );
}
