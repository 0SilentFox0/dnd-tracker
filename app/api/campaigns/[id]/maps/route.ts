import { NextResponse } from 'next/server';

import '@/lib/server/systems/registry';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { battleMapInputSchema } from '@/lib/schemas/battle-maps';
import {
    createMap,
    listMaps,
    withStoredBackground,
} from '@/lib/server/battle-maps/library-service';
import { requireDM } from '@/lib/utils/api/api-auth';
import { privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';
import { checkRateLimit, rateLimitResponse } from '@/lib/utils/api/rate-limit';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
    const { id } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    return privateJson(await listMaps(id));
}

export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const rate = await checkRateLimit({
        userId: access.userId,
        scope: 'map-create',
        battleId: id,
        ...MAP_LIMITS.createRate,
        memoryFallback: true,
    });

    if (!rate.allowed) return rateLimitResponse(rate);

    const body = await parseBody(battleMapInputSchema, req);

    if (body instanceof NextResponse) return body;

    try {
        const input = await withStoredBackground(body, id);

        return privateJson(await createMap(id, input), 201);
    } catch (error) {
        return handleApiError(error, { action: 'battle map create' });
    }
}
