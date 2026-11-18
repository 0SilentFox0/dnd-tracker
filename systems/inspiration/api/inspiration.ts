import { campaignPost } from '@/lib/api/client';
import { systemPath } from '@/lib/api/system';

export const postInspiration = (
    campaignId: string,
    characterId: string,
    value: boolean
) =>
    campaignPost<{ inspiration: boolean }>(
        campaignId,
        systemPath.character(characterId, 'inspiration.set'),
        { value }
    );
