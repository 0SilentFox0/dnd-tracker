import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/lib/server/systems/registry';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { getBattleOperation } from '@/lib/server/battles/operations';
import { defaultPipelineDeps } from '@/lib/server/battles/pipeline-deps';
import type { LoadedBattle } from '@/lib/utils/battle/store';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.mock('@/lib/server/battles/pipeline-deps', () => ({
    defaultPipelineDeps: {
        getUserId: vi.fn(),
        rateLimit: vi.fn(),
        loadBattle: vi.fn(),
        saveBattle: vi.fn(),
        publish: vi.fn(),
        loadRecentEvents: vi.fn(),
        loadKnowledge: vi.fn(),
        logLocale: async () => 'en',
    },
    defaultReadDeps: {},
}));

const deps = vi.mocked(defaultPipelineDeps);

const BATTLES_DIR = path.resolve(
    __dirname,
    '../campaigns/[id]/battles/[battleId]'
);

type RouteCase = { name: string; operation: string; file: string };

const routes: RouteCase[] = readdirSync(BATTLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
        const file = path.join(BATTLES_DIR, entry.name, 'route.ts');

        let source: string;

        try {
            source = readFileSync(file, 'utf8');
        } catch {
            return [];
        }

        if (!source.includes('runBattleMutation')) return [];

        const operation = /operation:\s*'([^']+)'/.exec(source)?.[1];

        return [{ name: entry.name, operation: operation ?? '', file }];
    });

const params = { params: Promise.resolve({ id: 'c1', battleId: 'b1' }) };

type LoadedWithMember = LoadedBattle & { isMember: boolean };

function loaded(over: Partial<LoadedWithMember> = {}): LoadedWithMember {
    return {
        scene: {
            id: 'b1',
            campaignId: 'c1',
            status: 'active',
            round: 1,
            turnIndex: 0,
            version: 2,
            eventSeq: 3,
            pendingChoice: null,
            startedAt: null,
            completedAt: null,
        },
        meta: {
            name: 'Battle',
            description: null,
            setup: [],
            friendlyFire: false,
            rules: DEFAULT_RULES,
            critChoiceByDm: false,
            map: null,
            createdAt: new Date('2026-01-01'),
        },
        participants: [],
        pending: [],
        isDM: false,
        isMember: true,
        ...over,
    } as unknown as LoadedWithMember;
}

async function callRoute(route: RouteCase, body: string) {
    const { POST } = (await import(
        /* @vite-ignore */ route.file.replace(/\.ts$/, '')
    )) as {
        POST: (req: Request, ctx: typeof params) => Promise<Response>;
    };

    return POST(new Request('http://x/api', { method: 'POST', body }), params);
}

const hasSchemaRejectingEmptyBody = async (route: RouteCase) => {
    const { schema } = await getBattleOperation(route.operation, {
        id: 'c1',
        battleId: 'b1',
    });

    return schema !== undefined && !schema.safeParse(undefined).success;
};

beforeEach(() => {
    vi.clearAllMocks();
    deps.getUserId.mockResolvedValue('user-1');
    deps.rateLimit.mockResolvedValue({
        allowed: true,
        count: 1,
        limit: 30,
        retryAfterSeconds: 10,
    });
    deps.loadBattle.mockResolvedValue(loaded());
    deps.loadRecentEvents.mockResolvedValue([]);
});

describe('battle mutation routes: discovery', () => {
    it('finds the thin runBattleMutation wrappers on disk', () => {
        expect(routes.length).toBeGreaterThanOrEqual(31);
        expect(routes.every((r) => r.operation !== '')).toBe(true);
    });

    it('lists operations whose schema accepts an empty body (400 case skipped on purpose)', async () => {
        const lenient: string[] = [];

        for (const route of routes)
            if (!(await hasSchemaRejectingEmptyBody(route)))
                lenient.push(route.operation);

        expect(lenient.sort()).toEqual(['reset', 'start']);
    });

    it('every discovered operation is registered', async () => {
        for (const route of routes)
            await expect(
                getBattleOperation(route.operation, {
                    id: 'c1',
                    battleId: 'b1',
                })
            ).resolves.toBeDefined();
    });
});

describe.each(routes)('POST battles/[battleId]/$name', (route) => {
    it('401 without a session, and never touches the battle', async () => {
        deps.getUserId.mockResolvedValue(null);

        const res = await callRoute(route, '{}');

        expect(res.status).toBe(401);
        expect(await res.json()).toMatchObject({
            error: expect.any(String),
        });
        expect(deps.loadBattle).not.toHaveBeenCalled();
        expect(deps.saveBattle).not.toHaveBeenCalled();
        expect(deps.publish).not.toHaveBeenCalled();
    });

    it('404 when the battle is not found in this campaign', async () => {
        deps.loadBattle.mockResolvedValue(null);

        const res = await callRoute(route, '{}');

        expect(res.status).toBe(404);
        expect(await res.json()).toMatchObject({
            error: API_ERRORS.NOT_FOUND,
        });
        expect(deps.loadBattle).toHaveBeenCalledWith({
            battleId: 'b1',
            campaignId: 'c1',
            userId: 'user-1',
        });
        expect(deps.saveBattle).not.toHaveBeenCalled();
        expect(deps.publish).not.toHaveBeenCalled();
    });

    it('403 for a user who is not a member of the campaign', async () => {
        deps.loadBattle.mockResolvedValue(loaded({ isMember: false }));

        const res = await callRoute(route, '{}');

        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({
            error: API_ERRORS.FORBIDDEN,
        });
        expect(deps.saveBattle).not.toHaveBeenCalled();
        expect(deps.publish).not.toHaveBeenCalled();
    });

    it.each(['', 'not json', '{"broken":'])(
        '400 with issues on an unusable body (%j), when the operation has a schema',
        async (body) => {
            if (!(await hasSchemaRejectingEmptyBody(route))) return;

            const res = await callRoute(route, body);

            expect(res.status).toBe(400);
            expect(await res.json()).toMatchObject({
                error: API_ERRORS.INVALID_BODY,
                issues: expect.any(Array),
            });
            expect(deps.saveBattle).not.toHaveBeenCalled();
            expect(deps.publish).not.toHaveBeenCalled();
        }
    );
});
