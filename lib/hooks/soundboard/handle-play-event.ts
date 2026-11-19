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

const find = (list: SoundList, soundId: string): Sound | null =>
    resolveSound(soundId, {
        custom: list.sounds.map((s) => ({ ...s, source: 'custom' as const })),
        hiddenBuiltin: list.hiddenBuiltin,
    });

async function play(
    queryClient: QueryClient,
    campaignId: string,
    soundId: string
): Promise<void> {
    const key = soundKeys.list(campaignId);

    const cached = queryClient.getQueryData<SoundList>(key);

    let sound = cached && find(cached, soundId);

    if (!sound) {
        const fresh = await queryClient
            .fetchQuery({
                queryKey: key,
                queryFn: () => getSounds(campaignId),
                staleTime: cached ? 0 : 60_000,
            })
            .catch(() => undefined);

        sound = fresh && find(fresh, soundId);
    }

    if (!sound) return;

    const volume = effectiveVolume(sound, readAudioPrefs());

    if (volume > 0) await playBuffer(sound, volume, { remote: true });
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
