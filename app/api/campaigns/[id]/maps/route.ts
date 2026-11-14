import { NextResponse } from 'next/server';

import { battleMapInputSchema } from '@/lib/schemas/battle-maps';
import { createMap, listMaps } from '@/lib/server/battle-maps/library-service';
import { requireCampaignAccess, requireDM } from '@/lib/utils/api/api-auth';
import { privateJson } from '@/lib/utils/api/api-response';
import { parseBody } from '@/lib/utils/api/parse-body';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
    const { id } = await params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    return privateJson(await listMaps(id));
}

export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(battleMapInputSchema, req);

    if (body instanceof NextResponse) return body;

    return privateJson(await createMap(id, body), 201);
}
