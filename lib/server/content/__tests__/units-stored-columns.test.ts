import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    campaign: { findUnique: vi.fn() },
    race: { count: vi.fn() },
    spell: { count: vi.fn() },
    unit: { update: vi.fn(), findUnique: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/cache/reference-data', () => ({
    getCachedUnits: vi.fn(async () => []),
}));

import '@/lib/server/systems/registry';
import { unitsResource } from '@/lib/server/content/resources/units';
import type { Actor } from '@/lib/utils/api/actor';
import { parseRules } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

const actor: Actor = {
    campaignId: 'c1',
    userId: 'u',
    isDM: true,
    via: 'session',
    scopes: null,
};

describe('units update keeps stored ext columns', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db.campaign.findUnique.mockResolvedValue({
            rules: parseRules({ system: { key: 'wfrp' } }),
        });
        db.unit.update.mockResolvedValue({ id: 'u1' });
        db.unit.findUnique.mockResolvedValue({
            characteristics: { ...DEFAULT_CHARACTERISTICS, ext: { morale: { value: 3 } } },
        });
    });

    it('supplied characteristics without ext keep the stored morale', async () => {
        await unitsResource.update(
            actor,
            {
                id: 'u1',
                knownSpells: [],
                characteristics: DEFAULT_CHARACTERISTICS,
            } as never,
            { characteristics: { ...DEFAULT_CHARACTERISTICS, fate: 2 } } as never
        );

        expect(db.unit.update.mock.calls[0][0].data.characteristics).toMatchObject({
            fate: 2,
            ext: { morale: { value: 3 } },
        });
    });
});
