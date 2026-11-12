import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CAMPAIGN_ACTIONS } from '@/lib/server/assistant/actions/campaign';
import { CONTENT_ACTIONS } from '@/lib/server/assistant/actions/content';
import { SCENARIO_ACTIONS } from '@/lib/server/assistant/actions/scenario';
import { createActionCatalog } from '@/lib/server/assistant/catalog';
import {
    campaignState,
    runCampaignOperation,
} from '@/lib/server/campaigns/action-service';
import { emptyBundle } from '@/lib/server/templates/bundle';
import { clearBundleCache } from '@/lib/server/templates/bundle-cache';
import { requestDigest } from '@/lib/utils/battle/store/stable-json';
import type { TranslationsV2 } from '@/lib/utils/templates/i18n/keys';

const h = vi.hoisted(() => ({
    campaign: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    campaignContentHide: { deleteMany: vi.fn() },
    campaignMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(async () => []),
        deleteMany: vi.fn(),
    },
    apiToken: { update: vi.fn(), create: vi.fn() },
    aiThread: { update: vi.fn() },
    $queryRaw: vi.fn<
        (
            query: TemplateStringsArray,
            ...values: unknown[]
        ) => Promise<Array<{ id: string }>>
    >(async () => [{ id: 'c' }]),
    dictionary: {} as TranslationsV2,
    create: vi.fn(),
    export: vi.fn(async () => ({ settings: {}, formatVersion: 1 })),
}));

vi.mock('@/lib/server/templates/dictionaries', () => ({
    templateTranslationsFor: (_key: string, locale: string) =>
        locale === 'uk' ? h.dictionary : {},
}));

