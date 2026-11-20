import { enemyCreateHandler } from '@/lib/server/world/enemy-handlers';

type Params = { params: Promise<{ id: string; mapId: string }> };

export async function POST(req: Request, { params }: Params) {
    const { id, mapId } = await params;

    return enemyCreateHandler(req, id, mapId);
}
