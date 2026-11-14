import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { battleMapInputSchema } from '@/lib/schemas/battle-maps';
import {
    deleteMap,
    getMap,
    getMapMeta,
    saveMap,
} from '@/lib/server/battle-maps/library-service';
import { requireCampaignAccess, requireDM } from '@/lib/utils/api/api-auth';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { ifNoneMatch, weakEtag } from '@/lib/utils/api/etag';
import { loadOwned } from '@/lib/utils/api/load-owned';
import { parseBody } from '@/lib/utils/api/parse-body';

type Ctx = { params: Promise<{ id: string; mapId: string }> };

const IMMUTABLE = 'private, max-age=31536000, immutable';

const REVALIDATE = 'private, max-age=0, must-revalidate';

export async function GET(req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    const raw = new URL(req.url).searchParams.get('version');

    const version = raw === null ? undefined : Number(raw);

    if (version !== undefined && !(Number.isInteger(version) && version >= 1))
        return errorResponse(API_ERRORS.INVALID_BODY, 400);

    if (version === undefined) {
        const meta = await loadOwned(getMapMeta(mapId), id);

        if (meta instanceof NextResponse) return meta;

        const notModified = ifNoneMatch(req, weakEtag(mapId, meta.version));

        if (notModified) {
            notModified.headers.set('Cache-Control', REVALIDATE);

            return notModified;
        }
    }

    const map = await loadOwned(getMap(mapId, version), id);

    if (map instanceof NextResponse) return map;

    const etag = weakEtag(map.id, map.version);

    const { campaignId: _campaignId, ...body } = map;

    return NextResponse.json(body, {
        headers: {
            ETag: etag,
            'Cache-Control': version === undefined ? REVALIDATE : IMMUTABLE,
        },
    });
}

export async function PUT(req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const existing = await loadOwned(getMapMeta(mapId), id);

    if (existing instanceof NextResponse) return existing;

    const body = await parseBody(battleMapInputSchema, req);

    if (body instanceof NextResponse) return body;

    return privateJson(await saveMap(mapId, body));
}

export async function DELETE(_req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const existing = await loadOwned(getMapMeta(mapId), id);

    if (existing instanceof NextResponse) return existing;

    if ((await deleteMap(mapId)) === 'in-use')
        return errorResponse(API_ERRORS.BATTLE_MAP_IN_USE, 409);

    return privateJson({ success: true });
}
