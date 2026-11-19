import type { BuiltinSound } from '@/types/soundboard';

export const SOUNDBOARD_BUCKET = 'soundboard';
export const SOUNDBOARD_PLAY_EVENT = 'soundboard-play';
export const MAX_SOUNDS_PER_CAMPAIGN = 60;
export const MAX_SOUND_BYTES = 1_048_576;
export const MAX_SOUND_SECONDS = 10;
export const SOUND_NAME_MAX = 60;
export const MAX_VOICES = 8;
export const NONCE_LRU = 50;
export const PAD_GUARD_MS = 250;
export const PLAY_RATE_LIMIT = { limit: 20, windowSeconds: 10 };

const builtin = (slug: string, icon: string): BuiltinSound => ({
    id: `builtin:${slug}`,
    nameKey: `soundboard.builtin.${slug}`,
    icon,
    url: `/sfx/${slug}.mp3`,
});

export const BUILTIN_SOUNDS: readonly BuiltinSound[] = [
    builtin('door-open', 'door-open'),
    builtin('door-slam', 'door-closed'),
    builtin('sword-hit', 'swords'),
    builtin('sword-draw', 'sword'),
    builtin('thunder', 'cloud-lightning'),
    builtin('explosion', 'bomb'),
    builtin('fire', 'flame'),
    builtin('magic-cast', 'sparkles'),
    builtin('heal', 'heart-pulse'),
    builtin('wolf-howl', 'paw-print'),
    builtin('footsteps', 'footprints'),
    builtin('scream', 'megaphone'),
    builtin('coins', 'coins'),
    builtin('bell', 'bell'),
    builtin('chest-open', 'package-open'),
    builtin('glass-break', 'glass-water'),
    builtin('dragon-roar', 'skull'),
];

export const BUILTIN_SOUND_IDS: ReadonlySet<string> = new Set(
    BUILTIN_SOUNDS.map((s) => s.id)
);
