import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { createSessionSchema, updateSessionSchema } from '@/lib/schemas/world';
import {
    listSessions,
    startSession,
    toWorldSession,
    WorldSessionError,
} from '@/lib/server/world/session-store';
import { publishWorldChanged } from '@/lib/server/world/world-events';
import { errorResponse } from '@/lib/utils/api/api-response';
import { withDM } from '@/lib/utils/api/as-dm';
import { loadOwned } from '@/lib/utils/api/load-owned';
import { parseBody } from '@/lib/utils/api/parse-body';

const ownedSession = (campaignId: string, sessionId: string) =>
    loadOwned(
        prisma.worldSession.findUnique({ where: { id: sessionId } }),
        campaignId,
        API_ERRORS.WORLD_SESSION_NOT_FOUND
    );

export function sessionsListHandler(campaignId: string) {
    return withDM(campaignId, 'list world sessions', async () =>
        NextResponse.json(await listSessions(campaignId))
    );
}

export function sessionStartHandler(req: Request, campaignId: string) {
    return withDM(campaignId, 'start world session', async () => {
        const body = await parseBody(createSessionSchema, req);

        if (body instanceof NextResponse) return body;

        try {
            const created = await startSession(campaignId, body);

            publishWorldChanged(campaignId, null);

            return NextResponse.json(created, { status: 201 });
        } catch (e) {
            if (e instanceof WorldSessionError)
                return errorResponse(e.code, 409);

            throw e;
        }
    });
}

export function sessionPatchHandler(
    req: Request,
    campaignId: string,
    sessionId: string
) {
    return withDM(campaignId, 'update world session', async () => {
        const body = await parseBody(updateSessionSchema, req);

        if (body instanceof NextResponse) return body;

        const session = await ownedSession(campaignId, sessionId);

        if (session instanceof NextResponse) return session;

        const { end, ...fields } = body;

        const updated = await prisma.worldSession.update({
            where: { id: sessionId },
            data: {
                ...fields,
                ...(end && !session.endedAt ? { endedAt: new Date() } : {}),
            },
        });

        publishWorldChanged(campaignId, null);

        return NextResponse.json(toWorldSession(updated));
    });
}

export function sessionDeleteHandler(campaignId: string, sessionId: string) {
    return withDM(campaignId, 'delete world session', async () => {
        const session = await ownedSession(campaignId, sessionId);

        if (session instanceof NextResponse) return session;

        await prisma.worldSession.delete({ where: { id: sessionId } });

        publishWorldChanged(campaignId, null);

        return NextResponse.json({ ok: true });
    });
}
