import { prisma } from '@/lib/db';
import { questVisibleMarkers } from '@/lib/server/quests/visible-markers';
import { objectiveView } from '@/lib/utils/quests/privacy';
import type { QuestList } from '@/types/quests';

export const questScope = (campaignId: string, isDM: boolean) => ({
    campaignId,
    ...(isDM ? {} : { visible: true }),
});

const QUEST_ORDER = [{ createdAt: 'asc' }, { id: 'asc' }] as const;

export async function readQuests(
    campaignId: string,
    actor: { userId: string; isDM: boolean }
): Promise<QuestList> {
    const rows = await prisma.quest.findMany({
        where: questScope(campaignId, actor.isDM),
        include: {
            objectives: { orderBy: { sortOrder: 'asc' } },
            tracking: {
                where: { userId: actor.userId },
                select: { userId: true },
            },
            marker: { select: { id: true, mapId: true, name: true } },
        },
        orderBy: [...QUEST_ORDER],
    });

    const visibleMarkers = actor.isDM
        ? null
        : await questVisibleMarkers(
              campaignId,
              actor.userId,
              rows.flatMap((row) => (row.marker ? [row.marker.mapId] : []))
          );

    return {
        items: rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            kind: row.kind === 'side' ? 'side' : 'main',
            status:
                row.status === 'completed' || row.status === 'failed'
                    ? row.status
                    : 'active',
            visible: row.visible,
            notes: row.notes,
            reward: row.reward,
            tracked: row.tracking.length > 0,
            marker:
                row.marker && (actor.isDM || visibleMarkers?.has(row.marker.id))
                    ? row.marker
                    : null,
            objectives: row.objectives.map((o) => objectiveView(o, actor.isDM)),
        })),
    };
}

export async function readActiveQuestSummary(
    campaignId: string,
    isDM: boolean
) {
    const where = { ...questScope(campaignId, isDM), status: 'active' };

    const [count, items] = await Promise.all([
        prisma.quest.count({ where }),
        prisma.quest.findMany({
            where,
            orderBy: [...QUEST_ORDER],
            take: 3,
            select: { id: true, title: true },
        }),
    ]);

    return { count, items };
}
