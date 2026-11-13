import { isValidElement, type ReactElement, type ReactNode } from 'react';
import Link from 'next/link';
import { describe, expect, it, vi } from 'vitest';

import CampaignsPage from '../page';

import { TemplateTiles } from '@/components/campaigns/templates/TemplateTiles';

const findMany = vi.fn();

const findFirst = vi.fn();

vi.mock('@/lib/auth', () => ({ getAuthUser: async () => ({ id: 'owner' }) }));
vi.mock('@/lib/db', () => ({
    prisma: {
        campaign: {
            findMany: (...args: unknown[]) => findMany(...args),
            findFirst: (...args: unknown[]) => findFirst(...args),
        },
    },
}));

function tileProps(node: ReactNode): Record<string, unknown> | null {
    if (!isValidElement(node)) return null;

    const element = node as ReactElement<{ children?: ReactNode }>;

    if (element.type === TemplateTiles)
        return element.props as Record<string, unknown>;

    for (const child of ([] as ReactNode[]).concat(
        element.props.children ?? []
    )) {
        const found = tileProps(child);

        if (found) return found;
    }

    return null;
}

describe('campaign owner template tiles', () => {
    it('omits legacy official uk even for its owner while preserving private same-name templates', async () => {
        const srd = {
            kind: 'template',
            visibility: 'official',
            name: '5e SRD 5.2',
            templateKey: 'srd-5.2',
            description: null,
            rules: { system: { key: 'dnd5e' } },
        };

        findMany
            .mockResolvedValueOnce([
                { ...srd, id: 'canonical', locale: null },
                { ...srd, id: 'legacy', locale: 'uk' },
                { ...srd, id: 'private', visibility: 'private', locale: 'uk' },
            ])
            .mockResolvedValueOnce([]);
        findFirst.mockResolvedValue(null);

        expect(tileProps(await CampaignsPage())?.templates).toEqual([
            expect.objectContaining({ id: 'canonical' }),
            expect.objectContaining({ id: 'private' }),
        ]);
        expect(findMany.mock.calls[0][0].select).toMatchObject({
            kind: true,
            visibility: true,
        });
    });

    it('shows the one shared Demo campaign as a direct link', async () => {
        findMany
            .mockReset()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        findFirst.mockResolvedValueOnce({
            id: 'demo-1',
            name: 'Demo',
            description: 'Try the adventure',
            kind: 'demo',
            maxLevel: 5,
        });

        const tree = await CampaignsPage();

        const links: Array<{ href?: string; children?: ReactNode }> = [];

        const visit = (node: ReactNode) => {
            if (!isValidElement(node)) return;

            const element = node as ReactElement<{
                href?: string;
                children?: ReactNode;
            }>;

            if (element.type === Link) links.push(element.props);

            for (const child of ([] as ReactNode[]).concat(
                element.props.children ?? []
            ))
                visit(child);
        };

        visit(tree);

        expect(links).toContainEqual(
            expect.objectContaining({ href: '/campaigns/demo-1' })
        );
    });
});
