import { describe, expect, it } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    context,
    goblin,
    hero,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { resetTurnState } from '@/lib/utils/battle/turn/turn-state';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import {
    conditionTestMutation,
    conditionTestSchema,
} from '@/systems/wfrp/server/battle/condition-test-mutation';
import type { BattleParticipant } from '@/types/battle';

const conditions = ruleSystemOf(WFRP_RULES).conditions!;

const withConds = (
    p: BattleParticipant,
    list: Array<[string, number]>
): BattleParticipant =>
    list.reduce(
        (ps, [key, levels]) =>
            conditions.apply(ps, 'hero', {
                key,
                levels,
                round: 1,
                sourceName: 'dm',
            }).participants,
        [p]
    )[0];

const ctx = (
    over: Parameters<typeof context>[0] = {},
    list: Array<[string, number]> = [['bleeding', 2]]
) =>
    context({
        meta: { ...context().meta, rules: WFRP_RULES },
        participants: [withConds(hero, list), goblin],
        ...over,
    });

const levelOf = (p: BattleParticipant, key: string) =>
    conditions.list(p).find((c) => c.key === key)?.level ?? 0;

const heroOf = (out: { participants: BattleParticipant[] }) =>
    out.participants.find((p) => p.basicInfo.id === 'hero')!;

const body = (over: Record<string, unknown> = {}) => ({
    participantId: 'hero',
    condition: 'bleeding',
    roll: 10,
    ...over,
});

describe('conditionTestMutation', () => {
    it('success reduces a level, records the attempt, keeps the action', () => {
        const c = ctx();

        const out = conditionTestMutation(c, body());

        const p = heroOf(out);

        expect(levelOf(p, 'bleeding')).toBe(1);
        expect(p.battleData.conditionTests).toEqual(['bleeding']);
        expect(p.actionFlags).toEqual(c.participants[0].actionFlags);
        expect(out.events).toHaveLength(1);
    });

    it('allows one attempt per condition per turn', () => {
        const c = ctx({}, [
            ['bleeding', 2],
            ['poisoned', 1],
        ]);

        const first = conditionTestMutation(c, body());

        const c2 = { ...c, participants: first.participants };

        expect(() => conditionTestMutation(c2, body())).toThrow(
            API_ERRORS.CONDITION_TEST_UNAVAILABLE
        );
        expect(
            levelOf(
                heroOf(
                    conditionTestMutation(c2, body({ condition: 'poisoned' }))
                ),
                'poisoned'
            )
        ).toBe(0);
    });

    it('failure keeps the level but records the attempt', () => {
        const p = heroOf(conditionTestMutation(ctx(), body({ roll: 95 })));

        expect(levelOf(p, 'bleeding')).toBe(2);
        expect(p.battleData.conditionTests).toContain('bleeding');
    });

    it('player off turn gets 403; DM on non-current gets unavailable', () => {
        expect(() =>
            conditionTestMutation(
                ctx({ scene: { ...context().scene, turnIndex: 1 } }),
                body()
            )
        ).toThrow(/./);
        expect(() =>
            conditionTestMutation(
                ctx({
                    scene: { ...context().scene, turnIndex: 1 },
                    isDM: true,
                    userId: 'dm',
                }),
                body()
            )
        ).toThrow(API_ERRORS.CONDITION_TEST_UNAVAILABLE);
    });

    it('unavailable for conditions without endTest or absent ones', () => {
        expect(() =>
            conditionTestMutation(
                ctx({}, [['fatigued', 1]]),
                body({ condition: 'fatigued' })
            )
        ).toThrow(API_ERRORS.CONDITION_TEST_UNAVAILABLE);
        expect(() =>
            conditionTestMutation(ctx(), body({ condition: 'poisoned' }))
        ).toThrow(API_ERRORS.CONDITION_TEST_UNAVAILABLE);
    });

    it('prone is removed without a roll', () => {
        const out = conditionTestMutation(ctx({}, [['prone', 1]]), {
            participantId: 'hero',
            condition: 'prone',
            serverRoll: true,
        });

        expect(levelOf(heroOf(out), 'prone')).toBe(0);
    });

    it('serverRoll uses the context rng', () => {
        const out = conditionTestMutation(ctx({ rng: () => 0.05 }), {
            participantId: 'hero',
            condition: 'bleeding',
            serverRoll: true,
        });

        expect(levelOf(heroOf(out), 'bleeding')).toBe(1);
    });

    it('validates schema', () => {
        expect(
            conditionTestSchema.safeParse({
                participantId: 'hero',
                condition: 'bleeding',
            }).success
        ).toBe(false);
        expect(conditionTestSchema.safeParse(body({ roll: 0 })).success).toBe(
            false
        );
        expect(conditionTestSchema.safeParse(body({ roll: 101 })).success).toBe(
            false
        );
        expect(conditionTestSchema.safeParse(body()).success).toBe(true);
    });

    it('attempt is available again after the turn state resets', () => {
        const out = conditionTestMutation(ctx(), body({ roll: 95 }));

        const reset = {
            ...heroOf(out),
            battleData: resetTurnState(heroOf(out), { rules: WFRP_RULES }),
        };

        expect(
            conditionTestMutation(
                { ...ctx(), participants: [reset, goblin] },
                body({ roll: 95 })
            ).events
        ).toHaveLength(1);
    });
});
