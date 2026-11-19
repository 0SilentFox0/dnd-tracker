import type { QueryClient } from '@tanstack/react-query';

import { soundKeys } from './keys';
import { playBuffer } from './player';

import { getSounds } from '@/lib/api/soundboard';
import { readAudioPrefs } from '@/lib/hooks/audio';
import { logger } from '@/lib/utils/common/logger';
import { createNonceGuard } from '@/lib/utils/soundboard/dedupe';
import { resolveSound } from '@/lib/utils/soundboard/resolve-sound';
import { effectiveVolume } from '@/lib/utils/soundboard/volume';
import type { Sound, SoundList } from '@/types/soundboard';

let firstSeen = createNonceGuard();

export const markLocalPlay = (nonce: string): void => {
    firstSeen(nonce);
};

export function __resetNonces(): void {
    firstSeen = createNonceGuard();
}

async function play(
    queryClient: QueryClient,
    campaignId: string,
    soundId: string
): Promise<void> {
    const key = soundKeys.list(campaignId);

    const list =
        queryClient.getQueryData<SoundList>(key) ??
        (await queryClient.fetchQuery({
            queryKey: key,
            queryFn: () => getSounds(campaignId),
            staleTime: 60_000,
        }));

    const custom: Sound[] = list.sounds.map((s) => ({
        ...s,
        source: 'custom',
    }));

    const sound = resolveSound(soundId, {
        custom,
        hiddenBuiltin: list.hiddenBuiltin,
    });

    if (!sound) return;

    const volume = effectiveVolume(sound, readAudioPrefs());

    if (volume > 0) await playBuffer(sound, volume);
}

export function handleSoundPlayEvent(
    queryClient: QueryClient,
    campaignId: string,
    data: unknown
): void {
    const event = data as { soundId?: unknown; nonce?: unknown } | null;

    if (typeof event?.soundId !== 'string' || typeof event.nonce !== 'string')
        return;

    if (!firstSeen(event.nonce)) return;

    play(queryClient, campaignId, event.soundId).catch((error) =>
        logger.warn('[soundboard] play event failed', {}, error)
    );
}
