import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignRole, CampaignStatus } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';

const session = vi.hoisted(() => ({ userId: 'player' }));

vi.mock('@/lib/cache/kv', () => ({
    kvGet: vi.fn(async () => null),
    kvSet: vi.fn(),
    kvDel: vi.fn(),
}));
vi.mock('@/lib/auth', async (orig) => ({
    ...(await orig<object>()),
    getSessionUserId: vi.fn(async () => session.userId),
}));
vi.mock('@/lib/utils/api/api-auth', async (orig) => ({
    ...(await orig<object>()),
    requireAuth: vi.fn(async () => ({
        userId: session.userId,
        authUser: {},
    })),
    requireAuthUser: vi.fn(async () => ({
        userId: session.userId,
        authUser: {},
    })),
}));
vi.mock('@/lib/db', () => ({
    prisma: { campaign: { findUnique: vi.fn(), findFirst: vi.fn() } },
}));

const roleOf: Record<string, string> = {
    player: CampaignRole.PLAYER,
    dm: CampaignRole.DM,
};

type Args = { omit?: { aiInstructions?: boolean; inviteCode?: boolean } };

const CODE = 'SECRET-CODE';

// mimics Prisma: a column in `omit` is not returned
const honoringOmit = async (args: Args) => {
    const row: Record<string, unknown> = {
        id: 'c1',
        name: 'C',
        inviteCode: CODE,
        aiInstructions: 'x',
        status: CampaignStatus.ACTIVE,
        rules: { system: { key: 'homm' } },
        members: [{ userId: session.userId, role: roleOf[session.userId] }],
    };

    for (const key of Object.keys(args?.omit ?? {})) delete row[key];

    return row;
};

const get = async (userId: string) => {
    session.userId = userId;

    const { GET } = await import('@/app/api/campaigns/[id]/route');

    return GET(new Request('http://x'), {
        params: Promise.resolve({ id: 'c1' }),
    });
};

describe('GET /api/campaigns/[id] invite code', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.campaign.findUnique).mockImplementation(
            honoringOmit as never
        );
        vi.mocked(prisma.campaign.findFirst).mockImplementation(
            honoringOmit as never
        );
    });

    it('is not returned to a player', async () => {
        const res = await get('player');

        expect(res.status).toBe(200);
        expect(JSON.stringify(await res.json())).not.toContain(CODE);
    });

    it('is returned to the DM', async () => {
        const res = await get('dm');

        expect(res.status).toBe(200);
        expect((await res.json()).inviteCode).toBe(CODE);
    });
});
