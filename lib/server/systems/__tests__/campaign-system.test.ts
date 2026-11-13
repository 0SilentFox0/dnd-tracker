import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: vi.fn() } }));

import { systemOfRules } from '../campaign-system';

import { RulesSystemError } from '@/lib/utils/rules/schema';

describe('systemOfRules', () => {
    it('reads the key and the modules', () => {
        expect(
            systemOfRules({ system: { key: 'dnd5e', modules: ['morale'] } })
        ).toEqual({ key: 'dnd5e', modules: ['morale'] });
    });

    it('a missing system is an error, not a guess', () => {
        expect(() => systemOfRules({ classes: { enabled: true } })).toThrow(
            RulesSystemError
        );
        expect(() => systemOfRules(null)).toThrow(RulesSystemError);
    });

    it('drops an invalid composition the way the client does', () => {
        expect(
            systemOfRules({
                system: { key: 'homm', modules: ['morale', 'bogus'] },
            })
        ).toEqual({ key: 'homm' });
    });
});