vi.mock('@/lib/server/onboarding/facts', () => ({
    readOnboardingSnapshot: vi.fn(async () => ({
        facts: {
            role: 'dm',
            dm: {
                races: 0,
                units: 0,
                players: 0,
                activePlayerCharacters: 0,
                pendingDrafts: 2,
                battles: 0,
                battlesStarted: 0,
                scenarioPages: 0,
                decks: 0,
                tracks: 0,
                aiKeys: 0,
            },
        },
        checklistFlag: null,
    })),
}));
vi.mock('@/lib/i18n/request-locale', () => ({
    getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('@/lib/i18n/translator', () => ({
    getTranslator: vi.fn(async () => (key: string) => `T:${key}`),
}));
vi.mock('@/lib/db', () => ({
    prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) },
}));
vi.mock('@/lib/cache/campaign-list', () => ({
    invalidateCampaignLists: vi.fn(),
}));
vi.mock('@/lib/cache/tags', () => ({
    invalidateReference: vi.fn(),
    invalidateAllReference: vi.fn(),
    ReferenceKind: { RACES: 'races' },
}));
vi.mock('@/lib/server/campaigns/create-campaign', async (importOriginal) => ({
    ...(await importOriginal<
        typeof import('@/lib/server/campaigns/create-campaign')
    >()),
    createCampaignFromBundle: h.create,
    createCampaignForUser: async (
        userId: string,
        data: object,
        options: {
            source?: {
                bundle: unknown;
                id: string;
                contentLocale: string | null;
            };
        } = {}
    ) => ({
        ok: true,
        ...(await h.create({
            userId,
            ...data,
            bundle: options.source?.bundle ?? null,
            createdFromId: options.source?.id ?? null,
            contentLocale: options.source?.contentLocale ?? null,
        })),
    }),
}));
vi.mock('@/lib/server/templates/export-campaign', () => ({
    exportCampaign: h.export,
}));
vi.mock('@/lib/server/templates/publish', () => ({
    latestPublishedVersion: async () => null,
}));
vi.mock('@/lib/server/templates/list-templates', () => ({
    listTemplates: vi.fn(async () => ({ official: [], mine: [] })),
}));

const actor = {
    campaignId: 'c',
    userId: 'dm',
    isDM: true,
    via: 'session' as const,
    scopes: null,
};

const row = {
    id: 'c',
    name: 'Кампанія',
    description: null,
    kind: 'campaign',
    visibility: 'private',
    maxLevel: 10,
    allowPlayerEdit: false,
    status: 'active',
    aiInstructions: 'Пиши українською',
    inviteCode: 'SECRET',
    updatedAt: new Date(1),
    members: [{ role: 'dm' }],
};

describe('campaign action guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearBundleCache();
        h.campaign.findUnique.mockResolvedValue(row);
        h.campaign.update.mockImplementation(async ({ data }) => ({
            ...row,
            ...data,
        }));
        h.create.mockResolvedValue({
            campaign: { id: 'new', name: 'Нова', inviteCode: 'CREATED_SECRET' },
            warnings: [],
        });
    });
    it('cannotRemoveDm', async () => {
        h.campaignMember.findUnique.mockResolvedValue({
            campaignId: 'c',
            userId: 'dm',
            role: 'dm',
        });
        await expect(
            runCampaignOperation(actor, 'members.remove', {
                memberId: 'member',
            })
        ).rejects.toMatchObject({ status: 400 });
        expect(h.campaignMember.deleteMany).not.toHaveBeenCalled();
    });
    it('delete clears the campaign content hides before the campaign row', async () => {
        await runCampaignOperation(actor, 'delete', {});
        expect(h.campaignContentHide.deleteMany).toHaveBeenCalledWith({
            where: { campaignId: 'c' },
        });
        expect(
            h.campaignContentHide.deleteMany.mock.invocationCallOrder[0]
        ).toBeLessThan(h.campaign.delete.mock.invocationCallOrder[0]);
    });
    it('cannotSetOfficialWithoutAdmin', async () => {
        await expect(
            runCampaignOperation(actor, 'template.update', {
                patch: { visibility: 'official' },
            })
        ).rejects.toMatchObject({ status: 403 });
        expect(h.campaign.update).not.toHaveBeenCalled();
    });
    it('inviteNeverInToolOutput', async () => {
        expect(
            JSON.stringify(await runCampaignOperation(actor, 'status', {}))
        ).not.toContain('SECRET');
        expect(
            JSON.stringify(
                await runCampaignOperation(actor, 'clone', { name: 'Нова' })
            )
        ).not.toContain('CREATED_SECRET');
    });
    it('read, instructions and member operations do not bump the content version', async () => {
        await runCampaignOperation(actor, 'status', {});
        await runCampaignOperation(actor, 'instructions.set', {
            instructions: 'Нова',
        });
        expect(
            h.campaign.update.mock.calls.filter(
                ([args]) =>
                    'contentVersion' in ((args as { data: object }).data ?? {})
            )
        ).toEqual([]);
    });
    it('settings change bumps the content version', async () => {
        await runCampaignOperation(actor, 'settings', {
            patch: { name: 'Моя' },
        });
        expect(h.campaign.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { contentVersion: { increment: 1 } },
            })
        );
    });
    it('cloneDoesNotGrantTokenNewScope', async () => {
        const result = await runCampaignOperation(actor, 'clone', {
            name: 'Нова',
        });

        expect(result.data).toMatchObject({
            id: 'new',
            href: '/campaigns/new/dm',
        });
        expect(h.apiToken.create).not.toHaveBeenCalled();
        expect(h.apiToken.update).not.toHaveBeenCalled();
        expect(
            CAMPAIGN_ACTIONS.find((a) => a.id === 'campaign.clone')?.need
                .sessionOnly
        ).toBe(true);
    });
    it('settingsConcurrentEditStale', async () => {
        const expected = requestDigest(
            await campaignState(actor, 'settings', {})
        );

        h.campaign.findUnique.mockResolvedValue({ ...row, name: 'Змінено' });
        await expect(
            runCampaignOperation(
                actor,
                'settings',
                { patch: { name: 'Моя' } },
                expected
            )
        ).rejects.toMatchObject({ status: 409 });
        expect(h.campaign.update).not.toHaveBeenCalled();
    });
    it('instructionsEditIsNotPolicyEdit', async () => {
        await runCampaignOperation(actor, 'instructions.set', {
            instructions: 'Нова',
        });
        expect(h.campaign.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { aiInstructions: 'Нова' } })
        );
        expect(h.aiThread.update).not.toHaveBeenCalled();
        expect(h.apiToken.update).not.toHaveBeenCalled();
    });
    it('onboarding steps carry translated text and the variant', async () => {
        const result = await runCampaignOperation(actor, 'onboarding', {});

        const step = (
            result.data as {
                steps: {
                    id: string;
                    title: string;
                    description: string;
                    variant?: { name: string };
                }[];
            }
        ).steps.find((s) => s.id === 'characters');

        expect(step).toMatchObject({
            title: 'T:checklist.dm.characters.title',
            description: 'T:checklist.dm.characters.descriptionPending',
            variant: { name: 'pending' },
        });
    });
    it('members are bounded and omit private account fields', async () => {
        h.campaignMember.findMany.mockResolvedValue(
            Array.from({ length: 4 }, (_, i) => ({
                id: `m${i}`,
                userId: `u${i}`,
                role: 'player',
                user: { displayName: `Гравець ${i}`, email: 'PRIVATE_EMAIL' },
            })) as never
        );

        const result = await runCampaignOperation(actor, 'members', {
            offset: 1,
            limit: 2,
        });

        expect(result.data).toMatchObject({
            offset: 1,
            items: [{ id: 'm1' }, { id: 'm2' }],
            nextOffset: 3,
        });
        expect(JSON.stringify(result)).not.toContain('PRIVATE_EMAIL');
    });
    it('export is an explicit UI download handoff', () => {
        expect(
            CONTENT_ACTIONS.find((a) => a.id === 'campaign.export')?.effect
        ).toBe('handoff');
    });
    it('create rejects inaccessible templates without importing data', async () => {
        h.campaign.findUnique.mockImplementation(async ({ where }) =>
            where.id === 'foreign'
                ? {
                      id: 'foreign',
                      kind: 'template',
                      visibility: 'private',
                      members: [],
                  }
                : row
        );
        await expect(
            runCampaignOperation(actor, 'create', {
                name: 'Нова',
                templateId: 'foreign',
            })
        ).rejects.toMatchObject({ status: 403 });
        expect(h.create).not.toHaveBeenCalled();
    });
    it('template lock contention gives a retryable conflict before export', async () => {
        h.campaign.findUnique.mockImplementation(async ({ where }) =>
            where.id === 'source'
                ? {
                      id: 'source',
                      kind: 'template',
                      visibility: 'official',
                      members: [],
                  }
                : row
        );
        h.$queryRaw
            .mockResolvedValueOnce([{ id: 'c' }])
            .mockRejectedValueOnce(new Error('locked'));
        await expect(
            runCampaignOperation(actor, 'create', {
                name: 'Нова',
                templateId: 'source',
            })
        ).rejects.toMatchObject({ status: 409 });
        expect(h.export).not.toHaveBeenCalled();
        expect(h.create).not.toHaveBeenCalled();
    });
    it('token cannot execute session-only lifecycle operations', async () => {
        await expect(
            runCampaignOperation(
                { ...actor, via: 'token', scopes: ['campaign:write'] },
                'clone',
                { name: 'Нова' }
            )
        ).rejects.toMatchObject({ status: 403 });
        expect(h.create).not.toHaveBeenCalled();
    });
    it('content scenario and campaign adapters form one catalog without duplicate actions', () => {
        expect(() =>
            createActionCatalog([
                ...CONTENT_ACTIONS,
                ...SCENARIO_ACTIONS,
                ...CAMPAIGN_ACTIONS,
            ])
        ).not.toThrow();
    });
    it('deleteCampaignReceiptSurvivesCascade policy', () => {
        expect(
            CAMPAIGN_ACTIONS.find((a) => a.id === 'campaign.delete')
        ).toMatchObject({
            confirmation: 'always',
            need: { sessionOnly: true },
        });
    });
});

