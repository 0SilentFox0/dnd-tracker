import { after, NextResponse } from 'next/server';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { PLAY_RATE_LIMIT } from '@/lib/constants/soundboard';
import { playSoundSchema } from '@/lib/schemas/soundboard';
import { findPlayableFor } from '@/lib/server/soundboard/library-store';
import { publishSoundPlay } from '@/lib/server/soundboard/publish-play';
import { requireDM } from '@/lib/utils/api/api-auth';
import { errorResponse, privateJson } from '@/lib/utils/api/api-response';
import { handleApiError } from '@/lib/utils/api/error-handler';
import { parseBody } from '@/lib/utils/api/parse-body';
import { checkRateLimit, rateLimitResponse } from '@/lib/utils/api/rate-limit';

export async function playSoundHandler(req: Request, campaignId: string) {
    try {
        const access = await requireDM(campaignId);

        if (access instanceof NextResponse) return access;

        const body = await parseBody(playSoundSchema, req);

        if (body instanceof NextResponse) return body;

        const playable = await findPlayableFor(access.userId, body.soundId);

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
                // builtin files are served by every client from /sfx
                ...(!body.soundId.startsWith('builtin:') && {
                    url: playable.url,
                }),
            })
        );

        return privateJson({ ok: true });
    } catch (error) {
        return handleApiError(error, { action: 'play sound' });
    }
}
