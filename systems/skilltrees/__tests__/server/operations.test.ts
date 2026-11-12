import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    db: {
        character: { findFirst: vi.fn(), updateMany: vi.fn() },
        skillTree: { findFirst: vi.fn() },
        race: { findFirst: vi.fn() },
        skill: { findMany: vi.fn() },
        mainSkill: { findMany: vi.fn() },
    },
    access: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: h.db }));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: h.access,
    requireDM: h.access,
}));

vi.mock('@/lib/server/characters/operation-context', async (original) => ({
    ...(await original<object>()),
    withCharacterOperation: (
        _campaignId: string,
        _operation: string,
        _input: object,
        run: () => unknown
    ) => run(),
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import { parseRules } from '@/lib/utils/rules/schema';
import { buildTreeJson } from '@/lib/utils/skills/progression';

// Registry first: the module server must not be the entry of the import cycle.
await import('@/lib/server/systems/registry');

const { CHARACTER_OPERATIONS } = await import(
    '@/lib/server/characters/operations/registry'
);

const { executeCharacterRoute } = await import(
    '@/lib/server/characters/operation-runner'
);

const NAMES = [
    'progression',
    'progression.learn',
    'progression.unlearn',
    'progression.reset',
] as const;

const access = (system: { key: string; modules?: string[] }) => ({
    userId: 'owner',
    isDM: false,
    campaign: {
        id: 'camp',
        kind: 'campaign',
        maxLevel: 20,
        allowPlayerEdit: true,
        members: [{ userId: 'owner', role: 'player' }],
        rules: parseRules({ system }),
    },
});

const tree = {
    id: 'row',
    campaignId: 'camp',
    race: 'Ельф',
    skills: buildTreeJson({
        id: 'json',
        race: 'Ельф',
        branches: [{ id: 'attack', name: 'Напад', color: 'red', outer: [] }],
    }),
};

const call = (name: (typeof NAMES)[number], body: object = {}) =>
    executeCharacterRoute(CHARACTER_OPERATIONS[name], {
        campaignId: 'camp',
        params: { characterId: 'ch' },
        request: new Request('http://x', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
    });

describe('skilltrees character operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.db.character.findFirst.mockResolvedValue({
            id: 'ch',
            level: 3,
            race: 'Ельф',
            skillTreeProgress: {},
            seenLevel: 3,
            controlledBy: 'owner',
        });
        h.db.skillTree.findFirst.mockResolvedValue(tree);
        h.db.race.findFirst.mockResolvedValue(null);
        h.db.skill.findMany.mockResolvedValue([]);
        h.db.mainSkill.findMany.mockResolvedValue([]);
        h.access.mockResolvedValue(access({ key: 'homm' }));
    });

    it('resolves the four operations through the character registry', () => {
        for (const name of NAMES)
            expect(CHARACTER_OPERATIONS[name]?.name).toBe(name);
    });

    it('answers 404 in a campaign without the module', async () => {
        h.access.mockResolvedValue(access({ key: 'dnd5e' }));

        for (const name of NAMES) {
            const response = await call(name, { nodeId: 'n', nodeIds: ['n'] });

            expect(response.status).toBe(404);
            expect(await response.json()).toMatchObject({
                error: API_ERRORS.NOT_FOUND,
            });
        }

        expect(h.db.character.findFirst).not.toHaveBeenCalled();
    });

    it('passes the gate in a homm campaign', async () => {
        const response = await call('progression');

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ treeId: 'row' });
    });

    it('passes the gate with the module added to dnd5e', async () => {
        h.access.mockResolvedValue(
            access({ key: 'dnd5e', modules: ['skilltrees'] })
        );

        expect((await call('progression')).status).toBe(200);
    });

    it('keeps the { reason } body of an unlearnable node as HTTP 422', async () => {
        const response = await call('progression.learn', {
            nodeId: 'missing',
        });

        expect(response.status).toBe(422);
        expect(await response.json()).toEqual({
            reason: expect.any(String),
        });
    });
});