describe('campaign export reads', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearBundleCache();
        h.campaign.findUnique.mockResolvedValue(row);
        h.create.mockResolvedValue({
            campaign: { id: 'new', name: 'Нова' },
            warnings: [],
        });
    });
    it('clone exports once and reuses the hashed bundle for the write', async () => {
        await runCampaignOperation(actor, 'clone', { name: 'Нова' });
        expect(h.export).toHaveBeenCalledTimes(1);
        expect(h.create).toHaveBeenCalledWith(
            expect.objectContaining({
                bundle: { settings: {}, formatVersion: 1 },
                createdFromId: 'c',
            })
        );
    });
    it('template.save exports once', async () => {
        await runCampaignOperation(actor, 'template.save', { name: 'Шаблон' });
        expect(h.export).toHaveBeenCalledTimes(1);
    });
    it('export op does not read the campaign bundle', async () => {
        const result = await runCampaignOperation(actor, 'export', {});

        expect(h.export).not.toHaveBeenCalled();
        expect(result.data).toMatchObject({ formatVersion: 1 });
    });
    it('clone precondition is stale when the campaign changed after preview', async () => {
        const expected = requestDigest(
            await campaignState(actor, 'clone', { name: 'Нова' })
        );

        clearBundleCache();
        h.export.mockResolvedValueOnce({
            settings: { changed: true },
            formatVersion: 1,
        } as never);
        await expect(
            runCampaignOperation(actor, 'clone', { name: 'Нова' }, expected)
        ).rejects.toMatchObject({ status: 409 });
        expect(h.create).not.toHaveBeenCalled();
    });
});

