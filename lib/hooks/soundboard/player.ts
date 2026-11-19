import { logger } from '@/lib/utils/common/logger';
import { createVoicePool } from '@/lib/utils/soundboard/voices';
import type { Sound } from '@/types/soundboard';

let ctx: AudioContext | null = null;

let armed = false;

let buffers = new Map<string, AudioBuffer>();

let voices = createVoicePool();

const getContext = (): AudioContext | null => {
    if (ctx) return ctx;

    const Ctor =
        typeof window === 'undefined'
            ? undefined
            : (window.AudioContext ??
              (
                  window as unknown as {
                      webkitAudioContext?: typeof AudioContext;
                  }
              ).webkitAudioContext);

    if (!Ctor) return null;

    ctx = new Ctor();

    return ctx;
};

const unlock = () => {
    try {
        const c = getContext();

        if (c && c.state !== 'running') void c.resume().catch(() => {});
    } catch (error) {
        logger.warn('[soundboard] unlock failed', {}, error);
    }
};

export function armUnlock(): void {
    if (armed || typeof document === 'undefined') return;

    armed = true;

    const handler = () => {
        document.removeEventListener('pointerdown', handler);
        document.removeEventListener('keydown', handler);
        unlock();
    };

    document.addEventListener('pointerdown', handler);
    document.addEventListener('keydown', handler);
}

async function load(c: AudioContext, url: string): Promise<AudioBuffer> {
    const cached = buffers.get(url);

    if (cached) return cached;

    const response = await fetch(url);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = await c.decodeAudioData(await response.arrayBuffer());

    buffers.set(url, buffer);

    return buffer;
}

export async function playBuffer(sound: Sound, volume: number): Promise<void> {
    try {
        const c = getContext();

        if (!c || c.state !== 'running' || volume <= 0) return;

        const buffer = await load(c, sound.url);

        const source = c.createBufferSource();

        const gain = c.createGain();

        source.buffer = buffer;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(c.destination);

        const release = voices.add(() => source.stop());

        source.onended = release;
        source.start();
    } catch (error) {
        logger.warn(
            '[soundboard] playback failed',
            { soundId: sound.id },
            error
        );
    }
}

export const previewSound = (sound: Sound, volume = 1): Promise<void> =>
    playBuffer(sound, volume);

export function __resetForTests(): void {
    ctx = null;
    armed = false;
    buffers = new Map();
    voices = createVoicePool();
}
