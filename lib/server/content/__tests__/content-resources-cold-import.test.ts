import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const MODULES = {
    d20: () => import('@/systems/d20/server'),
    skilltrees: () => import('@/systems/skilltrees/server'),
    artifactsets: () => import('@/systems/artifactsets/server'),
    wfrp: () => import('@/systems/wfrp/server'),
};

describe('content resources import cold', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it.each(Object.keys(MODULES) as (keyof typeof MODULES)[])(
        '%s server after the registry, then the resource index, resolves every kind',
        async (id) => {
            // modules are only ever reached through the registry; d20 handlers pull it in transitively (P3)
            await import('@/lib/server/systems/registry');
            await MODULES[id]();

            const { CONTENT_RESOURCES } = await import(
                '@/lib/server/content/resources'
            );

            const { CONTENT_KINDS } = await import(
                '@/lib/constants/content-kinds'
            );

            for (const kind of CONTENT_KINDS)
                expect(CONTENT_RESOURCES[kind]?.kind, kind).toBe(kind);
        },
        30_000
    );

    it('the resource index first resolves every kind', async () => {
        const { CONTENT_RESOURCES } = await import(
            '@/lib/server/content/resources'
        );

        const { CONTENT_KINDS } = await import('@/lib/constants/content-kinds');

        expect(Object.keys(CONTENT_RESOURCES).sort()).toEqual(
            [...CONTENT_KINDS].sort()
        );
    }, 30_000);
});
