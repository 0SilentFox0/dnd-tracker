import { campaignPost } from './client';

export const playSound = (
    campaignId: string,
    data: { soundId: string; nonce: string }
) => campaignPost<{ ok: true }>(campaignId, '/sounds/play', data);
