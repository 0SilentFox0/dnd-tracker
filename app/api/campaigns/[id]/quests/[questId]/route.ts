import {
    deleteQuestHandler,
    saveQuestHandler,
} from '@/lib/server/quests/handlers';
type Context = { params: Promise<{ id: string; questId: string }> };
export async function PUT(req: Request, { params }: Context) {
    const { id, questId } = await params;

    return saveQuestHandler(req, id, questId);
}
export async function DELETE(_req: Request, { params }: Context) {
    const { id, questId } = await params;

    return deleteQuestHandler(id, questId);
}
