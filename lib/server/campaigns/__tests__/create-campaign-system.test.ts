import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    db: {
        campaign: { create: vi.fn() },
        $transaction: vi.fn(),
    },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: m.db }));
vi.mock('@/lib/cache/campaign-list', () => ({
    invalidateCampaignLists: vi.fn(async () => undefined),
}));
vi.mock('@/lib/i18n/translator', () => ({
    getTranslator: vi.fn(async () => (key: string) => key),
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    createCampaignForUser,
    createCampaignFromBundle,
} from '@/lib/server/campaigns/create-campaign';
import { emptyBundle } from '@/lib/server/templates/bundle';
import { RulesSystemError } from '@/lib/utils/rules/schema';

const rulesOf = () => m.db.campaign.create.mock.calls[0][0].data.rules;

beforeEach(() => {
    vi.clearAllMocks();
    m.db.campaign.create.mockResolvedValue({ id: 'c1' });
});

describe('createCampaignForUser with a system selection', () => {
    it('writes the initial rules of the composition', async () => {
        await createCampaignForUser('u1', {
            name: 'N',
            system: { key: 'dnd5e', modules: ['morale'] },
        });

        expect(rulesOf().system).toEqual({
            key: 'dnd5e',
            modules: ['morale'],
        });
        expect(rulesOf().defaultAttacks).toEqual({
            meleeName: 'defaultNames.meleeAttack',
            rangedName: 'defaultNames.rangedAttack',
            weaponName: 'defaultNames.weapon',
        });
        expect(rulesOf().classes).toEqual({ enabled: true });
    });

    it('rejects modules of another base with 422 before creating', async () => {
        const error = await createCampaignForUser('u1', {
            name: 'N',
            system: { key: 'wfrp', modules: ['morale'] },
        }).catch((e) => e);

        expect(error).toMatchObject({
            message: API_ERRORS.SYSTEM_MODULES_INVALID,
            status: 422,
        });
        expect(error.issues[0].path).toEqual(['system', 'modules']);
        expect(m.db.campaign.create).not.toHaveBeenCalled();
    });

    it('a source together with a system is 400, not a silent ignore', async () => {
        await expect(
            createCampaignForUser(
                'u1',
                { name: 'N', system: { key: 'dnd5e' } },
                { source: { bundle: emptyBundle() } as never }
            )
        ).rejects.toMatchObject({
            message: API_ERRORS.SYSTEM_WITH_TEMPLATE,
            status: 400,
        });
        expect(m.db.campaign.create).not.toHaveBeenCalled();
    });

    it('without a template or system is a RulesSystemError and nothing is created', async () => {
        await expect(
            createCampaignForUser('u1', { name: 'N' })
        ).rejects.toThrow(RulesSystemError);
        await expect(
            createCampaignFromBundle({ userId: 'u1', name: 'N', bundle: null })
        ).rejects.toThrow(RulesSystemError);
        expect(m.db.campaign.create).not.toHaveBeenCalled();
    });

    it('a bundle whose rules carry no system is a RulesSystemError', async () => {
        m.db.$transaction.mockImplementation(
            async (fn: (tx: unknown) => unknown) =>
                fn({ campaign: { create: vi.fn() } })
        );

        await expect(
            createCampaignFromBundle({
                userId: 'u1',
                name: 'N',
                bundle: { ...emptyBundle(), rules: {} },
            })
        ).rejects.toThrow(RulesSystemError);
    });
});
