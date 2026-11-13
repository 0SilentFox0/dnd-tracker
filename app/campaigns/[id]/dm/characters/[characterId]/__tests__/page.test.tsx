import type { ReactElement } from 'react';
import { NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { campaignKeys } from '@/lib/hooks/campaigns/keys';
import { characterKeys } from '@/lib/hooks/characters/keys';
import { PrefetchedQuery } from '@/lib/providers/prefetched-query';

const readCharacterSheet = vi.hoisted(() => vi.fn());

const wfrp = vi.hoisted(() => ({ is: false }));

vi.mock('@/lib/server/campaigns/access', () => ({
    requireCampaignDMOrDemo: vi.fn(async () => ({
        campaign: { maxLevel: 20 },
        userId: 'u1',
        isDemo: false,
    })),
}));
vi.mock('@/lib/server/characters/core/read-sheet', () => ({
    readCharacterSheet,
}));
vi.mock('@/lib/server/campaigns/rules', () => ({
    loadRules: vi.fn(async () => ({ morale: { enabled: false } })),
}));
vi.mock('@/lib/server/systems/campaign-system', () => ({
    systemOfCampaign: () =>
        Promise.resolve({ key: wfrp.is ? 'wfrp' : 'homm' }),
}));
vi.mock('@/lib/i18n/extend-locale-scope', () => ({
    ExtendLocaleScope: ({
        children,
        namespaces,
    }: {
        children: React.ReactNode;
        namespaces: string[];
    }) => <div data-scope={namespaces.join(',')}>{children}</div>,
}));
vi.mock('@/components/character-profile', () => ({
    CharacterProfile: () => null,
}));

import DmCharacterPage from '../page';

describe('DmCharacterPage (server)', () => {
    it('кладе в кеш лист із GET-обробника', async () => {
        const sheet = { identity: { name: 'Ґоблін' } };

        readCharacterSheet.mockResolvedValue(NextResponse.json(sheet));

        const el = (await DmCharacterPage({
            params: Promise.resolve({ id: 'c1', characterId: 'ch9' }),
            searchParams: Promise.resolve({}),
        })) as ReactElement<{
            queryKey: unknown;
            data: unknown;
            children: ReactElement<{
                queryKey: unknown;
                data: unknown;
                children: ReactElement<{ canEdit: boolean }>;
            }>;
        }>;

        expect(readCharacterSheet).toHaveBeenCalledWith({
            id: 'c1',
            characterId: 'ch9',
        });
        expect(el.type).toBe(PrefetchedQuery);
        expect(el.props.queryKey).toEqual(characterKeys.sheet('c1', 'ch9'));
        expect(el.props.data).toEqual(sheet);
        expect(el.props.children.props.queryKey).toEqual(
            campaignKeys.rules('c1')
        );
        expect(el.props.children.props.data).toEqual({
            morale: { enabled: false },
        });
        expect(el.props.children.props.children.props.canEdit).toBe(true);
    });

    it('wfrp: профіль у scope wfrpDowntime+wfrpCorruption', async () => {
        readCharacterSheet.mockResolvedValue(NextResponse.json({}));
        wfrp.is = true;

        const el = (await DmCharacterPage({
            params: Promise.resolve({ id: 'c1', characterId: 'ch9' }),
            searchParams: Promise.resolve({}),
        })) as ReactElement<{ namespaces: string[]; children: ReactElement }>;

        expect(el.props.namespaces).toEqual(['wfrpDowntime', 'wfrpCorruption']);
        expect(el.props.children.type).toBe(PrefetchedQuery);

        wfrp.is = false;
    });
});
