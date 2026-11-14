import { beforeEach, describe, expect, it, vi } from 'vitest';

const fresh = async () => {
    vi.resetModules();

    const install = await import('../install');

    const lookup = await import('../lookup');

    return { install, lookup };
};

const stub = () => {
    const calls: string[] = [];

    const loader = (id: string) => ({
        rules: vi.fn(async () => {
            calls.push(`${id}:rules`);

            return {} as never;
        }),
        ui: vi.fn(async () => {
            calls.push(`${id}:ui`);

            return {} as never;
        }),
    });

    return { calls, loader };
};

describe('loadSystems', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('loads only the modules of the composition with their requires', async () => {
        const { install } = await fresh();

        const { calls, loader } = stub();

        for (const id of Object.keys(install.LOADERS))
            install.LOADERS[id] = loader(id);

        expect(install.isSystemReady({ key: 'wfrp' })).toBe(false);

        await install.loadSystems({ key: 'wfrp' });

        expect(calls.sort()).toEqual(['wfrp:rules', 'wfrp:ui']);
        expect(install.isSystemReady({ key: 'wfrp' })).toBe(true);
        expect(install.isSystemReady({ key: 'dnd5e' })).toBe(false);
    });

    it('an addon pulls the base it requires, and a later load keeps earlier ones', async () => {
        const { install } = await fresh();

        const { calls, loader } = stub();

        for (const id of Object.keys(install.LOADERS))
            install.LOADERS[id] = loader(id);

        await install.loadSystems({ key: 'wfrp' });
        calls.length = 0;
        await install.loadSystems({ key: 'dnd5e', modules: ['morale'] });

        expect(calls.sort()).toEqual([
            'd20:rules',
            'd20:ui',
            'morale:rules',
            'morale:ui',
        ]);
        expect(
            install.isSystemReady({ key: 'dnd5e', modules: ['morale'] })
        ).toBe(true);
        expect(install.isSystemReady({ key: 'wfrp' })).toBe(true);
    });

    it('is idempotent, shares a pending load and notifies subscribers', async () => {
        const { install } = await fresh();

        const { loader } = stub();

        for (const id of Object.keys(install.LOADERS))
            install.LOADERS[id] = loader(id);

        const listener = vi.fn();

        install.subscribeSystems(listener);

        const a = install.loadSystems({ key: 'wfrp' });

        const b = install.loadSystems({ key: 'wfrp' });

        expect(a).toBe(b);
        await a;
        await install.loadSystems({ key: 'wfrp' });
        expect(install.LOADERS.wfrp.rules).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('forgets a failed load so the next call retries', async () => {
        const { install } = await fresh();

        const { loader } = stub();

        for (const id of Object.keys(install.LOADERS))
            install.LOADERS[id] = loader(id);

        vi.mocked(install.LOADERS.wfrp.rules)
            .mockRejectedValueOnce(new Error('chunk'))
            .mockRejectedValueOnce(new Error('chunk'));

        await expect(install.loadSystems({ key: 'wfrp' })).rejects.toThrow(
            'chunk'
        );
        await install.loadSystems({ key: 'wfrp' });
        expect(install.isSystemReady({ key: 'wfrp' })).toBe(true);
    });

    it('retries a transient failure once within the same call', async () => {
        const { install } = await fresh();

        const { loader } = stub();

        for (const id of Object.keys(install.LOADERS))
            install.LOADERS[id] = loader(id);

        vi.mocked(install.LOADERS.wfrp.rules).mockRejectedValueOnce(
            new Error('chunk')
        );

        await install.loadSystems({ key: 'wfrp' });
        expect(install.isSystemReady({ key: 'wfrp' })).toBe(true);
        expect(install.LOADERS.wfrp.rules).toHaveBeenCalledTimes(2);
    });

    it('moduleIdsOf lists the base, addons and their requires', async () => {
        const { install } = await fresh();

        expect(
            install.moduleIdsOf({ key: 'dnd5e', modules: ['morale'] }).sort()
        ).toEqual(['d20', 'morale']);
    });
});
