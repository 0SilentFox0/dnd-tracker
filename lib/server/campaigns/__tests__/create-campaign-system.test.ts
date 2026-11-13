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
import { createCampaignForUser } from '@/lib/server/campaigns/create-campaign';

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

    it('without a system keeps the defaultAttacks-only rules', async () => {
        await createCampaignForUser('u1', { name: 'N' });

        expect(Object.keys(rulesOf())).toEqual(['defaultAttacks']);
    });
});
