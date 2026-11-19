import {
    deleteLibrarySoundHandler,
    updateLibrarySoundHandler,
} from '../sound-library-handlers';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
    return updateLibrarySoundHandler(req, (await params).id);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    return deleteLibrarySoundHandler((await params).id);
}
