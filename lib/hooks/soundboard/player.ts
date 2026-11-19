import { MAX_SOUND_SECONDS } from '@/lib/constants/soundboard';
import { createVoicePool } from '@/lib/utils/soundboard/voices';
import type { LibrarySound } from '@/types/soundboard';

type Playable = Pick<LibrarySound, 'id' | 'url'>;

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

const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'] as const;

const REMOTE_RESUME_MAX_MS = 1000;

const unlock = async (): Promise<void> => {
    try {
        const c = getContext();

        if (c && c.state !== 'running') await c.resume().catch(() => {});
    } catch (error) {
        console.warn('[soundboard] unlock failed', {}, error);
    }
};

export function unlockSoundboard(): Promise<void> {
    return unlock();
}

export function armUnlock(): void {
    if (armed || typeof document === 'undefined') return;

    armed = true;

    const handler = () => {
        void unlock().then(() => {
            if (ctx?.state !== 'running') return;

            for (const type of UNLOCK_EVENTS)
                document.removeEventListener(type, handler);
        });
    };

    for (const type of UNLOCK_EVENTS) document.addEventListener(type, handler);
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

export async function playBuffer(
    sound: Playable,
    volume: number,
    opts: { remote?: boolean } = {}
): Promise<void> {
    try {
        const c = getContext();

        if (!c || volume <= 0) return;

        if (c.state !== 'running') {
            const started = Date.now();

            await c.resume().catch(() => {});

            // a remote event held behind a pending resume would play late
            if (opts.remote && Date.now() - started > REMOTE_RESUME_MAX_MS)
                return;
        }

        if (c.state !== 'running') return;

        const buffer = await load(c, sound.url);

        const source = c.createBufferSource();

        const gain = c.createGain();

        source.buffer = buffer;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(c.destination);

        const release = voices.add(() => source.stop());

        source.onended = release;

        try {
            source.start(0, 0, MAX_SOUND_SECONDS);
        } catch (error) {
            release();
            throw error;
        }
    } catch (error) {
        console.warn(
            '[soundboard] playback failed',
            { soundId: sound.id },
            error
        );
    }
}

export const previewSound = (sound: Playable, volume = 1): Promise<void> =>
    playBuffer(sound, volume);

export function __resetForTests(): void {
    ctx = null;
    armed = false;
    buffers = new Map();
    voices = createVoicePool();
}
