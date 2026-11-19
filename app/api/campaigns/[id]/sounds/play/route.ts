import { playSoundHandler } from '../sound-handlers';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return playSoundHandler(req, (await params).id);
}
