import {
    BATTLE_MAP_BACKGROUND_FORMATS,
    BATTLE_MAP_BACKGROUND_TYPES,
    MAP_LIMITS,
} from '@/lib/constants/map-limits';
import { imageBucketStorage } from '@/lib/supabase/image-bucket-storage';
import { sniffImageMime } from '@/lib/utils/api/safe-fetch';

const storage = imageBucketStorage({
    bucket: 'battle-maps',
    maxBytes: MAP_LIMITS.backgroundUploadBytes,
    formats: BATTLE_MAP_BACKGROUND_FORMATS,
    bucketTypes: BATTLE_MAP_BACKGROUND_TYPES,
    logTag: 'battle-map-background',
});

export const createBattleMapBackgroundUploadTicket = (
    campaignId: string,
    contentType: keyof typeof BATTLE_MAP_BACKGROUND_FORMATS
) => storage.createTicket(campaignId, contentType);

export const ownedBattleMapBackgroundPath = storage.ownedPath;
export const removeBattleMapBackgroundFiles = storage.remove;

const SNIFF_BYTES = 32;

/** Direct signed uploads bypass the server, so the first bytes are checked against the extension before the URL is persisted. */
export async function verifyBattleMapBackground(
    campaignId: string,
    url: string
): Promise<boolean> {
    const path = storage.ownedPath(campaignId, url);

    if (!path) return false;

    const expected = Object.entries(BATTLE_MAP_BACKGROUND_FORMATS).find(
        ([, ext]) => path.endsWith(`.${ext}`)
    )?.[0];

    try {
        const res = await fetch(url, {
            headers: { Range: `bytes=0-${SNIFF_BYTES - 1}` },
            cache: 'no-store',
        });

        if (!res.ok) return false;

        const head = Buffer.from(await res.arrayBuffer()).subarray(
            0,
            SNIFF_BYTES
        );

        return !!expected && sniffImageMime(head) === expected;
    } catch (error) {
        console.warn('[battle-map-background] sniff failed', error);

        return false;
    }
}
