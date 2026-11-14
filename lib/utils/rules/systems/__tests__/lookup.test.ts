import { beforeEach, describe, expect, it, vi } from 'vitest';

const fresh = async () => {
    vi.resetModules();

    return import('../lookup');
};

const wfrp = { system: { key: 'wfrp' } };

describe('lookup before an install', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('ruleSystemOf throws SystemNotInstalledError with the key', async () => {
        const { ruleSystemOf, SystemNotInstalledError } = await fresh();

        expect(() => ruleSystemOf(wfrp)).toThrow(SystemNotInstalledError);
        expect(() => ruleSystemOf(wfrp)).toThrow(/wfrp/);

        try {
            ruleSystemOf(wfrp);
        } catch (e) {
            expect((e as InstanceType<typeof SystemNotInstalledError>).key).toBe(
                'wfrp'
            );
        }
    });

    it('ruleSystemByKey is undefined and isInstalled false, nothing throws', async () => {
        const { ruleSystemByKey, isInstalled } = await fresh();

        expect(ruleSystemByKey('wfrp')).toBeUndefined();
        expect(isInstalled({ key: 'wfrp' })).toBe(false);
    });
});

describe('lookup after an install root', () => {
    it('resolves, reports installed, and installModules is idempotent', async () => {
        const lookup = await fresh();

        const { MODULES } = await import('../registry');

        expect(lookup.isInstalled({ key: 'wfrp' })).toBe(true);

        const first = lookup.ruleSystemOf(wfrp);

        lookup.installModules(MODULES);
        expect(lookup.ruleSystemOf(wfrp)).toBe(first);
        expect(lookup.ruleSystemByKey('wfrp')).toBe(first);
    });

    it('isInstalled is false while a module of the composition is missing', async () => {
        const lookup = await fresh();

        const { MODULES } = await import('../registry');

        const { wfrp: base, ...rest } = MODULES;

        lookup.installModules(rest);
        expect(lookup.isInstalled({ key: 'wfrp' })).toBe(false);
        expect(base).toBeDefined();
    });
});
