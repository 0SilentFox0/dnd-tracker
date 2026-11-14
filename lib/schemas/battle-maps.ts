import { z } from 'zod';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { battleMapObject, edgeKeySchema, mapSide } from '@/lib/schemas/battles';
import { inBounds } from '@/lib/utils/battle/grid/geometry';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';

const STORAGE_BACKGROUND =
    /^(https:\/\/\S+|\/battle-maps\/[\w.-]+\.(webp|jpg|png))$/;

const side = mapSide(MAP_LIMITS.tileMaxSide);

const headerSchema = battleMapObject.omit({ walls: true, bars: true }).extend({
    cols: side,
    rows: side,
    background: z
        .string()
        .max(2000)
        .regex(STORAGE_BACKGROUND, 'battleSetup.validation.background')
        .nullable(),
});

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
    })
    .superRefine((m, ctx) => {
        const { cols, rows, background } = m.map;

        if (
            background !== null &&
            (cols > MAP_LIMITS.photoMaxSide || rows > MAP_LIMITS.photoMaxSide)
        ) {
            ctx.addIssue({
                code: 'custom',
                message: 'battleSetup.validation.photoMapTooLarge',
                path: ['map', 'cols'],
            });
        }

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
    });

export const battleMapCloneSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
});

export type BattleMapInput = z.infer<typeof battleMapInputSchema>;
