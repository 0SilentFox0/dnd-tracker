import { z } from 'zod';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { battleMapObject, edgeKeySchema } from '@/lib/schemas/battles';
import { inBounds } from '@/lib/utils/battle/grid/geometry';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';

const STORAGE_BACKGROUND =
    /^(https:\/\/\S+|\/battle-maps\/[\w.-]+\.(webp|jpg|png))$/;

const side = z
    .number()
    .int()
    .min(MAP_LIMITS.minSide)
    .max(MAP_LIMITS.tileMaxSide);

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
                message: 'battleSetup.validation.badEdges',
                path: ['map', 'cols'],
            });
        }

        const wallSet = new Set<string>();

        for (const key of ['walls', 'bars'] as const) {
            const seen = new Set<string>();

            for (const edge of m[key]) {
                const { a, b } = parseEdgeKey(edge);

                const bad =
                    seen.has(edge) ||
                    !inBounds(m.map, a) ||
                    !inBounds(m.map, b) ||
                    (key === 'bars' && wallSet.has(edge));

                if (bad) {
                    ctx.addIssue({
                        code: 'custom',
                        message: 'battleSetup.validation.badEdges',
                        path: [key],
                    });

                    break;
                }

                seen.add(edge);

                if (key === 'walls') wallSet.add(edge);
            }
        }
    });

export const battleMapCloneSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
});

export type BattleMapInput = z.infer<typeof battleMapInputSchema>;
