import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: vi.fn() } }));

import { parseSystemSelection } from '../campaign-system';

describe('parseSystemSelection', () => {
    it('reads the key and the modules', () => {
        expect(
            parseSystemSelection({ key: 'dnd5e', modules: ['morale'] })
        ).toEqual({ key: 'dnd5e', modules: ['morale'] });
    });

    it('leaves modules out when they are not an array of strings', () => {
        expect(parseSystemSelection({ key: 'homm', modules: 'x' })).toEqual({
            key: 'homm',
        });
        expect(parseSystemSelection({ key: 'homm', modules: [1] })).toEqual({
            key: 'homm',
        });
    });

    it('gives a null key for a missing or malformed system', () => {
        expect(parseSystemSelection(null)).toEqual({ key: null });
        expect(parseSystemSelection({ key: 5 })).toEqual({ key: null });
    });
});
