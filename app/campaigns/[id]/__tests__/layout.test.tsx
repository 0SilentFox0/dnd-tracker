import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    userId: 'u1',
    kind: 'demo',
    wfrp: false,
    role: 'player',
    key: undefined as string | null | undefined,
}));

vi.mock('@/lib/auth', () => ({
    getSessionUserId: () => Promise.resolve(mocks.userId),
}));
vi.mock('@/lib/server/campaigns/access', () => ({
    getCampaignForLayout: () =>
        Promise.resolve({ kind: mocks.kind, members: [{ role: mocks.role }] }),
}));
vi.mock('@/components/onboarding/DemoTourCoordinator', () => ({
    DemoTourCoordinator: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="tour-coordinator">{children}</div>
    ),
}));
vi.mock('@/lib/server/systems/campaign-system', () => ({
    systemOfCampaign: () => {
        const key =
            mocks.key !== undefined ? mocks.key : mocks.wfrp ? 'wfrp' : 'homm';

        return Promise.resolve(key === null ? null : { key });
    },
}));
vi.mock('@/lib/i18n/request-locale', () => ({
    getRequestLocale: () => Promise.resolve('en'),
}));
vi.mock('@/lib/i18n/translator', () => ({
    getTranslator: () => Promise.resolve((key: string) => key),
}));
vi.mock('@/components/common/states', () => ({
    ErrorState: ({ error }: { error: Error }) => (
        <div data-testid="error-state">{error.message}</div>
    ),
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
vi.mock('@/lib/providers/prefetched-query', () => ({
    PrefetchedQuery: ({
        queryKey,
        data,
        children,
    }: {
        queryKey: unknown[];
        data: unknown;
        children: React.ReactNode;
    }) => (
        <div
            data-seed-key={queryKey.join(':')}
            data-seed={JSON.stringify(data)}
        >
            {children}
        </div>
    ),
}));
vi.mock('@/components/notifications/NotificationsHost', () => ({
    NotificationsHost: () => <div data-testid="notifications-host" />,
}));

import CampaignLayout from '@/app/campaigns/[id]/layout';

afterEach(() => {
    mocks.kind = 'demo';
    mocks.wfrp = false;
    mocks.role = 'player';
    mocks.key = undefined;
});

describe('CampaignLayout', () => {
    async function html() {
        return renderToStaticMarkup(
            await CampaignLayout({
                children: <main>campaign</main>,
                params: Promise.resolve({ id: 'c1' }),
            })
        );
    }

    it('mounts tours but skips the member-only notifications host for demos', async () => {
        const markup = await html();

        expect(markup).toContain('tour-coordinator');
        expect(markup).not.toContain('notifications-host');
    });

    it('keeps the notifications host on regular campaigns and does not mount tours', async () => {
        mocks.kind = 'campaign';

        const markup = await html();

        expect(markup).not.toContain('tour-coordinator');
        expect(markup).toContain('notifications-host');
    });

    it('seeds the campaign system for the header from the layout read', async () => {
        mocks.kind = 'campaign';

        const markup = await html();

        expect(markup).toContain('data-seed-key="campaign-system:c1"');
        expect(markup).toContain(
            'data-seed="{&quot;key&quot;:&quot;homm&quot;}"'
        );
    });

    it('shows the unknown-system message instead of the page when rules carry no valid system', async () => {
        mocks.kind = 'campaign';

        for (const key of [null, 'nope']) {
            mocks.key = key;

            const markup = await html();

            expect(markup).toContain('validation.unknownSystem');
            expect(markup).not.toContain('campaign</main>');
        }
    });

    it('adds the wfrpMagic scope only for wfrp campaigns', async () => {
        mocks.kind = 'campaign';

        expect(await html()).not.toContain('wfrpMagic');

        mocks.wfrp = true;

        expect(await html()).toContain(
            'data-scope="wfrpMagic,wfrpAdvancement,wfrpEquipment"'
        );
    });

    it('adds the careers scope for the DM of a wfrp campaign only', async () => {
        mocks.kind = 'campaign';
        mocks.wfrp = true;
        mocks.role = 'dm';

        expect(await html()).toContain(
            'data-scope="wfrpMagic,wfrpAdvancement,wfrpEquipment,wfrpCareers,wfrpCreation,wfrpEquipmentEditor,wfrpTraits,wfrpTables"'
        );

        mocks.wfrp = false;

        expect(await html()).not.toContain('wfrpCareers');
    });
});
