import { after, NextResponse } from 'next/server';
import type { z } from 'zod';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    MAX_SOUNDS_PER_CAMPAIGN,
    PLAY_RATE_LIMIT,
} from '@/lib/constants/soundboard';
import {
    createSoundSchema,
    hiddenBuiltinSchema,
    playSoundSchema,
    reorderSoundsSchema,
    soundUploadRequestSchema,
    updateSoundSchema,
} from '@/lib/schemas/soundboard';
import { publishSoundPlay } from '@/lib/server/soundboard/publish-play';
import {
    createSound,
    deleteSound,
    findPlayable,
    listSounds,
    reorderSounds,
    setHiddenBuiltin,
    soundsEtag,
    updateSound,
} from '@/lib/server/soundboard/sound-store';
import { createSoundUploadTicket } from '@/lib/supabase/soundboard-storage';
import { requireCampaignAccess, requireDM } from '@/lib/utils/api/api-auth';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { ifNoneMatch, weakEtag } from '@/lib/utils/api/etag';
import { parseBody } from '@/lib/utils/api/parse-body';
import { checkRateLimit, rateLimitResponse } from '@/lib/utils/api/rate-limit';
import { validateSoundFile } from '@/lib/utils/soundboard/validate-file';

const REVALIDATE = 'private, max-age=0, must-revalidate';

export async function listSoundsHandler(req: Request, campaignId: string) {
    try {
        const access = await requireCampaignAccess(campaignId);

        if (access instanceof NextResponse) return access;

        const list = await listSounds(campaignId);

        const etag = weakEtag(campaignId, soundsEtag(list));

        const notModified = ifNoneMatch(req, etag);

        if (notModified) {
            notModified.headers.set('Cache-Control', REVALIDATE);

            return notModified;
        }

        return NextResponse.json(list, {
            headers: { ETag: etag, 'Cache-Control': REVALIDATE },
        });
    } catch (error) {
        return handleApiError(error, { action: 'list sounds' });
    }
}

export async function issueSoundUploadTicketHandler(
    req: Request,
    campaignId: string
) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        const body = await parseBody(soundUploadRequestSchema, req);

        if (body instanceof NextResponse) return body;

        const file = validateSoundFile({
            name: body.name,
            type: body.contentType,
            size: body.size,
        });

        if (!file.ok) return errorResponse(file.message, 400);

        const { sounds } = await listSounds(campaignId);

        if (sounds.length >= MAX_SOUNDS_PER_CAMPAIGN)
            return errorResponse(API_ERRORS.SOUND_LIMIT, 400);

        const ticket = await createSoundUploadTicket(campaignId, file.value);

        return ticket.ok
            ? NextResponse.json(ticket.value)
            : errorResponse(ticket.message, 500);
    } catch (error) {
        return handleApiError(error, { action: 'issue sound upload' });
    }
}

export async function createSoundHandler(req: Request, campaignId: string) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        const body = await parseBody(createSoundSchema, req);

        if (body instanceof NextResponse) return body;

        return privateJson(await createSound(campaignId, body), 201);
    } catch (error) {
        return handleApiError(error, { action: 'create sound' });
    }
}

export async function updateSoundHandler(
    req: Request,
    campaignId: string,
    soundId: string
) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        const body = await parseBody(updateSoundSchema, req);

        if (body instanceof NextResponse) return body;

        return privateJson(await updateSound(campaignId, soundId, body));
    } catch (error) {
        return handleApiError(error, { action: 'update sound', soundId });
    }
}

export async function deleteSoundHandler(campaignId: string, soundId: string) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        await deleteSound(campaignId, soundId);

        return privateJson({ ok: true });
    } catch (error) {
        return handleApiError(error, { action: 'delete sound', soundId });
    }
}

async function dmWrite<S extends z.ZodType>(
    req: Request,
    campaignId: string,
    schema: S,
    action: string,
    write: (body: z.infer<S>) => Promise<void>
) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        const body = await parseBody(schema, req);

        if (body instanceof NextResponse) return body;

        await write(body);

        return privateJson({ ok: true });
    } catch (error) {
        return handleApiError(error, { action });
    }
}

export const reorderSoundsHandler = (req: Request, campaignId: string) =>
    dmWrite(req, campaignId, reorderSoundsSchema, 'reorder sounds', (body) =>
        reorderSounds(campaignId, body.ids)
    );

export const setHiddenBuiltinHandler = (req: Request, campaignId: string) =>
    dmWrite(req, campaignId, hiddenBuiltinSchema, 'hide builtin sounds', (body) =>
        setHiddenBuiltin(campaignId, [...new Set(body.ids)])
    );

export async function playSoundHandler(req: Request, campaignId: string) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        const body = await parseBody(playSoundSchema, req);

        if (body instanceof NextResponse) return body;

        const playable = await findPlayable(campaignId, body.soundId);

        if (!playable) return errorResponse(API_ERRORS.SOUND_NOT_FOUND, 404);

        const limit = await checkRateLimit({
            userId: access.userId,
            scope: 'soundboard-play',
            ...PLAY_RATE_LIMIT,
        });

        if (!limit.allowed) return rateLimitResponse(limit);

        after(() =>
            publishSoundPlay(campaignId, {
                soundId: body.soundId,
                nonce: body.nonce,
                volume: playable.volume,
            })
        );

        return privateJson({ ok: true });
    } catch (error) {
        return handleApiError(error, { action: 'play sound' });
    }
}
