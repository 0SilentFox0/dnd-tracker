import { describe, expect, it, vi } from 'vitest';

import { AttackType, CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { attackBodySchema } from '@/lib/schemas/battles';
import { attackMutation } from '@/lib/server/battles/mutations/attack/attack-mutation';
import { nextTurnMutation } from '@/lib/server/battles/mutations/next-turn/next-turn-mutation';
import { runBattleMutation } from '@/lib/server/battles/run-mutation';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type {
    BattleMutationContext,
    PipelineDeps,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import type { BattleDelta, LoadedBattle } from '@/lib/utils/battle/store';
import { applyCharacterResources } from '@/lib/utils/characters/resources/battle';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { startDying } from '@/systems/d20/rules/death-saves/start';
import { withDeathSaves } from '@/systems/d20/rules/death-saves/state';
import type { BattleParticipant } from '@/types/battle';

vi.mock('@/lib/i18n/request-locale', () => ({
    getRequestLocale: vi.fn(async () => 'uk'),
}));

const D20: Ruleset = {
    ...DEFAULT_RULES,
    system: { key: 'dnd5e' },
    deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true },
};

const base = createMockParticipant();

const hero = (
    over: Partial<BattleParticipant['combatStats']> = {}
): BattleParticipant =>
    createMockParticipant({
        basicInfo: { ...base.basicInfo, id: 'hero', controlledBy: 'user-1' },
        combatStats: { ...base.combatStats, ...over },
    });

const goblin = createMockParticipant({
    basicInfo: {
        ...base.basicInfo,
        id: 'gob',
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    },
    battleData: {
        ...base.battleData,
        attacks: [
            {
                id: 'club',
                name: 'Club',
                type: AttackType.MELEE,
                attackBonus: 5,
                damageDice: '1d8',
                damageType: 'bludgeoning',
            },
        ],
    },
});

const loaded = (
    participants: BattleParticipant[],
    turnIndex: number
): LoadedBattle & { isMember: boolean } => ({
    scene: {
        id: 'b1',
        campaignId: 'c1',
        status: 'active',
        round: 1,
        turnIndex,
        version: 3,
        eventSeq: 4,
        pendingMoraleCheck: null,
        pendingChoice: null,
        startedAt: null,
        completedAt: null,
    },
    meta: {
        name: 'Battle',
        description: null,
        setup: [],
        friendlyFire: false,
        rules: D20,
        critChoiceByDm: false,
        map: null,
        createdAt: new Date('2026-01-01'),
    },
    participants,
    pending: [],
    isDM: true,
    isMember: true,
});

const delta = (): BattleDelta => ({
    battleId: 'b1',
    version: 4,
    scene: {
        status: 'active',
        round: 1,
        turnIndex: 0,
        pendingMoraleCheck: null,
        pendingChoice: null,
    },
    upserted: [],
    fullIds: [],
    removed: [],
    events: [],
});

const run = async (
    battle: LoadedBattle & { isMember: boolean },
    mutate: (ctx: BattleMutationContext) => unknown,
    rng?: () => number
) => {
    const deps: PipelineDeps = {
        getUserId: vi.fn(async () => 'dm'),
        rateLimit: vi.fn(async () => ({
            allowed: true,
            count: 1,
            limit: 30,
            retryAfterSeconds: 10,
        })),
        loadBattle: vi.fn(async () => battle),
        saveBattle: vi.fn(async () => delta()),
        publish: vi.fn(),
        loadRecentEvents: vi.fn(async () => []),
        ...(rng && { rng }),
    };

    await runBattleMutation(
        new Request('http://x/api', { method: 'POST', body: '{}' }),
        {
            params: { id: 'c1', battleId: 'b1' },
            access: 'member',
            mutate: mutate as never,
        },
        deps
    );

    const [, result] = vi.mocked(deps.saveBattle).mock.calls[0];

    return result;
};

const rollOf = (n: number) => () => (n - 1) / 20 + 0.001;

describe('d20 last hero at 0 HP', () => {
    it('an attack that drops the only hero to 0 keeps the battle active', async () => {
        const result = await run(
            loaded([goblin, hero({ currentHp: 3 })], 0),
            (ctx) =>
                attackMutation(
                    ctx,
                    attackBodySchema.parse({
                        attackerId: 'gob',
                        targetId: 'hero',
                        attackId: 'club',
                        d20Roll: 18,
                        damageRolls: [8],
                    })
                )
        );

        const down = result.participants.find((p) => p.basicInfo.id === 'hero');

        expect(down?.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(result.scene?.status ?? 'active').toBe('active');
    });

    it('the third failed death save ends the battle in defeat', async () => {
        const dying = withDeathSaves(
            startDying(hero({ currentHp: 0 }), D20),
            { successes: 0, failures: 2, stable: false }
        );

        const result = await run(
            loaded([dying, goblin], 1),
            (ctx) => nextTurnMutation(ctx),
            rollOf(5)
        );

        expect(result.scene?.status).toBe('completed');
        expect(result.events).toContainEqual(
            expect.objectContaining({
                details: expect.objectContaining({
                    actionDetails: expect.objectContaining({
                        battleResult: 'defeat',
                    }),
                }),
            })
        );
    });

    it('a hero starting the battle at hp 0 is dying and the battle does not end', async () => {
        const start = applyCharacterResources(
            hero(),
            { inspiration: null, resources: { hp: 0 } },
            D20
        );

        expect(start.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(start.battleData.dying).toBe(true);

        const result = await run(loaded([goblin, start], 0), (ctx) => ({
            participants: ctx.participants,
            pending: ctx.pending,
            events: [],
        }));

        expect(result.scene?.status ?? 'active').toBe('active');
    });
});
