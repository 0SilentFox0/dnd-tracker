import { beforeAll, describe, expect, it, vi } from 'vitest';

import { staticGraph } from './helpers/static-graph';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { D6POOL_SERVER } from '@/lib/__tests__/fixtures/d6pool/server';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { SYSTEM_ROOTS } from '@/scripts/shared/system-ratchet';
import type { BattleAttack } from '@/types/battle';

let attackBodySchema: typeof import('@/lib/schemas/battles').attackBodySchema;

let context: typeof import('@/lib/server/battles/__tests__/mutations/fixtures').context;

let attackMutation: typeof import('@/lib/server/battles/mutations/attack/attack-mutation').attackMutation;

let nextTurnMutation: typeof import('@/lib/server/battles/mutations/next-turn/next-turn-mutation').nextTurnMutation;

let createStartMutation: typeof import('@/lib/server/battles/mutations/start/start-mutation').createStartMutation;

let placed: typeof import('@/lib/utils/battle/__tests__/fixtures/placed').placed;

// the global setup already loaded the lookup modules; the mocks below only reach a fresh graph
beforeAll(async () => {
    vi.resetModules();

    ({ attackBodySchema } = await import('@/lib/schemas/battles'));
    ({ context } = await import(
        '@/lib/server/battles/__tests__/mutations/fixtures'
    ));
    ({ attackMutation } = await import(
        '@/lib/server/battles/mutations/attack/attack-mutation'
    ));
    ({ nextTurnMutation } = await import(
        '@/lib/server/battles/mutations/next-turn/next-turn-mutation'
    ));
    ({ createStartMutation } = await import(
        '@/lib/server/battles/mutations/start/start-mutation'
    ));
    ({ placed } = await import('@/lib/utils/battle/__tests__/fixtures/placed'));
});

vi.mock('@/lib/utils/rules/systems/lookup', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ruleSystemOf: () => D6POOL_SYSTEM,
    ruleSystemByKey: () => D6POOL_SYSTEM,
}));

vi.mock('@/lib/server/systems/lookup', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    systemServerOf: () => D6POOL_SERVER,
}));

const SPEAR: BattleAttack = {
    id: 's',
    name: 'Spear',
    type: AttackType.MELEE,
    attackBonus: 0,
    damageDice: '1d4',
    damageType: 'piercing',
};

const hpOf = (
    participants: {
        basicInfo: { id: string };
        combatStats: { currentHp: number };
    }[],
    id: string
) => participants.find((p) => p.basicInfo.id === id)?.combatStats.currentHp;

async function startedBattle() {
    const order = [
        placed('a', {
            side: ParticipantSide.ALLY,
            hp: 20,
            attacks: [SPEAR],
            at: { x: 1, y: 1 },
        }),
        placed('t', {
            side: ParticipantSide.ENEMY,
            hp: 2,
            attacks: [SPEAR],
            at: { x: 2, y: 1 },
        }),
    ];

    const prepared = context({ isDM: true, participants: [] });

    const ctx: BattleMutationContext = {
        ...prepared,
        scene: { ...prepared.scene, status: 'prepared', version: 0 },
        meta: {
            ...prepared.meta,
            setup: [{ id: 'u1', type: 'unit', side: 'enemy' }],
        },
    };

    const start = await createStartMutation(async () => ({
        order,
        reserve: [],
        triggerLogEntries: [],
    }))(ctx);

    return { ctx, start };
}

describe('start, attack and next-turn on a d6pool base', () => {
    it('plays a round with no d20 and no wfrp hooks', async () => {
        const { ctx, start } = await startedBattle();

        expect(start.scene).toMatchObject({
            status: 'active',
            round: 1,
            turnIndex: 0,
        });
        expect(start.participants?.map((p) => p.basicInfo.id)).toEqual([
            'a',
            't',
        ]);

        const active: BattleMutationContext = {
            ...ctx,
            scene: { ...ctx.scene, ...start.scene, turnIndex: 0 },
            participants: start.participants ?? [],
        } as BattleMutationContext;

        const hit = await attackMutation(
            active,
            attackBodySchema.parse({
                attackerId: 'a',
                targetId: 't',
                attackId: 's',
                d20Roll: 6,
                damageRolls: [2],
            })
        );

        expect(hpOf(hit.participants ?? [], 't')).toBe(0);

        const moved = nextTurnMutation({
            ...active,
            participants: hit.participants ?? active.participants,
            pending: hit.pending ?? active.pending,
            scene: { ...active.scene, ...hit.scene },
        } as BattleMutationContext);

        expect(moved.scene).toMatchObject({ round: 2, turnIndex: 0 });
        expect(moved.participants?.length).toBe(2);
        expect(hpOf(moved.participants ?? [], 't')).toBe(0);
    });

    it('a miss by the base leaves the target alive', async () => {
        const { ctx, start } = await startedBattle();

        const out = await attackMutation(
            {
                ...ctx,
                scene: { ...ctx.scene, ...start.scene, turnIndex: 0 },
                participants: start.participants ?? [],
            } as BattleMutationContext,
            attackBodySchema.parse({
                attackerId: 'a',
                targetId: 't',
                attackId: 's',
                d20Roll: 2,
                damageRolls: [2],
            })
        );

        expect(hpOf(out.participants ?? [], 't')).toBe(2);
    });
});

describe('import graph of the d6pool battle test', () => {
    it('stops at the generated system roots and reaches no systems/*', () => {
        const graph = staticGraph(
            ['lib/__tests__/d6pool-battle.test.ts'],
            new Set(SYSTEM_ROOTS)
        );

        expect(
            [...graph.files].filter((f) => f.startsWith('systems/'))
        ).toEqual([]);
    });
});
