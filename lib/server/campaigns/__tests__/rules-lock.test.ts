import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    campaign: { findUnique: vi.fn(), update: vi.fn() },
    character: { count: vi.fn() },
    unit: { count: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/server/content/access', () => ({ assertCan: vi.fn() }));
vi.mock('@/lib/server/content/write', () => ({
    withCampaignContentWrite: (_id: string, cb: (tx: unknown) => unknown) =>
        cb(db),
}));
vi.mock('@/lib/server/campaigns/condition-usage', () => ({
    findCustomConditionUsage: vi.fn(),
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    readCampaignRules,
    updateCampaignRules,
} from '@/lib/server/campaigns/rules';
import type { Actor } from '@/lib/utils/api/actor';

const actor = { campaignId: 'c1' } as Actor;

const content = (characters: number, units = 0) => {
    db.character.count.mockResolvedValue(characters);
    db.unit.count.mockResolvedValue(units);
};

describe('rule system lock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db.campaign.findUnique.mockResolvedValue({
            rules: { system: { key: 'homm' } },
        });
        db.campaign.update.mockResolvedValue({});
    });

    it('empty campaign can change the system', async () => {
        content(0);

        const view = await updateCampaignRules(actor, {
            system: { key: 'wfrp' },
        });

        expect(view.system).toEqual({ key: 'wfrp' });
        expect(view.systemLocked).toBe(false);
    });

    it('a character locks the key change with 409', async () => {
        content(1);

        await expect(
            updateCampaignRules(actor, { system: { key: 'wfrp' } })
        ).rejects.toMatchObject({
            message: API_ERRORS.SYSTEM_LOCKED,
            status: 409,
        });
        expect(db.campaign.update).not.toHaveBeenCalled();
    });

    it('a unit alone locks it too', async () => {
        content(0, 2);

        await expect(
            updateCampaignRules(actor, { system: { key: 'dnd5e' } })
        ).rejects.toMatchObject({ status: 409 });
    });

    it('other sections stay editable while locked', async () => {
        content(1);

        const view = await updateCampaignRules(actor, { morale: { cap: 5 } });

        expect(view.morale.cap).toBe(5);
        expect(view.systemLocked).toBe(true);
    });

    it('the same key passes while locked', async () => {
        content(1);

        await expect(
            updateCampaignRules(actor, { system: { key: 'homm' } })
        ).resolves.toMatchObject({ systemLocked: true });
    });

    it('read reports the lock', async () => {
        content(1);

        expect((await readCampaignRules(actor)).systemLocked).toBe(true);

        content(0);

        expect((await readCampaignRules(actor)).systemLocked).toBe(false);
    });
});
