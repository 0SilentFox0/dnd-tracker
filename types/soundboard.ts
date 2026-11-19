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
    url: string;
};

export type BuiltinSound = {
    id: string;
    nameKey: string;
    icon: string;
    url: string;
};

export type CreateSoundData = {
    path: string;
    name: string;
    durationMs?: number;
    color?: string;
    icon?: string;
};

export type UpdateSoundData = {
    name?: string;
    volume?: number;
    color?: string | null;
    icon?: string | null;
};

export type LibrarySound = {
    id: string;
    source: 'builtin' | 'library';
    name: string | null;
    nameKey?: string;
    icon: string;
    color: string | null;
    volume: number;
    url: string;
    durationMs: number | null;
};

export type LibrarySoundRow = Omit<LibrarySound, 'source' | 'nameKey'> & {
    sourceUrl: string | null;
};

export type SoundPreset = {
    id: string;
    name: string;
    slots: (string | null)[];
    sortOrder: number;
};

export type SoundLibrary = {
    sounds: LibrarySoundRow[];
    presets: SoundPreset[];
};
