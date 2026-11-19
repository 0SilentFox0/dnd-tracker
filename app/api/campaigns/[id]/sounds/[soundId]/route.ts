import { deleteSoundHandler, updateSoundHandler } from '../sound-handlers';

type Ctx = { params: Promise<{ id: string; soundId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
    const { id, soundId } = await params;

    return updateSoundHandler(req, id, soundId);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    const { id, soundId } = await params;

    return deleteSoundHandler(id, soundId);
}
