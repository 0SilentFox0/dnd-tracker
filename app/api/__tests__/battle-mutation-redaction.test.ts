import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/lib/server/systems/registry';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { battleChannelName, battleDmChannelName } from '@/lib/pusher/channels';
import { participant } from '@/lib/server/battles/__tests__/mutations/fixtures';
import { defaultPipelineDeps } from '@/lib/server/battles/pipeline-deps';
import type {
    BattleDelta,
    BattleMutationOutcome,
    LoadedBattle,
} from '@/lib/utils/battle/store';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleParticipant } from '@/types/battle';

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

const params = { params: Promise.resolve({ id: 'c1', battleId: 'b1' }) };

const SECRET_AC = 17;

const SECRET_TEMP_HP = 7;

const SECRET_EXT = 'lair-secret-marker';

const hero: BattleParticipant = participant(
    'hero',
    { controlledBy: 'user-1' },
    {
        battleData: {
            attacks: [
                {
                    id: 'sword',
                    name: 'Sword',
                    type: AttackType.MELEE,
                    attackBonus: 5,
                    damageDice: '1d8',
                    damageType: 'slashing',
                },
            ],
            activeEffects: [],
            equippedArtifacts: [],
            resolvedAbilities: [],
            position: { x: 0, y: 0 },
        },
    }
);

const ogre: BattleParticipant = participant(
    'ogre',
    { side: ParticipantSide.ENEMY, controlledBy: 'dm', name: 'Ogre' },
    {
        combatStats: {
            ...participant('x').combatStats,
            maxHp: 100,
            currentHp: 100,
            tempHp: SECRET_TEMP_HP,
            armorClass: SECRET_AC,
        },
        battleData: {
            attacks: [],
            activeEffects: [],
            equippedArtifacts: [],
            resolvedAbilities: [],
            position: { x: 1, y: 0 },
            hpMultiplier: 1.5,
            system: { key: 'd20', data: { ext: { lair: SECRET_EXT } } },
        },
    }
);

function loaded(): LoadedBattle & { isMember: boolean } {
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
            map: { cols: 10, rows: 10, background: null, opacity: 0.3 },
            createdAt: new Date('2026-01-01'),
        },
        participants: [hero, ogre],
        pending: [],
        isDM: false,
        isMember: true,
    };
}

function savedWith(fullIds: 'all' | 'none') {
    return async (
        _before: LoadedBattle,
        outcome: BattleMutationOutcome
    ): Promise<BattleDelta> => ({
        battleId: 'b1',
        version: 3,
        scene: {
            status: 'active',
            round: 1,
            turnIndex: 0,
            pendingChoice: null,
        },
        upserted: outcome.participants,
        fullIds:
            fullIds === 'all'
                ? outcome.participants.map((p) => p.basicInfo.id)
                : [],
        removed: [],
        events: [],
    });
}

const post = (body: unknown) =>
    new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) });

const leaks = (json: string) => {
    expect(json).not.toContain(SECRET_EXT);
    expect(json).not.toContain('hpMultiplier');
    expect(json).not.toContain(`"armorClass":${SECRET_AC}`);
    expect(json).not.toContain(`"tempHp":${SECRET_TEMP_HP}`);
};

type Published = { channel: string; event: string; payload: unknown }[];

async function callAttack() {
    const { POST } = await import(
        '@/app/api/campaigns/[id]/battles/[battleId]/attack/route'
    );

    return POST(
        post({
            attackerId: 'hero',
            targetId: 'ogre',
            attackId: 'sword',
            d20Roll: 15,
            damageRolls: [6],
        }),
        params
    );
}

async function callMove() {
    const { POST } = await import(
        '@/app/api/campaigns/[id]/battles/[battleId]/move/route'
    );

    return POST(post({ participantId: 'hero', to: { x: 0, y: 1 } }), params);
}

beforeEach(() => {
    vi.clearAllMocks();
    deps.getUserId.mockResolvedValue('user-1');
    deps.loadBattle.mockResolvedValue(loaded());
    deps.saveBattle.mockImplementation(savedWith('none'));
    deps.loadRecentEvents.mockResolvedValue([]);
});

describe.each([
    ['attack', callAttack],
    ['move', callMove],
])('POST /battles/[battleId]/%s: player view', (_name, call) => {
    it.each(['none', 'all'] as const)(
        'reply to a player carries no hidden enemy fields (fullIds: %s)',
        async (fullIds) => {
            deps.saveBattle.mockImplementation(savedWith(fullIds));

            const res = await call();

            expect(res.status).toBe(200);
            leaks(JSON.stringify(await res.json()));
        }
    );

    it.each(['none', 'all'] as const)(
        'public Pusher payload carries no hidden enemy fields (fullIds: %s)',
        async (fullIds) => {
            deps.saveBattle.mockImplementation(savedWith(fullIds));

            const res = await call();

            expect(res.status).toBe(200);

            const messages = deps.publish.mock.calls[0][0] as Published;

            const pub = messages.find(
                (m) => m.channel === battleChannelName('b1')
            );

            expect(pub?.event).toBe('battle-delta');
            leaks(JSON.stringify(pub?.payload));
        }
    );
});

it('control: the DM channel does carry the secrets the public one strips', async () => {
    deps.saveBattle.mockImplementation(savedWith('all'));

    await callMove();

    const messages = deps.publish.mock.calls[0][0] as Published;

    const dm = messages.find((m) => m.channel === battleDmChannelName('b1'));

    expect(JSON.stringify(dm?.payload)).toContain(SECRET_EXT);
});

type AttackReply = {
    delta: {
        patched?: { id: string; combatStats?: Record<string, number> }[];
    };
};

const ogrePatch = (reply: AttackReply) =>
    reply.delta.patched?.find((p) => p.id === 'ogre')?.combatStats;

describe('attack: what each viewer sees', () => {
    it('player reply projects the enemy hp into a bucket', async () => {
        const res = await callAttack();

        expect(ogrePatch((await res.json()) as AttackReply)).toEqual({
            currentHp: 75,
            maxHp: 100,
        });
    });

    it('DM reply carries the exact hp and temp hp', async () => {
        deps.loadBattle.mockResolvedValue({ ...loaded(), isDM: true });
        deps.getUserId.mockResolvedValue('dm-user');

        const res = await callAttack();

        expect(ogrePatch((await res.json()) as AttackReply)).toEqual({
            currentHp: 96,
            tempHp: 0,
        });
    });

    it('the DM Pusher channel gets the exact delta, the public one the redacted one', async () => {
        await callAttack();

        const messages = deps.publish.mock.calls[0][0] as Published;

        const dm = messages.find(
            (m) => m.channel === battleDmChannelName('b1')
        );

        const pub = messages.find((m) => m.channel === battleChannelName('b1'));

        expect(ogrePatch({ delta: dm?.payload } as AttackReply)).toEqual({
            currentHp: 96,
            tempHp: 0,
        });
        expect(ogrePatch({ delta: pub?.payload } as AttackReply)).toEqual({
            currentHp: 75,
            maxHp: 100,
        });
        expect(pub?.payload).toMatchObject({ redacted: true });
    });
});
