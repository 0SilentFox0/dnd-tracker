export type Sound = {
    id: string;
    source: 'builtin' | 'custom';
    name: string;
    url: string;
    volume: number;
    color: string | null;
    icon: string | null;
    sortOrder: number;
    durationMs: number | null;
};

export type CustomSoundRow = Omit<Sound, 'source'>;

export type SoundList = {
    sounds: CustomSoundRow[];
    hiddenBuiltin: string[];
};

export type SoundPlayEvent = {
    soundId: string;
    nonce: string;
    volume: number;
};

export type BuiltinSound = {
    id: string;
    nameKey: string;
    icon: string;
    url: string;
};
