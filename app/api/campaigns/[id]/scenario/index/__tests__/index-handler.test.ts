import { beforeEach, describe, expect, it, vi } from 'vitest';

import { scenarioIndexHandler } from '../index-handler';

const mocks = vi.hoisted(() => ({ access: vi.fn(), load: vi.fn() }));

vi.mock('@/lib/server/scenario/index-store', () => ({
    loadScenarioIndex: mocks.load,
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignDMOrDemoAccess: mocks.access,
}));

describe('scenario index read access', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.access.mockResolvedValue({
            userId: 'u1',
            isDM: false,
            isDemo: true,
        });
        mocks.load.mockResolvedValue({ nodes: [{ id: 'demo-page' }] });
    });

    it('returns the scenario graph index for an authenticated Demo visitor', async () => {
        const response = await scenarioIndexHandler('demo');

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ nodes: [{ id: 'demo-page' }] });
    });
});
