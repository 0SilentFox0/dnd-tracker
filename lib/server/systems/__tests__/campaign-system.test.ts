import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: vi.fn() } }));

import { systemOfRules } from '../campaign-system';

describe('systemOfRules', () => {
    it('reads the key and the modules', () => {
        expect(
            systemOfRules({ system: { key: 'dnd5e', modules: ['morale'] } })
        ).toEqual({ key: 'dnd5e', modules: ['morale'] });
    });

    it('falls back to the preset by classes.enabled when system is missing', () => {
        expect(systemOfRules({ classes: { enabled: false } })).toEqual({
            key: 'homm',
        });
        expect(systemOfRules({ classes: { enabled: true } })).toEqual({
            key: 'dnd5e',
        });
        expect(systemOfRules(null)).toEqual({ key: 'homm' });
    });

    it('drops an invalid composition the way the client does', () => {
        expect(
            systemOfRules({
                system: { key: 'homm', modules: ['morale', 'bogus'] },
            })
        ).toEqual({ key: 'homm' });
    });
});
