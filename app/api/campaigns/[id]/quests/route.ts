import {
    listQuestsHandler,
    saveQuestHandler,
} from '@/lib/server/quests/handlers';

type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
    return listQuestsHandler((await params).id);
}
export async function POST(req: Request, { params }: Context) {
    return saveQuestHandler(req, (await params).id);
}
