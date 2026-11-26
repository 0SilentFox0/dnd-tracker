import { z } from 'zod';

import {
    BLOCKED_MATERIALS,
    isFloorCode,
    OPENING_MATERIALS,
    WALL_MATERIALS,
} from '@/lib/constants/map-art/materials';
import { isStampId } from '@/lib/constants/map-art/stamps';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { battleMapSaveSchema } from '@/lib/schemas/battle-maps';
import { edgeKeySchema } from '@/lib/schemas/battles';
import { edgeOnGrid } from '@/lib/utils/battle/grid/edge-keys';
import { gridOf, inBounds } from '@/lib/utils/battle/grid/geometry';
import { mapSize, unitOf } from '@/lib/utils/battle/grid/layout';
import { hasPlayableArea } from '@/lib/utils/battle/grid/map-editor';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import { stampCells } from '@/lib/utils/battle/map-art/stamp-cells';
import { CHUNK_SIDE } from '@/lib/utils/battle/map-storage/chunk-key';
import { decodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { MapArtScene } from '@/types/battle-map';

export const MAP_ART_LIMITS = {
    lights: 64,
    floorChunkChars: 2_000,
    stamps: 2000,
    bodyBytes: 2 * 1024 * 1024,
} as const;

const ids = (list: readonly { id: string }[]) =>
    z.enum(list.map((m) => m.id) as [string, ...string[]]);

const cellKey = z.string().regex(/^\d+:\d+$/);

const openingSchema = z
    .object({
        kind: z.enum(['door', 'window', 'bars', 'portcullis']),
        material: z.string(),
        locked: z.boolean().optional(),
        open: z.boolean().optional(),
    })
    .superRefine((o, ctx) => {
        const known = OPENING_MATERIALS.some(
            (m) => m.id === o.material && m.kind === o.kind
        );

        if (!known)
            ctx.addIssue({
                code: 'custom',
                message: 'maps.editor.art.validation.badFloor',
                path: ['material'],
            });

        if (o.kind !== 'door' && (o.locked !== undefined || o.open !== undefined))
            ctx.addIssue({
                code: 'custom',
                message: 'maps.editor.art.validation.badEdge',
                path: ['kind'],
            });
    });

const lightSchema = z.object({
    id: z.string().min(1).max(40),
    x: z.number().finite(),
    y: z.number().finite(),
    radius: z.number().min(10).max(unitOf(30)),
    color: z.string().regex(/^#[0-9a-f]{6}$/),
    intensity: z.number().min(0).max(1),
});

const stampSchema = z.object({
    id: z.string().min(1).max(40),
    asset: z.string().max(60),
    x: z.number().finite(),
    y: z.number().finite(),
    rot: z.number().min(0).lt(360),
    scale: z.number().min(0.25).max(4),
    flip: z.boolean(),
    z: z.number().int().min(-1000).max(1000),
});

const capped = <T extends z.ZodTypeAny>(schema: T, max: number) =>
    schema.refine((r) => Object.keys(r as object).length <= max);

export const mapArtSceneSchema = z.object({
    v: z.literal(1),
    floors: z.record(
        z.string().regex(/^\d+:\d+$/),
        z
            .string()
            .max(MAP_ART_LIMITS.floorChunkChars)
            .startsWith('r1:')
    ),
    walls: capped(
        z.record(edgeKeySchema, ids(WALL_MATERIALS)),
        MAP_LIMITS.libraryMaxEdges
    ),
    openings: z.record(edgeKeySchema, openingSchema),
    blocked: capped(
        z.record(cellKey, ids(BLOCKED_MATERIALS).nullable()),
        MAP_LIMITS.maxTerrainCells
    ),
    lights: z.array(lightSchema).max(MAP_ART_LIMITS.lights),
    ambient: z.object({
        tint: z.string().regex(/^#[0-9a-f]{6}$/),
        darkness: z.number().min(0).max(0.9),
    }),
    stamps: z.array(stampSchema).max(MAP_ART_LIMITS.stamps),
}) as unknown as z.ZodType<MapArtScene>;

const PREFIX = 'maps.editor.art.validation.';

const refineSceneForMap = (
    input: { save: z.infer<typeof battleMapSaveSchema>; scene: MapArtScene },
    ctx: z.RefinementCtx
) => {
    const { map } = input.save;

    const { scene } = input;

    const grid = gridOf(map);

    const issue = (code: string, path: (string | number)[]) =>
        ctx.addIssue({ code: 'custom', message: `${PREFIX}${code}`, path });

    const edgeOk = (key: string) => {
        if (!edgeOnGrid(grid, key)) return false;

        const { a, b } = parseEdgeKey(key);

        return inBounds(map, a) && inBounds(map, b);
    };

    for (const key of Object.keys(scene.walls))
        if (!edgeOk(key)) issue('badEdge', ['scene', 'walls', key]);

    const openings = Object.keys(scene.openings);

    for (const key of openings) {
        if (!edgeOk(key)) issue('badEdge', ['scene', 'openings', key]);

        if (!(key in scene.walls))
            issue('openingWithoutWall', ['scene', 'openings', key]);
    }

    const doors = openings.filter((k) => scene.openings[k].kind === 'door');

    if (doors.length > MAP_LIMITS.doorsMax)
        issue('tooManyDoors', ['scene', 'openings']);

    for (const key of Object.keys(scene.blocked)) {
        const [x, y] = key.split(':').map(Number);

        if (!inBounds(map, { x, y })) issue('outOfBounds', ['scene', 'blocked', key]);
    }

    const size = mapSize(map, grid);

    const seen = new Set<string>();

    scene.stamps.forEach((s, i) => {
        const at = ['scene', 'stamps', i];

        if (!isStampId(s.asset)) issue('unknownStamp', [...at, 'asset']);

        if (seen.has(s.id)) issue('duplicateStamp', [...at, 'id']);

        seen.add(s.id);

        if (s.x < 0 || s.y < 0 || s.x > size.width || s.y > size.height)
            issue('outOfBounds', at);
    });

    const blocked = new Set([
        ...Object.keys(scene.blocked),
        ...stampCells(scene.stamps, map).blocked,
    ]);

    if (blocked.size > MAP_LIMITS.maxTerrainCells)
        issue('tooManyBlocked', ['scene', 'stamps']);

    if (
        !hasPlayableArea({
            cols: map.cols,
            rows: map.rows,
            blocked: [...blocked],
            terrain: map.terrain,
        })
    )
        ctx.addIssue({
            code: 'custom',
            message: 'battleSetup.validation.playableAreaTooSmall',
            path: ['scene', 'blocked'],
        });

    for (const [key, data] of Object.entries(scene.floors)) {
        const [cx, cy] = key.split(':').map(Number);

        let cells: Uint16Array;

        try {
            cells = decodeTileChunk(data);
        } catch {
            issue('badFloor', ['scene', 'floors', key]);

            continue;
        }

        const path = ['scene', 'floors', key];

        for (let i = 0; i < cells.length; i++) {
            const code = cells[i];

            if (code === 0) continue;

            if (!isFloorCode(code)) {
                issue('badFloor', path);

                break;
            }

            const x = cx * CHUNK_SIDE + (i % CHUNK_SIDE);

            const y = cy * CHUNK_SIDE + Math.floor(i / CHUNK_SIDE);

            if (!inBounds(map, { x, y })) {
                issue('outOfBounds', path);

                break;
            }
        }
    }
};

export const mapArtSaveSchema = z
    .object({
        save: battleMapSaveSchema,
        scene: mapArtSceneSchema,
        expectedSceneVersion: z.number().int().min(0),
        bakedUrl: z
            .string()
            .url()
            .max(2000)
            .refine((v) => v.startsWith('https://'))
            .optional(),
    })
    .superRefine(refineSceneForMap);

export type MapArtSaveInput = z.infer<typeof mapArtSaveSchema>;
