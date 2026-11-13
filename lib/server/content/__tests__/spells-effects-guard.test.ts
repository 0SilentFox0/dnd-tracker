import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    spell: { create: vi.fn(), update: vi.fn() },
    campaign: { findUnique: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/cache/reference-data', () => ({
    getCachedSpells: vi.fn(async () => []),
}));
vi.mock('@/lib/server/campaigns/campaign-refs', () => ({
    assertCampaignRefs: vi.fn(),
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { spellsResource } from '@/lib/server/content/resources/spells';
import type { Actor } from '@/lib/utils/api/actor';

const actor: Actor = {
    campaignId: 'c1',
    userId: 'u',
    isDM: true,
    via: 'session',
    scopes: null,
};

const morale = { kind: 'flag', flag: 'moraleChance', value: 10 };

const bare = { rules: { system: { key: 'dnd5e' } } };

describe('spell effects follow the campaign composition', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db.campaign.findUnique.mockResolvedValue(bare);
    });

    it('create rejects an effect owned by an inactive module with 422', async () => {
        await expect(
            spellsResource.create(actor, { spellEffects: [morale] } as never)
        ).rejects.toMatchObject({
            message: API_ERRORS.EFFECT_OUTSIDE_COMPOSITION,
            status: 422,
        });
        expect(db.spell.create).not.toHaveBeenCalled();
    });

    it('update rejects a new foreign effect but keeps one the row already has', async () => {
        const existing = { id: 's1', spellEffects: [morale] } as never;

        await expect(
            spellsResource.update(
                actor,
                { id: 's1', spellEffects: [] } as never,
                {
                    spellEffects: [morale],
                } as never
            )
        ).rejects.toMatchObject({ status: 422 });

        await spellsResource.update(actor, existing, {
            spellEffects: [morale],
        } as never);
        expect(db.spell.update).toHaveBeenCalledTimes(1);
    });
});
