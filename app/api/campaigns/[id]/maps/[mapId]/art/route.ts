import { NextResponse } from 'next/server';

import '@/lib/server/systems/registry';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { battleMapSaveSchema } from '@/lib/schemas/battle-maps';
import { MAP_ART_LIMITS, mapArtSaveSchema } from '@/lib/schemas/map-art';
import { deleteArt, getArt, saveArt } from '@/lib/server/battle-maps/art-service';
import { campaignMapMaxSide } from '@/lib/server/battle-maps/campaign-limits';
import {
    getMapMeta,
    withStoredBackground,
} from '@/lib/server/battle-maps/library-service';
import { requireDM } from '@/lib/utils/api/api-auth';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { ifNoneMatch, weakEtag } from '@/lib/utils/api/etag';
import { loadOwned } from '@/lib/utils/api/load-owned';
import { parseBody } from '@/lib/utils/api/parse-body';
import { gridOf } from '@/lib/utils/battle/grid';
import { composeArtSave } from '@/lib/utils/battle/map-art/compose';

type Ctx = { params: Promise<{ id: string; mapId: string }> };

const REVALIDATE = 'private, max-age=0, must-revalidate';

async function authorize(id: string, mapId: string) {
    const access = await requireDM(id);

    if (access instanceof NextResponse) return access;

    if ((await campaignMapMaxSide(id)) < MAP_LIMITS.tileMaxSide)
        return errorResponse(API_ERRORS.FORBIDDEN, 403);

    return loadOwned(getMapMeta(mapId), id);
}

export async function GET(req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const meta = await authorize(id, mapId);

    if (meta instanceof NextResponse) return meta;

    const record = await getArt(mapId);

    const etag = weakEtag(mapId, 'art', record.sceneVersion);

    const notModified = ifNoneMatch(req, etag);

    if (notModified) {
        notModified.headers.set('Cache-Control', REVALIDATE);

        return notModified;
    }

    return NextResponse.json(record, {
        headers: { ETag: etag, 'Cache-Control': REVALIDATE },
    });
}

export async function PUT(req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const meta = await authorize(id, mapId);

    if (meta instanceof NextResponse) return meta;

    const body = await parseBody(
        mapArtSaveSchema,
        req,
        API_ERRORS.INVALID_BODY,
        { maxBytes: MAP_ART_LIMITS.bodyBytes }
    );

    if (body instanceof NextResponse) return body;

    if (gridOf(body.save.map) !== gridOf(meta.header))
        return errorResponse(API_ERRORS.BATTLE_MAP_GRID_LOCKED, 400);

    const parsed = battleMapSaveSchema.safeParse(composeArtSave(body));

    if (!parsed.success)
        return errorResponse(
            API_ERRORS.INVALID_BODY,
            400,
            parsed.error.issues
        );

    try {
        const save = await withStoredBackground(
            parsed.data,
            id,
            meta.header.background
        );

        return privateJson(
            await saveArt(mapId, {
                save,
                scene: body.scene,
                expectedSceneVersion: body.expectedSceneVersion,
                baked: !!body.bakedUrl,
            })
        );
    } catch (error) {
        return handleApiError(error, { action: 'battle map art save', mapId });
    }
}

export async function DELETE(_req: Request, { params }: Ctx) {
    const { id, mapId } = await params;

    const meta = await authorize(id, mapId);

    if (meta instanceof NextResponse) return meta;

    try {
        await deleteArt(mapId);

        return privateJson({ success: true });
    } catch (error) {
        return handleApiError(error, {
            action: 'battle map art delete',
            mapId,
        });
    }
}
