import {
    sessionDeleteHandler,
    sessionPatchHandler,
} from '@/lib/server/world/session-handlers';

type Params = { params: Promise<{ id: string; sessionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
    const { id, sessionId } = await params;

    return sessionPatchHandler(req, id, sessionId);
}

export async function DELETE(_req: Request, { params }: Params) {
    const { id, sessionId } = await params;

    return sessionDeleteHandler(id, sessionId);
}
