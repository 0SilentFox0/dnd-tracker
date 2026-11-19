import { BUILTIN_SOUNDS } from '@/lib/constants/soundboard';
import type { BuiltinSound, LibrarySound } from '@/types/soundboard';

export const builtinToSound = (b: BuiltinSound): LibrarySound => ({
    id: b.id,
    source: 'builtin',
    name: null,
    nameKey: b.nameKey,
    icon: b.icon,
    color: null,
    volume: 1,
    url: b.url,
    durationMs: null,
});

export const BUILTIN_LIBRARY_SOUNDS: readonly LibrarySound[] =
    BUILTIN_SOUNDS.map(builtinToSound);

const BUILTIN_BY_ID = new Map(BUILTIN_LIBRARY_SOUNDS.map((s) => [s.id, s]));

export const resolveBuiltinSound = (id: string): LibrarySound | null =>
    BUILTIN_BY_ID.get(id) ?? null;
