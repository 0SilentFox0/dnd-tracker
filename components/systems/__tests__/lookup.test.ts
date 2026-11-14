import { beforeEach, describe, expect, it, vi } from 'vitest';

const fresh = async () => {
    vi.resetModules();

    return import('../lookup');
};

describe('ui lookup with a partial install', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('a bare key resolves from its own base only; other keys are absent, not throwing', async () => {
        const lookup = await fresh();

        const { WFRP_MODULE_UI } = await import('@/systems/wfrp/ui');

        lookup.installUiModules({ wfrp: WFRP_MODULE_UI });

        expect(lookup.systemUiOf('wfrp')).toBeDefined();
        expect(lookup.systemUiByKey('wfrp')).toBe(lookup.systemUiOf('wfrp'));
        expect(lookup.systemUiByKey('dnd5e')).toBeUndefined();
        expect(Object.keys(lookup.SYSTEM_UI)).toEqual(['wfrp']);
        expect(() => lookup.systemUiOf('dnd5e')).toThrow(/No definition/);
    });

    it('a later install merges with the earlier one', async () => {
        const lookup = await fresh();

        const { WFRP_MODULE_UI } = await import('@/systems/wfrp/ui');

        const { D20_MODULE_UI } = await import('@/systems/d20/ui');

        lookup.installUiModules({ wfrp: WFRP_MODULE_UI });
        lookup.installUiModules({ d20: D20_MODULE_UI });

        expect(Object.keys(lookup.SYSTEM_UI).sort()).toEqual([
            'dnd5e',
            'homm',
            'wfrp',
        ]);
    });
});
