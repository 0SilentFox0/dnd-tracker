import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const loadRules = vi.hoisted(() => vi.fn());

const del = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/cache/tags', () => ({ invalidateReference: vi.fn() }));
vi.mock('@/lib/server/campaigns/rules', () => ({ loadRules }));
vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: async (callback: (tx: object) => unknown) =>
            callback({
                $queryRaw: async () => [{ id: 'c1' }],
                campaign: { update: async () => ({ contentVersion: 1 }) },
            }),
        compendiumEntry: { deleteMany: del },
    },
}));

import type { ContentKind } from '@/lib/constants/content-kinds';
import { defineResource } from '@/lib/server/content/define-resource';
import { ContentError } from '@/lib/server/content/errors';
import {
    createContent,
    getContent,
    listContent,
    removeAllContent,
    removeContent,
    updateContent,
} from '@/lib/server/content/service';
import { parseRules } from '@/lib/utils/rules/schema';

type Row = { id: string; campaignId: string; name: string };

const resourceOf = (kind: ContentKind) =>
    defineResource<Row, { name: string }, { name?: string }>({
        kind,
        listFields: [],
        idParam: 'thingId',
        label: 'Test',
        description: '',
        path: '/things',
        schemas: {
            create: z.object({ name: z.string().min(1) }),
            update: z.object({ name: z.string().min(1).optional() }),
        },
        access: { list: 'member', item: 'member' },
        invalidates: [],
        notFound: 'none',
        list: async () => [{ id: 'a', campaignId: 'c1', name: 'A' }],
        find: async () => ({ id: 'a', campaignId: 'c1', name: 'A' }),
        create: async (actor, input) => ({
            id: 'n',
            campaignId: actor.campaignId,
            ...input,
        }),
        update: async (_a, existing, input) => ({ ...existing, ...input }),
        remove: async () => undefined,
        removeAll: async () => 1,
    });

const actor = {
    campaignId: 'c1',
    userId: 'u1',
    isDM: true,
    via: 'session' as const,
    scopes: null,
};

const rules = (system: { key: string; modules?: string[] }) =>
    parseRules({ system });

const notFound = async (p: Promise<unknown>) => {
    const error = await p.then(
        () => null,
        (e: unknown) => e
    );

    expect(error).toBeInstanceOf(ContentError);
    expect((error as ContentError).status).toBe(404);
};

describe('content kinds follow the campaign composition (D15)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('main-skills in a bare dnd5e: list is empty, the rest is 404', async () => {
        loadRules.mockResolvedValue(rules({ key: 'dnd5e' }));

        const r = resourceOf('main-skills');

        expect(await listContent(r, actor, new URLSearchParams())).toEqual([]);

        await notFound(getContent(r, actor, 'a'));
        await notFound(createContent(r, actor, { name: 'N' }));
        await notFound(updateContent(r, actor, 'a', { name: 'N' }));
        await notFound(removeContent(r, actor, 'a'));
        await notFound(removeAllContent(r, actor));
        expect(del).not.toHaveBeenCalled();
    });

    it('main-skills in homm work as before', async () => {
        loadRules.mockResolvedValue(rules({ key: 'homm' }));

        const r = resourceOf('main-skills');

        expect(await listContent(r, actor, new URLSearchParams())).toHaveLength(
            1
        );
        expect(await getContent(r, actor, 'a')).toMatchObject({ id: 'a' });
        expect(await createContent(r, actor, { name: 'N' })).toMatchObject({
            id: 'n',
        });
    });

    it('careers in dnd5e are hidden, classes in wfrp are hidden', async () => {
        loadRules.mockResolvedValue(rules({ key: 'dnd5e' }));

        expect(
            await listContent(
                resourceOf('careers'),
                actor,
                new URLSearchParams()
            )
        ).toEqual([]);

        loadRules.mockResolvedValue(rules({ key: 'wfrp' }));

        expect(
            await listContent(
                resourceOf('classes'),
                actor,
                new URLSearchParams()
            )
        ).toEqual([]);
        await notFound(getContent(resourceOf('classes'), actor, 'a'));
        expect(
            await listContent(
                resourceOf('careers'),
                actor,
                new URLSearchParams()
            )
        ).toHaveLength(1);
    });

    it('core kinds never load the rules', async () => {
        const r = resourceOf('units');

        await listContent(r, actor, new URLSearchParams());
        await getContent(r, actor, 'a');

        expect(loadRules).not.toHaveBeenCalled();
    });
});
