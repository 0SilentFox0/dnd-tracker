import { z } from 'zod';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import {
    battleMapObject,
    edgeKeySchema,
    mapBackgroundSchema,
    mapSide,
} from '@/lib/schemas/battles';
import { edgeOnGrid } from '@/lib/utils/battle/grid/edge-keys';
import { gridOf, inBounds } from '@/lib/utils/battle/grid/geometry';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import type { GridKind } from '@/types/battle-grid';

const side = mapSide(MAP_LIMITS.tileMaxSide);

const headerSchema = battleMapObject.omit({ walls: true, bars: true }).extend({
    cols: side,
    rows: side,
    background: mapBackgroundSchema,
    spellZones: z.never().optional(),
});

type Terrain = NonNullable<z.infer<typeof headerSchema>['terrain']>;

const staticTerrainOnly = (terrain: Terrain | undefined) =>
    Object.values(terrain ?? {}).every(
        ({ zoneId, untilRound, damage }) =>
            zoneId === undefined &&
            untilRound === undefined &&
            damage?.spellId === undefined &&
            damage?.casterId === undefined &&
            damage?.concentrationOf === undefined
    );

const edges = z.array(edgeKeySchema).max(MAP_LIMITS.libraryMaxEdges);

const edgesValid = (
    list: readonly string[],
    map: { cols: number; rows: number },
    grid: GridKind
) => {
    const seen = new Set<string>();

    return list.every((edge) => {
        if (seen.has(edge)) return false;

        seen.add(edge);

        const { a, b } = parseEdgeKey(edge);

        return inBounds(map, a) && inBounds(map, b) && edgeOnGrid(grid, edge);
    });
};

const battleMapBase = z.object({
    name: z.string().trim().min(1).max(80),
    map: headerSchema,
    walls: edges.default([]),
    bars: edges.default([]),
    expectedVersion: z.number().int().min(1).optional(),
});

const refineBattleMap = (
    m: z.infer<typeof battleMapBase>,
    ctx: z.RefinementCtx
) => {
    const grid = gridOf(m.map);

    if (grid === 'hex' && m.map.maze)
        ctx.addIssue({
            code: 'custom',
            message: 'battleSetup.validation.hexSquareOnly',
            path: ['map', 'gridType'],
        });

    if (!staticTerrainOnly(m.map.terrain))
        ctx.addIssue({
            code: 'custom',
            message: 'battleSetup.validation.libraryTerrainRuntime',
            path: ['map', 'terrain'],
        });

    const badEdges = (path: 'walls' | 'bars') =>
        ctx.addIssue({
            code: 'custom',
            message: 'battleSetup.validation.badEdges',
            path: [path],
        });

    const walls = new Set(m.walls);

    if (!edgesValid(m.walls, m.map, grid)) badEdges('walls');

    if (!edgesValid(m.bars, m.map, grid) || m.bars.some((e) => walls.has(e)))
        badEdges('bars');

    const solid = new Set([...m.walls, ...m.bars]);

    const doors = Object.keys(m.map.doors ?? {});

    if (!edgesValid(doors, m.map, grid) || doors.some((e) => solid.has(e)))
        ctx.addIssue({
            code: 'custom',
            message: 'battleSetup.validation.doorOnWall',
            path: ['map', 'doors'],
        });
};

export const battleMapInputSchema = battleMapBase.superRefine(refineBattleMap);

export const battleMapSaveSchema = battleMapBase
    .extend({ expectedVersion: z.number().int().min(1) })
    .superRefine(refineBattleMap);

export const battleMapCloneSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
});

export type BattleMapInput = z.infer<typeof battleMapInputSchema>;

export type BattleMapSaveInput = z.infer<typeof battleMapSaveSchema>;

const tilePatchSchema = z.object({
    layer: z.literal('objects'),
    cx: z.number().int().nonnegative(),
    cy: z.number().int().nonnegative(),
    data: z.string().max(2_000).nullable(),
});

export const battleMapTilePatchSchema = z
    .object({
        expectedVersion: z.number().int().min(1),
        patches: z.array(tilePatchSchema).min(1).max(512),
    })
    .superRefine(({ patches }, ctx) => {
        const seen = new Set<string>();

        for (const patch of patches) {
            const key = `${patch.layer}:${patch.cx}:${patch.cy}`;

            if (seen.has(key))
                ctx.addIssue({
                    code: 'custom',
                    message: 'battleMap.validation.duplicateTilePatch',
                    path: ['patches'],
                });

            seen.add(key);
        }
    });

export type BattleMapTilePatchInput = z.infer<typeof battleMapTilePatchSchema>;
