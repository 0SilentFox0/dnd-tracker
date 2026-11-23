import { trackQuestHandler } from '@/lib/server/quests/handlers';
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string; questId: string }> }
) {
    const { id, questId } = await params;

    return trackQuestHandler(req, id, questId);
}
