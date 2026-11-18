import { NextResponse } from 'next/server';

import '@/lib/server/systems/registry';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { battleMapTilePatchSchema } from '@/lib/schemas/battle-maps';
import { campaignMapMaxSide } from '@/lib/server/battle-maps/campaign-limits';
import { getMapMeta } from '@/lib/server/battle-maps/library-service';
import { requireMapReadAccess } from '@/lib/server/battle-maps/player-access';
import {
    getTileChunks,
    patchTileChunks,
} from '@/lib/server/battle-maps/tiles-service';
import { requireCampaignAccess, requireDM } from '@/lib/utils/api/api-auth';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { loadOwned } from '@/lib/utils/api/load-owned';
import { parseBody } from '@/lib/utils/api/parse-body';

type Ctx = { params: Promise<{ id: string; mapId: string }> };

const MAX_PATCH_BODY_BYTES = 512 * 1024;

export async function GET(req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const access = await requireCampaignAccess(id);

    if (access instanceof NextResponse) return access;

    const meta = await loadOwned(getMapMeta(mapId), id);

    if (meta instanceof NextResponse) return meta;

    const denied = await requireMapReadAccess(id, mapId, access.isDM);

    if (denied) return denied;

    const rawVersion = new URL(req.url).searchParams.get('version');

    const version = rawVersion === null ? meta.version : Number(rawVersion);

    if (!(Number.isInteger(version) && version >= 1))
        return errorResponse(API_ERRORS.INVALID_BODY, 400);

    const chunks = await getTileChunks(mapId, version);

    if (!chunks) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    return privateJson({ version, chunks });
}

export async function PUT(req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    if ((await campaignMapMaxSide(id)) < MAP_LIMITS.tileMaxSide)
        return errorResponse(API_ERRORS.FORBIDDEN, 403);

    const meta = await loadOwned(getMapMeta(mapId), id);

    if (meta instanceof NextResponse) return meta;

    const body = await parseBody(
        battleMapTilePatchSchema,
        req,
        API_ERRORS.INVALID_BODY,
        { maxBytes: MAX_PATCH_BODY_BYTES }
    );

    if (body instanceof NextResponse) return body;

    try {
        const version = await patchTileChunks(
            mapId,
            body.expectedVersion,
            body.patches
        );

        return privateJson({ version });
    } catch (error) {
        return handleApiError(error, {
            action: 'battle map tile patch',
            mapId,
        });
    }
}
