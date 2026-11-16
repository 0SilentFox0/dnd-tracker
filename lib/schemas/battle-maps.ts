import { z } from 'zod';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import {
    battleMapObject,
    edgeKeySchema,
    mapBackgroundSchema,
    mapSide,
} from '@/lib/schemas/battles';
import { inBounds } from '@/lib/utils/battle/grid/geometry';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import { TILE_LAYERS } from '@/lib/utils/battle/tiles/types';

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
    map: { cols: number; rows: number }
) => {
    const seen = new Set<string>();

    return list.every((edge) => {
        if (seen.has(edge)) return false;

        seen.add(edge);

        const { a, b } = parseEdgeKey(edge);

        return inBounds(map, a) && inBounds(map, b);
    });
};

export const battleMapInputSchema = z
    .object({
        name: z.string().trim().min(1).max(80),
        map: headerSchema,
        walls: edges.default([]),
        bars: edges.default([]),
        expectedVersion: z.number().int().min(1).optional(),
    })
    .superRefine((m, ctx) => {
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

        if (!edgesValid(m.walls, m.map)) badEdges('walls');

        if (!edgesValid(m.bars, m.map) || m.bars.some((e) => walls.has(e)))
            badEdges('bars');

        const solid = new Set([...m.walls, ...m.bars]);

        const doors = Object.keys(m.map.doors ?? {});

        if (!edgesValid(doors, m.map) || doors.some((e) => solid.has(e)))
            ctx.addIssue({
                code: 'custom',
                message: 'battleSetup.validation.doorOnWall',
                path: ['map', 'doors'],
            });
    });

export const battleMapCloneSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
});

export type BattleMapInput = z.infer<typeof battleMapInputSchema>;

const tileLayerSchema = z.enum(TILE_LAYERS);

const tilePatchSchema = z.object({
    layer: tileLayerSchema,
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
