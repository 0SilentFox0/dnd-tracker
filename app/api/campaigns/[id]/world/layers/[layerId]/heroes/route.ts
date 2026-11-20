import { layerHeroesHandler } from '@/lib/server/world/layer-handlers';

type Params = { params: Promise<{ id: string; layerId: string }> };

export async function PUT(req: Request, { params }: Params) {
    const { id, layerId } = await params;

    return layerHeroesHandler(req, id, layerId);
}
