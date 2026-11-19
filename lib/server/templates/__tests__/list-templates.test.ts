import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listTemplates } from '@/lib/server/templates/list-templates';

const findMany = vi.fn();

vi.mock('@/lib/db', () => ({
    prisma: new Proxy(
        { campaign: { findMany: (...args: unknown[]) => findMany(...args) } },
        {
            get: (target, key: string) =>
                (target as Record<string, unknown>)[key] ?? {
                    groupBy: async () => [],
                },
        }
    ),
}));

describe('listTemplates', () => {
    beforeEach(() => findMany.mockReset());

    it('віддає locale і templateKey у картках і просить їх у select', async () => {
        findMany.mockResolvedValue([
            {
                id: 't1',
                name: '5e SRD 5.2',
                description: null,
                visibility: 'official',
                credits: null,
                locale: 'uk',
                templateKey: 'srd-5.2',
                rules: { system: { key: 'dnd5e' } },
                _count: { units: 2 },
            },
        ]);

        const { official } = await listTemplates('u1');

        expect(official[0]).toMatchObject({
            id: 't1',
            locale: 'uk',
            templateKey: 'srd-5.2',
            counts: { units: 2 },
        });
        expect(findMany.mock.calls[0][0].select).toMatchObject({
            locale: true,
            templateKey: true,
        });
    });

    const srd = (id: string, locale: string | null) => ({
        id,
        kind: 'template',
        name: '5e SRD 5.2',
        description: null,
        visibility: 'official',
        credits: 'CC-BY',
        locale,
        templateKey: 'srd-5.2',
        rules: { system: { key: 'dnd5e' } },
        _count: { classes: 12 },
    });

    it('lists one canonical SRD with both content languages and preserves private same-key templates', async () => {
        findMany
            .mockResolvedValueOnce([srd('english', null), srd('legacy', 'uk')])
            .mockResolvedValueOnce([
                { ...srd('private', 'uk'), visibility: 'private' },
            ]);

        const result = await listTemplates('owner');

        expect(result.official).toEqual([
            expect.objectContaining({
                id: 'english',
                availableLocales: ['en', 'uk'],
                counts: expect.objectContaining({ classes: 12 }),
            }),
        ]);
        expect(result.mine).toEqual([
            expect.objectContaining({ id: 'private', locale: 'uk' }),
        ]);
        expect(result.mine[0]).not.toHaveProperty('availableLocales');
        expect(findMany.mock.calls[0][0].select).toMatchObject({
            kind: true,
            visibility: true,
        });
    });

    it('rejects ambiguous canonical SRD sources rather than silently grouping them', async () => {
        findMany
            .mockResolvedValueOnce([
                srd('english', 'en'),
                srd('old-english', null),
            ])
            .mockResolvedValueOnce([]);
        await expect(listTemplates('owner')).rejects.toMatchObject({
            status: 409,
        });
    });

    const grim = (id: string, locale: string | null) => ({
        ...srd(id, locale),
        name: 'Grim d100 (5e)',
        templateKey: 'grim-d100',
        _count: { careers: 3 },
    });

    it('offers both content languages for the canonical Grim', async () => {
        findMany
            .mockResolvedValueOnce([grim('grim', 'en')])
            .mockResolvedValueOnce([]);
        expect((await listTemplates('owner')).official[0]).toMatchObject({
            id: 'grim',
            availableLocales: ['en', 'uk'],
        });
    });

    it('rejects two canonical Grim sources but allows one SRD plus one Grim', async () => {
        findMany
            .mockResolvedValueOnce([grim('a', 'en'), grim('b', null)])
            .mockResolvedValueOnce([]);
        await expect(listTemplates('owner')).rejects.toMatchObject({
            status: 409,
        });
        findMany
            .mockResolvedValueOnce([srd('srd', 'en'), grim('grim', 'en')])
            .mockResolvedValueOnce([]);
        expect((await listTemplates('owner')).official).toHaveLength(2);
    });
});

describe('template card counts', () => {
    it('selects _count only for relations that exist on Campaign', async () => {
        const { Prisma } = await import('@prisma/client');

        const { RELATION_TABLES } = await import('../list-templates');

        const relations = new Set(
            Prisma.dmmf.datamodel.models
                .find((m) => m.name === 'Campaign')
                ?.fields.filter((f) => f.kind === 'object' && f.isList)
                .map((f) => f.name)
        );

        expect(RELATION_TABLES.length).toBeGreaterThan(0);

        for (const t of RELATION_TABLES)
            expect(relations.has(t.key)).toBe(true);
    });

    it('every detached bundle table has a model with campaignId to count by', async () => {
        const { Prisma } = await import('@prisma/client');

        const { DETACHED_TABLES } = await import('../list-templates');

        for (const t of DETACHED_TABLES) {
            const model = Prisma.dmmf.datamodel.models.find(
                (m) => m.name === t.model
            );

            expect(
                model?.fields.some((f) => f.name === 'campaignId'),
                t.key
            ).toBe(true);
        }

        expect(DETACHED_TABLES.map((t) => t.key)).toContain('skillTrees');
    });

    it('merges groupBy counts of detached tables into the card', async () => {
        findMany.mockReset();

        findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
            {
                id: 'c1',
                name: 'T',
                description: null,
                visibility: 'private',
                kind: 'template',
                credits: null,
                locale: null,
                templateKey: null,
                rules: { system: { key: 'dnd5e' } },
                _count: { units: 1 },
            },
        ]);

        const { mine } = await listTemplates('u1');

        expect(mine[0].counts).toMatchObject({ units: 1, skillTrees: 0 });
    });
});
