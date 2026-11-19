import { BUILTIN_SOUNDS } from '@/lib/constants/soundboard';
import type { Sound } from '@/types/soundboard';

const BUILTIN_BY_ID = new Map(BUILTIN_SOUNDS.map((s) => [s.id, s]));

export function resolveSound(
    id: string,
    lib: { custom: Sound[]; hiddenBuiltin: string[] }
): Sound | null {
    if (id.startsWith('builtin:')) {
        const b = BUILTIN_BY_ID.get(id);

        if (!b || lib.hiddenBuiltin.includes(id)) return null;

        return {
            id: b.id,
            source: 'builtin',
            name: b.nameKey,
            url: b.url,
            volume: 1,
            color: null,
            icon: b.icon,
            sortOrder: 0,
            durationMs: null,
        };
    }

    return lib.custom.find((s) => s.id === id) ?? null;
}
