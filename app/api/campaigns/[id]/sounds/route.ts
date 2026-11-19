import {
    createSoundHandler,
    listSoundsHandler,
} from './sound-handlers';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
    return listSoundsHandler(req, (await params).id);
}

export async function POST(req: Request, { params }: Ctx) {
    return createSoundHandler(req, (await params).id);
}
