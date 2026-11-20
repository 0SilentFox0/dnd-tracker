import {
    layerCreateHandler,
    layersListHandler,
} from '@/lib/server/world/layer-handlers';

type Params = { params: Promise<{ id: string; mapId: string }> };

export async function GET(_req: Request, { params }: Params) {
    const { id, mapId } = await params;

    return layersListHandler(id, mapId);
}

export async function POST(req: Request, { params }: Params) {
    const { id, mapId } = await params;

    return layerCreateHandler(req, id, mapId);
}
