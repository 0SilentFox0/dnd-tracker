export type SoundPlayEvent = {
    soundId: string;
    nonce: string;
    volume: number;
    url?: string;
};

export type BuiltinSound = {
    id: string;
    nameKey: string;
    icon: string;
    url: string;
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

export type CreateLibrarySoundData = {
    path: string;
    durationMs: number;
    source: 'upload' | 'record' | 'link';
    name?: string | null;
    icon?: string;
    color?: string | null;
    volume?: number;
    sourceUrl?: string;
};

export type UpdateLibrarySoundData = {
    name?: string | null;
    icon?: string;
    color?: string | null;
    volume?: number;
};
