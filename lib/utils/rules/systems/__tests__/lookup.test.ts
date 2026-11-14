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
            expect(
                (e as InstanceType<typeof SystemNotInstalledError>).key
            ).toBe('wfrp');
        }
    });

    it('allConditionKeys throws before any install', async () => {
        const { allConditionKeys, SystemNotInstalledError } = await fresh();

        expect(() => allConditionKeys()).toThrow(SystemNotInstalledError);
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

        const { D20_MODULE } = await import('@/systems/d20');

        lookup.installModules({ d20: D20_MODULE });
        expect(lookup.isInstalled({ key: 'wfrp' })).toBe(false);
        expect(lookup.isInstalled({ key: 'd20' })).toBe(true);
        expect(lookup.isInstalled({ key: 'dnd5e' })).toBe(false);
    });
});

describe('partial install (client loads one composition)', () => {
    it('a bare key resolves from its own base only; other keys are absent, not throwing', async () => {
        const lookup = await fresh();

        const { WFRP_MODULE } = await import('@/systems/wfrp');

        lookup.installModules({ wfrp: WFRP_MODULE });

        expect(lookup.ruleSystemOf(wfrp).key).toBe('wfrp');
        expect(lookup.ruleSystemByKey('wfrp')).toBe(lookup.ruleSystemOf(wfrp));
        expect(lookup.ruleSystemByKey('dnd5e')).toBeUndefined();
        expect(Object.keys(lookup.RULE_SYSTEM_REGISTRY)).toEqual(['wfrp']);
        expect(lookup.RULE_SYSTEM_REGISTRY.dnd5e).toBeUndefined();
        expect(() => lookup.ruleSystemOf({ system: { key: 'dnd5e' } })).toThrow(
            /No definition/
        );
    });

    it('a later install merges with the earlier one', async () => {
        const lookup = await fresh();

        const { WFRP_MODULE } = await import('@/systems/wfrp');

        const { D20_MODULE } = await import('@/systems/d20');

        lookup.installModules({ wfrp: WFRP_MODULE });

        const before = lookup.ruleSystemOf(wfrp);

        lookup.installModules({ d20: D20_MODULE });

        expect(lookup.isInstalled({ key: 'wfrp' })).toBe(true);
        expect(lookup.ruleSystemOf(wfrp).key).toBe(before.key);
        expect(lookup.ruleSystemByKey('d20')?.key).toBe('d20');
    });
});
