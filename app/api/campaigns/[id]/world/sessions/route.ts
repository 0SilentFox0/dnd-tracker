import {
    sessionsListHandler,
    sessionStartHandler,
} from '@/lib/server/world/session-handlers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
    const { id } = await params;

    return sessionsListHandler(id);
}

export async function POST(req: Request, { params }: Params) {
    const { id } = await params;

    return sessionStartHandler(req, id);
}
