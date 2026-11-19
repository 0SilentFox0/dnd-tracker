import type { BuiltinSound } from '@/types/soundboard';

export const SOUNDBOARD_BUCKET = 'soundboard';
export const SOUNDBOARD_PLAY_EVENT = 'soundboard-play';
export const PRESET_SLOTS = 9;
export const MAX_LIBRARY_SOUNDS = 100;
export const MAX_PRESETS = 30;
export const PRESET_NAME_MAX = 40;
export const MAX_SOUND_BYTES = 1_048_576;
export const MAX_SOUND_SECONDS = 10;
export const SOUND_NAME_MAX = 60;
export const SOUND_FORMATS = {
    mp3: { ext: 'mp3', contentType: 'audio/mpeg' },
    m4a: { ext: 'm4a', contentType: 'audio/mp4' },
    webm: { ext: 'webm', contentType: 'audio/webm' },
} as const;
export type SoundFormat = keyof typeof SOUND_FORMATS;

export const MAX_VOICES = 8;
export const NONCE_LRU = 50;
export const PAD_GUARD_MS = 250;
export const PLAY_RATE_LIMIT = { limit: 20, windowSeconds: 10 };
export const SOUND_INTAKE_RATE_LIMIT = { limit: 10, windowSeconds: 60 };

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

export const SOUND_ICONS: readonly string[] = [
    'volume-2',
    'door-open',
    'door-closed',
    'swords',
    'sword',
    'cloud-lightning',
    'bomb',
    'flame',
    'sparkles',
    'heart-pulse',
    'paw-print',
    'footprints',
    'megaphone',
    'coins',
    'bell',
    'package-open',
    'glass-water',
    'skull',
    'shield',
    'wand-sparkles',
    'music',
    'drum',
    'ghost',
    'wind',
    'waves',
    'snowflake',
    'zap',
    'droplets',
    'moon',
    'sun',
    'bird',
    'bug',
    'castle',
    'crown',
    'key',
    'hammer',
    'axe',
    'target',
    'mic',
    'siren',
];

const BATTLE_PRESET_IDS = BUILTIN_SOUNDS.slice(0, PRESET_SLOTS).map(
    (s) => s.id
);

const AMBIENCE_PRESET_IDS = BUILTIN_SOUNDS.slice(PRESET_SLOTS).map((s) => s.id);

export const STARTER_PRESETS: readonly {
    nameKey: string;
    ids: readonly string[];
}[] = [
    { nameKey: 'soundboard.starter.battle', ids: BATTLE_PRESET_IDS },
    { nameKey: 'soundboard.starter.ambience', ids: AMBIENCE_PRESET_IDS },
];
