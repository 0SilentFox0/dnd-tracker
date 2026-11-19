import { describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ tags: [] as string[][] }));

vi.mock('next/cache', () => ({
    unstable_cache: (
        fn: () => unknown,
        _key: string[],
        options: { tags?: string[] }
    ) => {
        cache.tags.push(options.tags ?? []);

        return fn;
    },
}));
vi.mock('@/lib/db', () => ({ prisma: { spell: { findMany: vi.fn() } } }));

import { getCachedInterruptSpells } from '@/lib/cache/reference-data';
import { cacheTags } from '@/lib/cache/tags';
import { prisma } from '@/lib/db';

describe('getCachedInterruptSpells', () => {
    it('maps interrupt spells and is tagged with the spells tag', async () => {
        vi.mocked(prisma.spell.findMany).mockResolvedValue([
            {
                id: 'cs',
                name: 'Counterspell',
                level: 3,
                targeting: { kind: 'enemy', range: 60 },
                spellEffects: [{ kind: 'interruptCast' }],
            },
        ] as never);

        const out = await getCachedInterruptSpells('c1');

        expect(out).toEqual([
            { id: 'cs', name: 'Counterspell', level: 3, range: 60 },
        ]);
        expect(cache.tags[0]).toContain(cacheTags.spells('c1'));
    });
});