describe('localized campaign action sources', () => {
    const identity = {
        kind: 'template',
        visibility: 'official',
        templateKey: '5e SRD 5.2',
        members: [],
    };

    let canonical: string;

    beforeEach(() => {
        vi.clearAllMocks();
        clearBundleCache();
        canonical = 'canonical';
        h.dictionary = {
            'spells/bless/name': { text: 'Благословення', en: 'Bless' },
        };
        h.campaign.findMany.mockImplementation(async () => [{ id: canonical }]);
        h.campaign.findUnique.mockImplementation(async ({ where }) =>
            where.id === 'c'
                ? { ...row, locale: 'uk' }
                : {
                      ...identity,
                      id: where.id,
                      locale: where.id === 'legacy' ? 'uk' : 'en',
                  }
        );
        h.export.mockResolvedValue({
            ...emptyBundle(),
            spells: [
                { id: 'c' + 's'.repeat(24), slug: 'bless', name: 'Bless' },
            ],
        } as never);
        h.create.mockResolvedValue({
            campaign: { id: 'new', name: 'N' },
            warnings: [],
        });
    });
    it('preview and execute resolve the same language and canonical bundle, exporting once per phase', async () => {
        const input = { name: 'N', templateId: 'legacy' };

        const state = await campaignState(actor, 'create', input);

        h.export.mockClear();
        clearBundleCache();
        await runCampaignOperation(
            actor,
            'create',
            input,
            requestDigest(state)
        );
        expect(h.export).toHaveBeenCalledExactlyOnceWith(
            expect.anything(),
            'canonical'
        );
        expect(h.create).toHaveBeenCalledWith(
            expect.objectContaining({
                createdFromId: 'canonical',
                contentLocale: 'uk',
                bundle: expect.objectContaining({
                    spells: [
                        expect.objectContaining({ name: 'Благословення' }),
                    ],
                }),
            })
        );
        expect(
            h.$queryRaw.mock.calls.some((args) => args[1] === 'canonical')
        ).toBe(true);
        expect(
            h.$queryRaw.mock.calls.some((args) => args[1] === 'legacy')
        ).toBe(false);
    });
    it.each(['translation', 'canonical', 'language'])(
        'invalidates confirmation after a %s change',
        async (change) => {
            const input = {
                name: 'N',
                templateId: 'legacy',
                contentLocale: 'uk',
            };

            const expected = requestDigest(
                await campaignState(actor, 'create', input)
            );

            if (change === 'translation')
                h.dictionary['spells/bless/name'] = {
                    text: 'Нова назва',
                    en: 'Bless',
                };

            if (change === 'canonical') canonical = 'replacement';

            if (change === 'language') input.contentLocale = 'en';

            await expect(
                runCampaignOperation(actor, 'create', input, expected)
            ).rejects.toMatchObject({ status: 409 });
            expect(h.create).not.toHaveBeenCalled();
        }
    );
    it('direct official clone uses selected language and canonical lineage', async () => {
        h.campaign.findUnique.mockImplementation(async ({ where }) => ({
            ...row,
            ...identity,
            id: where.id,
            locale: where.id === 'c' ? 'uk' : 'en',
        }));
        await runCampaignOperation(actor, 'clone', {
            name: 'N',
            contentLocale: 'en',
        });
        expect(h.create).toHaveBeenCalledWith(
            expect.objectContaining({
                createdFromId: 'canonical',
                contentLocale: 'en',
                bundle: expect.objectContaining({
                    spells: [expect.objectContaining({ name: 'Bless' })],
                }),
            })
        );
    });
    it('ordinary clone and save retain stored locale and immediate parent without overlay', async () => {
        for (const operation of ['clone', 'template.save']) {
            await runCampaignOperation(actor, operation, { name: 'N' });
            expect(h.create).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    createdFromId: 'c',
                    contentLocale: 'uk',
                    bundle: expect.objectContaining({
                        spells: [expect.objectContaining({ name: 'Bless' })],
                    }),
                })
            );
        }
    });
    it('saving an official alias retains its raw language/content and strips official identity', async () => {
        h.campaign.findUnique.mockResolvedValue({
            ...row,
            ...identity,
            locale: 'uk',
        });
        await runCampaignOperation(actor, 'template.save', { name: 'N' });
        expect(h.create).toHaveBeenCalledWith(
            expect.objectContaining({
                createdFromId: 'c',
                contentLocale: 'uk',
                kind: 'template',
                visibility: 'private',
                bundle: expect.objectContaining({
                    spells: [expect.objectContaining({ name: 'Bless' })],
                }),
            })
        );
        expect(h.create.mock.calls[0][0]).not.toHaveProperty('templateKey');
    });
});
