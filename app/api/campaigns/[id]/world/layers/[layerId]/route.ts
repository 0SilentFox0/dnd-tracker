import {
    layerDeleteHandler,
    layerPatchHandler,
} from '@/lib/server/world/layer-handlers';

type Params = { params: Promise<{ id: string; layerId: string }> };

export async function PATCH(req: Request, { params }: Params) {
    const { id, layerId } = await params;

    return layerPatchHandler(req, id, layerId);
}

export async function DELETE(req: Request, { params }: Params) {
    const { id, layerId } = await params;

    return layerDeleteHandler(req, id, layerId);
}
