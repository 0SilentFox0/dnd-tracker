import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { questSchema, questTrackingSchema } from '@/lib/schemas/quests';
import { readQuests } from '@/lib/server/quests/store';
import { requireCampaignAccess, requireDM } from '@/lib/utils/api/api-auth';
import { errorResponse } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';

async function listQuestsImpl(campaignId: string) {
    const access = await requireCampaignAccess(campaignId, false, {
        allowDemo: true,
    });

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await readQuests(campaignId, access));
}

async function saveQuestImpl(
    req: Request,
    campaignId: string,
    questId?: string
) {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const data = await parseBody(questSchema, req);

    if (data instanceof NextResponse) return data;

    if (
        questId &&
        !(await prisma.quest.findFirst({
            where: { id: questId, campaignId },
            select: { id: true },
        }))
    )
        return errorResponse(API_ERRORS.NOT_FOUND, 404);

    if (
        data.markerId &&
        !(await prisma.worldMarker.findFirst({
            where: { id: data.markerId, map: { campaignId } },
            select: { id: true },
        }))
    )
        return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const { objectives, ...fields } = data;

    const create = objectives.map((o, sortOrder) => ({ ...o, sortOrder }));

    const row = questId
        ? await prisma.quest.update({
              where: { id: questId, campaignId },
              data: { ...fields, objectives: { deleteMany: {}, create } },
          })
        : await prisma.quest.create({
              data: { ...fields, campaignId, objectives: { create } },
          });

    return NextResponse.json({ id: row.id }, { status: questId ? 200 : 201 });
}

async function deleteQuestImpl(campaignId: string, questId: string) {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const result = await prisma.quest.deleteMany({
        where: { id: questId, campaignId },
    });

    return result.count
        ? NextResponse.json({ success: true })
        : errorResponse(API_ERRORS.NOT_FOUND, 404);
}

async function trackQuestImpl(
    req: Request,
    campaignId: string,
    questId: string
) {
    const access = await requireCampaignAccess(campaignId);

    if (access instanceof NextResponse) return access;

    const data = await parseBody(questTrackingSchema, req);

    if (data instanceof NextResponse) return data;

    const quest = await prisma.quest.findFirst({
        where: {
            id: questId,
            campaignId,
            ...(access.isDM ? {} : { visible: true }),
        },
        select: { id: true },
    });

    if (!quest) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const key = { questId, userId: access.userId };

    if (data.tracked)
        await prisma.questTracking.upsert({
            where: { questId_userId: key },
            create: key,
            update: {},
        });
    else await prisma.questTracking.deleteMany({ where: key });

    return NextResponse.json({ success: true });
}

async function guarded(run: () => Promise<NextResponse>) {
    try {
        return await run();
    } catch (error) {
        return handleApiError(error, { action: 'quest operation' });
    }
}

export const listQuestsHandler = (campaignId: string) =>
    guarded(() => listQuestsImpl(campaignId));
export const saveQuestHandler = (
    req: Request,
    campaignId: string,
    questId?: string
) => guarded(() => saveQuestImpl(req, campaignId, questId));
export const deleteQuestHandler = (campaignId: string, questId: string) =>
    guarded(() => deleteQuestImpl(campaignId, questId));
export const trackQuestHandler = (
    req: Request,
    campaignId: string,
    questId: string
) => guarded(() => trackQuestImpl(req, campaignId, questId));
