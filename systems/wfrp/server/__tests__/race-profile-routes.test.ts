import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as apiAuth from '@/lib/utils/api/api-auth';
import { parseRules } from '@/lib/utils/rules/schema';
import {
    listRaceProfiles,
    saveRaceProfile,
} from '@/systems/wfrp/server/race-profile';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: vi.fn(),
    requireDM: vi.fn(),
}));
vi.mock('@/systems/wfrp/server/race-profile', () => ({
    listRaceProfiles: vi.fn(),
    saveRaceProfile: vi.fn(),
}));

type Routes = typeof import('@/lib/server/systems/routes');

let routes: Routes;

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    routes = await import('@/lib/server/systems/routes');
}, 30_000);

const valid = { move: 4, fate: 2, careerTable: [{ max: 100, careerId: 'c1' }] };

const access = (system: 'wfrp' | 'dnd5e', isDM: boolean) =>
    ({
        userId: 'u',
        isDM,
        campaign: {
            id: 'camp',
            kind: 'standard',
            maxLevel: 20,
            allowPlayerEdit: false,
            rules: parseRules({ system: { key: system } }),
            members: [{ userId: 'u', role: isDM ? 'dm' : 'player' }],
        },
    }) as never;

const get = () =>
    routes.runSystemRoute(
        'campaign',
        new Request('http://x/api', { method: 'GET' }),
        { id: 'camp', action: 'race-profiles' }
    );

const put = (body: unknown, search = '?raceId=r1') =>
    routes.runSystemRoute(
        'campaign',
        new Request(`http://x/api${search}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        }),
        { id: 'camp', action: 'race-profile' }
    );

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
        access('wfrp', true)
    );
});

describe('race-profiles (system route)', () => {
    it("returns the campaign's profiles to a player", async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('wfrp', false)
        );
        vi.mocked(listRaceProfiles).mockResolvedValue([
            { raceId: 'r1', profile: {} as never },
        ]);

        const response = await get();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            profiles: [{ raceId: 'r1', profile: {} }],
        });
        expect(listRaceProfiles).toHaveBeenCalledWith('camp');
    });

    it('is not in the composition of dnd5e', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('dnd5e', true)
        );

        expect((await get()).status).toBe(404);
        expect(listRaceProfiles).not.toHaveBeenCalled();
    });
});

describe('race-profile (system route)', () => {
    it('403 for a player', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('wfrp', false)
        );

        expect((await put(valid)).status).toBe(403);
        expect(saveRaceProfile).not.toHaveBeenCalled();
    });

    it('400 without a raceId', async () => {
        expect((await put(valid, '')).status).toBe(400);
        expect(saveRaceProfile).not.toHaveBeenCalled();
    });

    it('400 for an invalid profile', async () => {
        expect(
            (
                await put({
                    ...valid,
                    careerTable: [{ max: 50, careerId: 'c1' }],
                })
            ).status
        ).toBe(400);
        expect(saveRaceProfile).not.toHaveBeenCalled();
    });

    it('404 in dnd5e', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(
            access('dnd5e', true)
        );

        expect((await put(valid)).status).toBe(404);
        expect(saveRaceProfile).not.toHaveBeenCalled();
    });

    it('saves the parsed profile with defaults and returns the item', async () => {
        vi.mocked(saveRaceProfile).mockImplementation(
            async (_c, raceId, profile) => ({ raceId, profile })
        );

        const response = await put(valid);

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            raceId: 'r1',
            profile: { move: 4, fate: 2, talents: [], extraWounds: 0 },
        });
        expect(saveRaceProfile).toHaveBeenCalledWith(
            'camp',
            'r1',
            expect.objectContaining({ careerTable: valid.careerTable })
        );
    });
});
