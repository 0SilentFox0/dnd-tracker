import { Prisma } from '@prisma/client';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    MAX_WORLD_SESSIONS,
    WORLD_SESSION_COLORS,
} from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import type { CreateSessionData, WorldSession } from '@/types/world';

type WorldSessionRow = {
    id: string;
    name: string;
    description: string | null;
    color: string;
    startedAt: Date;
    endedAt: Date | null;
};

export class WorldSessionError extends Error {
    constructor(readonly code: string) {
        super(code);
    }
}

export const toWorldSession = (row: WorldSessionRow): WorldSession => ({
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    active: row.endedAt === null,
});

export const listSessions = async (
    campaignId: string
): Promise<WorldSession[]> =>
    (
        await prisma.worldSession.findMany({
            where: { campaignId },
            orderBy: { startedAt: 'desc' },
        })
    ).map(toWorldSession);

export const activeSessionId = async (
    campaignId: string
): Promise<string | null> =>
    (
        await prisma.worldSession.findFirst({
            where: { campaignId, endedAt: null },
            select: { id: true },
        })
    )?.id ?? null;

export async function startSession(
    campaignId: string,
    data: CreateSessionData
): Promise<WorldSession> {
    try {
        const row = await prisma.$transaction(async (tx) => {
            const count = await tx.worldSession.count({
                where: { campaignId },
            });

            if (count >= MAX_WORLD_SESSIONS)
                throw new WorldSessionError(API_ERRORS.WORLD_SESSION_LIMIT);

            await tx.worldSession.updateMany({
                where: { campaignId, endedAt: null },
                data: { endedAt: new Date() },
            });

            return tx.worldSession.create({
                data: {
                    campaignId,
                    name: data.name,
                    description: data.description ?? null,
                    color:
                        data.color ??
                        WORLD_SESSION_COLORS[
                            count % WORLD_SESSION_COLORS.length
                        ],
                },
            });
        });

        return toWorldSession(row);
    } catch (e) {
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
        )
            throw new WorldSessionError(API_ERRORS.WORLD_SESSION_CONFLICT);

        throw e;
    }
}
