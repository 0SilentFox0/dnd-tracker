import { setHiddenBuiltinHandler } from '../sound-handlers';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return setHiddenBuiltinHandler(req, (await params).id);
}
