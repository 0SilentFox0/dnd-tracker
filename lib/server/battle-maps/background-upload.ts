import {
    BATTLE_MAP_BACKGROUND_FORMATS,
    BATTLE_MAP_BACKGROUND_TYPES,
    MAP_LIMITS,
} from '@/lib/constants/map-limits';
import { imageBucketStorage } from '@/lib/supabase/image-bucket-storage';

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
