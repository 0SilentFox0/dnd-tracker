import { reorderSoundsHandler } from '../sound-handlers';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return reorderSoundsHandler(req, (await params).id);
}
