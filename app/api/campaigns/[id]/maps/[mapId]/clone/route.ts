import { NextResponse } from 'next/server';

import { battleMapCloneSchema } from '@/lib/schemas/battle-maps';
import { cloneMap, getMap } from '@/lib/server/battle-maps/library-service';
import { requireDM } from '@/lib/utils/api/api-auth';
import { privateJson } from '@/lib/utils/api/api-response';
import { loadOwned } from '@/lib/utils/api/load-owned';
import { parseBody } from '@/lib/utils/api/parse-body';

type Ctx = { params: Promise<{ id: string; mapId: string }> };

export async function POST(req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const source = await loadOwned(getMap(mapId), id);

    if (source instanceof NextResponse) return source;

    const body = await parseBody(battleMapCloneSchema, req);

    if (body instanceof NextResponse) return body;

    return privateJson(await cloneMap(source, body.name), 201);
}
