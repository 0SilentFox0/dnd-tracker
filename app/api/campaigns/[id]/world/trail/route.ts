import { trailHandler } from '@/lib/server/world/trail-handlers';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
    const { id } = await params;

    return trailHandler(req, id);
}
