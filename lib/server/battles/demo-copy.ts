import { Prisma } from '@prisma/client';

import 'server-only';
import { BattleStatus } from '@/lib/constants/battle';
import { isDemoKind } from '@/lib/constants/campaigns';
import { DAY_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';

const DEMO_COPY_TTL_DAYS = 1;

const copyOf = (campaignId: string, ownerUserId: string, source: string) =>
    prisma.battleScene.findFirst({
        where: { campaignId, ownerUserId, sourceBattleId: source },
        select: { id: true },
    });

/** Demo visitors never touch the shared template battle: each gets a private copy. */
export async function resolveDemoBattleId(args: {
    campaignId: string;
    battleId: string;
    userId: string;
}): Promise<string | null> {
    const { campaignId, battleId, userId } = args;

    const row = await prisma.battleScene.findFirst({
        where: { id: battleId, campaignId },
        select: {
            id: true,
            ownerUserId: true,
            sourceBattleId: true,
            campaign: { select: { kind: true } },
        },
    });

    if (!row || !isDemoKind(row.campaign.kind)) return null;

    if (row.ownerUserId === userId) return row.id;

    const templateId = row.sourceBattleId ?? row.id;

    const existing = await copyOf(campaignId, userId, templateId);

    if (existing) return existing.id;

    const template = await prisma.battleScene.findFirst({
        where: { id: templateId, campaignId, ownerUserId: null },
    });

    if (!template) return null;

    try {
        const created = await prisma.battleScene.create({
            data: {
                campaignId,
                name: template.name,
                description: template.description,
                status: BattleStatus.PREPARED,
                participants: template.participants ?? Prisma.JsonNull,
                map: template.map ?? Prisma.JsonNull,
                audio: template.audio ?? Prisma.JsonNull,
                rules: template.rules ?? Prisma.JsonNull,
                mapId: template.mapId,
                mapVersion: template.mapVersion,
                turnTimerSeconds: template.turnTimerSeconds,
                ownerUserId: userId,
                sourceBattleId: templateId,
            },
            select: { id: true },
        });

        return created.id;
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
        )
            return (await copyOf(campaignId, userId, templateId))?.id ?? null;

        throw error;
    }
}

export async function cleanupDemoBattleCopies(
    now = new Date()
): Promise<{ copies: number }> {
    const { count } = await prisma.battleScene.deleteMany({
        where: {
            ownerUserId: { not: null },
            createdAt: {
                lt: new Date(now.getTime() - DEMO_COPY_TTL_DAYS * DAY_MS),
            },
        },
    });

    return { copies: count };
}
