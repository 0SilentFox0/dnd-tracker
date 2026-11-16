import { campaignPost } from './client';

import {
    BATTLE_MAP_BACKGROUND_TYPES,
    MAP_LIMITS,
} from '@/lib/constants/map-limits';
import { YEAR_CACHE_SECONDS } from '@/lib/constants/storage';
import { createClient } from '@/lib/supabase/client';
import type { SlideUploadTicket } from '@/types/show';

export async function uploadBattleMapBackground(
    campaignId: string,
    blob: Blob
): Promise<string> {
    if (
        blob.size <= 0 ||
        blob.size > MAP_LIMITS.backgroundUploadBytes ||
        !BATTLE_MAP_BACKGROUND_TYPES.includes(
            blob.type as (typeof BATTLE_MAP_BACKGROUND_TYPES)[number]
        )
    )
        throw new Error('Invalid battle map background');

    const ticket = await campaignPost<SlideUploadTicket>(
        campaignId,
        '/maps/background-upload',
        { size: blob.size, contentType: blob.type }
    );

    const { error } = await createClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, blob, {
            contentType: ticket.contentType,
            cacheControl: YEAR_CACHE_SECONDS,
        });

    if (error) throw new Error(error.message);

    return ticket.publicUrl;
}

export const discardBattleMapBackground = (
    campaignId: string,
    imageUrl: string
) =>
    campaignPost<{ ok: true }>(campaignId, '/maps/background-upload/discard', {
        imageUrl,
    });
