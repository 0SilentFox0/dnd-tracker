import {
    deletePresetHandler,
    updatePresetHandler,
} from '../sound-preset-handlers';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
    return updatePresetHandler(req, (await params).id);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    return deletePresetHandler((await params).id);
}
