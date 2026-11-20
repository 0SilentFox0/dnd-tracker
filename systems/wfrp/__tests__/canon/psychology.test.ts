import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import {
    AttackType,
    CombatStatus,
    ParticipantSide,
} from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { type Ruleset, RulesetSchema } from '@/lib/utils/rules/schema';
import { attackOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import {
    hasMomentum,
    withMomentum,
} from '@/systems/wfrp/rules/combat/momentum';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import { isAfraid, isAfraidOf } from '@/systems/wfrp/rules/traits/fear';
import {
    wfrpFearRound,
    wfrpPsychology,
} from '@/systems/wfrp/rules/traits/psychology';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const RULES = { edition: { preset: 'canon5e' } } as unknown as Ruleset;

const HERO_WP = {
    ...DEFAULT_CHARACTERISTICS,
    base: { ...DEFAULT_CHARACTERISTICS.base, wp: 40 },
};

const rollOf = (...rolls: number[]) => {
    const queue = [...rolls];

    return () => ((queue.shift() ?? 50) - 1) / 100 + 0.001;
};

const make = (
    id: string,
    side: ParticipantSide,
    effects: unknown[] = []
): BattleParticipant => {
    const p = makeParticipant({
        id,
        side,
        abilities: effects.length ? [trait(effects, { key: `t-${id}` })] : [],
    });

    return {
        ...p,
        abilities: { ...p.abilities, ...wfrpAbilitiesOf(HERO_WP) },
    };
};

const psych = (psychology: 'fear' | 'terror', value: number) => ({
    kind: 'wfrpPsychology',
    psychology,
    value,
});

const sword = {
    id: 'sw',
    name: 'Sword',
    type: AttackType.MELEE,
} as unknown as BattleAttack;

const hero = () => make('h', ParticipantSide.ALLY);

const monster = (...effects: unknown[]) =>
    make('m', ParticipantSide.ENEMY, effects);

const find = (ps: BattleParticipant[], id: string) =>
    ps.find((p) => p.basicInfo.id === id) as BattleParticipant;

const join = (m: BattleParticipant, rng: () => number, round = 1) =>
    wfrpPsychology([hero(), m], { round, rng, rules: RULES });

describe('canon5e psychology', () => {
    bookExample(
        184,
        'Terror passed (any success): no Broken, then Fear starts',
        () => {
            const r = join(monster(psych('terror', 2)), rollOf(30, 30));

            const h = find(r.participants, 'h');

            expect(conditionLevel(h, 'broken')).toBe(0);
            expect(wfrpState(h).fear).toEqual({
                m: { rating: 2, sl: 1, round: 1 },
            });
        }
    );

    bookExample(
        184,
        'Terror failed: Broken = rating + negative SL after the first',
        () => {
            const r = join(monster(psych('terror', 2)), rollOf(70, 70));

            expect(conditionLevel(find(r.participants, 'h'), 'broken')).toBe(
                2 + (3 - 1)
            );
            expect(wfrpState(find(r.participants, 'h')).fear?.m.sl).toBe(0);
        }
    );

    bookExample(184, 'Terror failed by SL -1: Broken equals the rating', () => {
        const r = join(monster(psych('terror', 3)), rollOf(50, 70));

        expect(conditionLevel(find(r.participants, 'h'), 'broken')).toBe(3);
    });

    bookExample(
        183,
        'Fear never gives Broken, a failed roll only keeps the fear',
        () => {
            const r = join(monster(psych('fear', 2)), rollOf(70));

            const h = find(r.participants, 'h');

            expect(conditionLevel(h, 'broken')).toBe(0);
            expect(wfrpState(h).fear).toEqual({
                m: { rating: 2, sl: 0, round: 1 },
            });
        }
    );

    bookExample(
        183,
        'Fear: SL accumulates one roll per round until the rating',
        () => {
            const r1 = join(monster(psych('fear', 3)), rollOf(30));

            expect(wfrpState(find(r1.participants, 'h')).fear?.m.sl).toBe(1);

            const again = wfrpFearRound(r1.participants, {
                round: 1,
                rng: rollOf(10),
                rules: RULES,
            });

            expect(wfrpState(find(again.participants, 'h')).fear?.m.sl).toBe(1);
            expect(again.messages).toHaveLength(0);

            const r2 = wfrpFearRound(r1.participants, {
                round: 2,
                rng: rollOf(40),
                rules: RULES,
            });

            expect(wfrpState(find(r2.participants, 'h')).fear?.m.sl).toBe(2);

            const r3 = wfrpFearRound(r2.participants, {
                round: 3,
                rng: rollOf(10),
                rules: RULES,
            });

            expect(isAfraid(find(r3.participants, 'h'))).toBe(false);
            expect(r3.messages[0]).toMatchObject({
                message: 'battleWfrp.log.fearOvercome',
            });
        }
    );

    bookExample(
        266,
        'Fear test: a failure takes SL off the total, never below zero',
        () => {
            const r1 = join(monster(psych('fear', 5)), rollOf(10));

            expect(wfrpState(find(r1.participants, 'h')).fear?.m.sl).toBe(3);

            const r2 = wfrpFearRound(r1.participants, {
                round: 2,
                rng: rollOf(60),
                rules: RULES,
            });

            expect(wfrpState(find(r2.participants, 'h')).fear?.m.sl).toBe(1);

            const r3 = wfrpFearRound(r2.participants, {
                round: 3,
                rng: rollOf(90),
                rules: RULES,
            });

            expect(wfrpState(find(r3.participants, 'h')).fear?.m.sl).toBe(0);
        }
    );

    bookExample(
        266,
        'Fear test: a success adds at least 1 SL, so an exact roll still progresses',
        () => {
            const r = join(monster(psych('fear', 2)), rollOf(40));

            expect(wfrpState(find(r.participants, 'h')).fear?.m.sl).toBe(1);
        }
    );

    bookExample(
        183,
        'Fear is overcome once the SL total reaches the rating',
        () => {
            const r = join(monster(psych('fear', 2)), rollOf(20));

            expect(isAfraid(find(r.participants, 'h'))).toBe(false);
        }
    );

    bookExample(183, 'afraid: no Momentum until the Fear is overcome', () => {
        const r = join(monster(psych('fear', 1)), rollOf(70));

        const h = find(r.participants, 'h');

        expect(hasMomentum(withMomentum(h, true))).toBe(false);

        const calm = withWfrpState(h, { fear: undefined });

        expect(hasMomentum(withMomentum(calm, true))).toBe(true);
    });

    bookExample(
        183,
        'the source of Fear attacks the afraid with Advantage',
        () => {
            const r = join(monster(psych('fear', 2)), rollOf(70));

            const h = find(r.participants, 'h');

            expect(isAfraidOf(h, 'm')).toBe(true);
            expect(isAfraidOf(h, 'other')).toBe(false);
        }
    );

    bookExample(358, 'a source that leaves the fight stops the Fear', () => {
        const r = join(monster(psych('fear', 2)), rollOf(70));

        const gone = r.participants.map((p) =>
            p.basicInfo.id === 'm'
                ? {
                      ...p,
                      combatStats: {
                          ...p.combatStats,
                          status: CombatStatus.DEAD,
                      },
                  }
                : p
        );

        const next = wfrpFearRound(gone, {
            round: 2,
            rng: rollOf(70),
            rules: RULES,
        });

        expect(isAfraid(find(next.participants, 'h'))).toBe(false);
    });

    bookExample(
        183,
        'Fear from several sources: one roll per round, a newcomer joins without a second roll',
        () => {
            const r1 = join(monster(psych('fear', 3)), rollOf(30));

            const second = make('m2', ParticipantSide.ENEMY, [
                psych('fear', 2),
            ]);

            const ps = [...r1.participants, second];

            const r2 = wfrpPsychology(ps, {
                round: 1,
                rng: rollOf(10),
                rules: RULES,
                newcomerIds: ['m2'],
            });

            expect(r2.messages).toHaveLength(0);
            expect(wfrpState(find(r2.participants, 'h')).fear).toEqual({
                m: { rating: 3, sl: 1, round: 1 },
                m2: { rating: 2, sl: 0, round: 1 },
            });
            expect(isAfraidOf(find(r2.participants, 'h'), 'm2')).toBe(true);

            const r3 = wfrpFearRound(r2.participants, {
                round: 2,
                rng: rollOf(40),
                rules: RULES,
            });

            expect(r3.messages).toHaveLength(1);
            expect(wfrpState(find(r3.participants, 'h')).fear).toEqual({
                m: { rating: 3, sl: 2, round: 2 },
                m2: { rating: 2, sl: 1, round: 2 },
            });
        }
    );

    bookExample(
        183,
        'the source of Fear attacks the afraid with Advantage',
        () => {
            const rules = RulesetSchema.parse({
                ...WFRP_RULES,
                edition: { preset: 'canon5e' },
            });

            const afraid = withWfrpState(hero(), {
                fear: { m: { rating: 2, sl: 0, round: 1 } },
            });

            const strike = (attacker: BattleParticipant) =>
                attackOf(
                    resolveWfrpAttack({
                        attacker,
                        target: afraid,
                        attack: sword,
                        participants: [attacker, afraid],
                        rules,
                        rng: () => 0.5,
                        manualRoll: 71,
                    }).attackRoll
                )?.roll;

            expect(strike(monster())).toBe(17);
            expect(strike(make('other', ParticipantSide.ENEMY))).toBe(71);
        }
    );

    bookExample(
        183,
        'an afraid attacker does not gain Momentum by winning',
        () => {
            const rules = RulesetSchema.parse({
                ...WFRP_RULES,
                edition: { preset: 'canon5e' },
            });

            const strike = (attacker: BattleParticipant) => {
                const target = monster();

                const r = resolveWfrpAttack({
                    attacker,
                    target,
                    attack: sword,
                    participants: [attacker, target],
                    rules,
                    rng: () => 0.5,
                    manualRoll: 1,
                });

                return hasMomentum(r.attackerUpdate?.(attacker) ?? attacker);
            };

            const afraid = withWfrpState(hero(), {
                fear: { m: { rating: 2, sl: 0, round: 1 } },
            });

            expect(strike(hero())).toBe(true);
            expect(strike(afraid)).toBe(false);
        }
    );

    it('legacy keeps Fear against a hated source and breaks on failure', () => {
        const haters = make('h', ParticipantSide.ALLY, [
            { kind: 'wfrpPassion', passion: 'hatred', group: 'Goblins' },
        ]);

        const goblin = {
            ...monster(psych('fear', 2)),
            abilities: {
                ...monster(psych('fear', 2)).abilities,
                race: 'Goblin',
            },
        };

        const r = wfrpPsychology([haters, goblin], {
            round: 1,
            rng: rollOf(90),
        });

        expect(conditionLevel(find(r.participants, 'h'), 'broken')).toBe(1);
        expect(wfrpState(find(r.participants, 'h')).fear).toBeUndefined();
    });
});
