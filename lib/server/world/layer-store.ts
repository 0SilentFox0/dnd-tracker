import { prisma } from '@/lib/db';
import type { LayerInput } from '@/lib/utils/world/player-view';
import type { LayerVisibility } from '@/types/world';

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
