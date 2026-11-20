import type { WorldLayer as LayerRow } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_WORLD_LAYERS } from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import type { LayerInput } from '@/lib/utils/world/player-view';
import type {
    CreateWorldLayerData,
    LayerVisibility,
    WorldLayer,
} from '@/types/world';

export class WorldLayerError extends Error {
    constructor(readonly code: string) {
        super(code);
    }
}

const toVisibility = (v: string): LayerVisibility =>
    v === 'all' || v === 'heroes' ? v : 'dm';

export async function listLayerInputs(mapId: string): Promise<LayerInput[]> {
    const rows = await prisma.worldLayer.findMany({
        where: { mapId },
        include: { heroes: { select: { characterId: true } } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        visibility: toVisibility(r.visibility),
        heroIds: r.heroes.map((h) => h.characterId),
        imageUrl: r.imageUrl,
        rect: { x: r.imgX, y: r.imgY, w: r.imgW, h: r.imgH },
        opacity: r.opacity,
    }));
}

const ORDER = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] as const;

export const toWorldLayer = (
    row: LayerRow & { heroes: { characterId: string }[] }
): WorldLayer => ({
    id: row.id,
    mapId: row.mapId,
    name: row.name,
    color: row.color,
    visibility: toVisibility(row.visibility),
    heroIds: row.heroes.map((h) => h.characterId),
    sortOrder: row.sortOrder,
    imageUrl: row.imageUrl,
    rect: { x: row.imgX, y: row.imgY, w: row.imgW, h: row.imgH },
    opacity: row.opacity,
});

export async function listDmLayers(mapId: string): Promise<WorldLayer[]> {
    const rows = await prisma.worldLayer.findMany({
        where: { mapId },
        include: { heroes: { select: { characterId: true } } },
        orderBy: [...ORDER],
    });

    return rows.map(toWorldLayer);
}

export async function createLayer(
    mapId: string,
    data: CreateWorldLayerData
): Promise<WorldLayer> {
    const { _count, _max } = await prisma.worldLayer.aggregate({
        where: { mapId },
        _count: true,
        _max: { sortOrder: true },
    });

    if (_count >= MAX_WORLD_LAYERS)
        throw new WorldLayerError(API_ERRORS.WORLD_LAYER_LIMIT);

    const row = await prisma.worldLayer.create({
        data: {
            mapId,
            name: data.name,
            color: data.color ?? null,
            visibility: 'dm',
            sortOrder: (_max.sortOrder ?? -1) + 1,
        },
        include: { heroes: { select: { characterId: true } } },
    });

    return toWorldLayer(row);
}
