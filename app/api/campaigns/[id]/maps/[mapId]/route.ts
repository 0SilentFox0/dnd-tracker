import { NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { battleMapInputSchema } from '@/lib/schemas/battle-maps';
import {
    deleteMap,
    getMap,
    getMapMeta,
    saveMap,
    withStoredBackground,
} from '@/lib/server/battle-maps/library-service';
import { requireCampaignAccess, requireDM } from '@/lib/utils/api/api-auth';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
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

    const meta = await loadOwned(getMapMeta(mapId), id);

    if (meta instanceof NextResponse) return meta;

    if (version === undefined) {
        const notModified = ifNoneMatch(req, weakEtag(mapId, meta.version));

        if (notModified) {
            notModified.headers.set('Cache-Control', REVALIDATE);

            return notModified;
        }
    }

    const map = await getMap(mapId, version);

    if (!map) return errorResponse(API_ERRORS.NOT_FOUND, 404);

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

    try {
        const input = await withStoredBackground(
            body,
            id,
            existing.header.background
        );

        return privateJson(await saveMap(mapId, input));
    } catch (error) {
        return handleApiError(error, { action: 'battle map save', mapId });
    }
}

export async function DELETE(_req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    const existing = await loadOwned(getMapMeta(mapId), id);

    if (existing instanceof NextResponse) return existing;

    try {
        if ((await deleteMap(mapId)) === 'in-use')
            return errorResponse(API_ERRORS.BATTLE_MAP_IN_USE, 409);

        return privateJson({ success: true });
    } catch (error) {
        return handleApiError(error, { action: 'battle map delete', mapId });
    }
}
