import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_WORLD_ENEMY_PINS } from '@/lib/constants/world';
import { prisma } from '@/lib/db';
import { createEnemySchema, updateEnemySchema } from '@/lib/schemas/world';
import { toEnemyPin } from '@/lib/server/world/enemy-store';
import { ownedMap } from '@/lib/server/world/map-handlers';
import { errorResponse } from '@/lib/utils/api/api-response';
import { withDM } from '@/lib/utils/api/as-dm';
import { parseBody } from '@/lib/utils/api/parse-body';

async function ownedEnemy(campaignId: string, mapId: string, enemyId: string) {
    const map = await ownedMap(campaignId, mapId);

    if (map instanceof NextResponse) return map;

    const enemy = await prisma.worldEnemyPin.findUnique({
        where: { id: enemyId },
    });

    if (!enemy || enemy.mapId !== mapId)
        return errorResponse(API_ERRORS.WORLD_ENEMY_NOT_FOUND, 404);

    return enemy;
}

export function enemyCreateHandler(
    req: Request,
    campaignId: string,
    mapId: string
) {
    return withDM(campaignId, 'create world enemy', async () => {
        const body = await parseBody(createEnemySchema, req);

        if (body instanceof NextResponse) return body;

        const map = await ownedMap(campaignId, mapId);

        if (map instanceof NextResponse) return map;

        if (
            (await prisma.worldEnemyPin.count({ where: { mapId } })) >=
            MAX_WORLD_ENEMY_PINS
        )
            return errorResponse(API_ERRORS.WORLD_ENEMY_LIMIT, 409);

        const created = await prisma.worldEnemyPin.create({
            data: { ...body, mapId },
        });

        return NextResponse.json(toEnemyPin(created), { status: 201 });
    });
}

export function enemyPatchHandler(
    req: Request,
    campaignId: string,
    mapId: string,
    enemyId: string
) {
    return withDM(campaignId, 'update world enemy', async () => {
        const body = await parseBody(updateEnemySchema, req);

        if (body instanceof NextResponse) return body;

        const enemy = await ownedEnemy(campaignId, mapId, enemyId);

        if (enemy instanceof NextResponse) return enemy;

        const updated = await prisma.worldEnemyPin.update({
            where: { id: enemyId },
            data: body,
        });

        return NextResponse.json(toEnemyPin(updated));
    });
}

export function enemyDeleteHandler(
    campaignId: string,
    mapId: string,
    enemyId: string
) {
    return withDM(campaignId, 'delete world enemy', async () => {
        const enemy = await ownedEnemy(campaignId, mapId, enemyId);

        if (enemy instanceof NextResponse) return enemy;

        await prisma.worldEnemyPin.delete({ where: { id: enemyId } });

        return NextResponse.json({ ok: true });
    });
}
