import { playBuffer } from './player';

import { SOUNDBOARD_BUCKET } from '@/lib/constants/soundboard';
import { readAudioPrefs } from '@/lib/hooks/audio';
import {
    bucketObjectPath,
    isHostedOnProjectStorage,
} from '@/lib/utils/common/image-url';
import { createNonceGuard } from '@/lib/utils/soundboard/dedupe';
import { resolveBuiltinSound } from '@/lib/utils/soundboard/resolve-sound';
import { effectiveVolume } from '@/lib/utils/soundboard/volume';

let firstSeen = createNonceGuard();

export const markLocalPlay = (nonce: string): void => {
    firstSeen(nonce);
};

export function __resetNonces(): void {
    firstSeen = createNonceGuard();
}

type PlayEvent = {
    soundId?: unknown;
    nonce?: unknown;
    volume?: unknown;
    url?: unknown;
};

function resolvePlayable(
    event: PlayEvent & { soundId: string }
): { id: string; url: string; volume: number } | null {
    const builtin = resolveBuiltinSound(event.soundId);

    if (builtin)
        return {
            id: builtin.id,
            url: new URL(builtin.url, window.location.origin).toString(),
            volume: 1,
        };

    if (event.soundId.startsWith('builtin:') || typeof event.url !== 'string')
        return null;

    if (
        !isHostedOnProjectStorage(event.url) ||
        !bucketObjectPath(event.url, SOUNDBOARD_BUCKET)
    )
        return null;

    return {
        id: event.soundId,
        url: event.url,
        volume: typeof event.volume === 'number' ? event.volume : 1,
    };
}

export function handleSoundPlayEvent(_campaignId: string, data: unknown): void {
    const event = data as PlayEvent | null;

    if (typeof event?.soundId !== 'string' || typeof event.nonce !== 'string')
        return;

    if (!firstSeen(event.nonce)) return;

    const sound = resolvePlayable({ ...event, soundId: event.soundId });

    if (!sound) return;

    const volume = effectiveVolume(sound, readAudioPrefs());

    if (volume > 0)
        void playBuffer(sound, volume, { remote: true }).catch((error) =>
            console.warn('[soundboard] play event failed', {}, error)
        );
}
