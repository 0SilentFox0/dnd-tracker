import {
    enemyDeleteHandler,
    enemyPatchHandler,
} from '@/lib/server/world/enemy-handlers';

type Params = {
    params: Promise<{ id: string; mapId: string; enemyId: string }>;
};

export async function PATCH(req: Request, { params }: Params) {
    const { id, mapId, enemyId } = await params;

    return enemyPatchHandler(req, id, mapId, enemyId);
}

export async function DELETE(_req: Request, { params }: Params) {
    const { id, mapId, enemyId } = await params;

    return enemyDeleteHandler(id, mapId, enemyId);
}
