import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';
import {
    attackDetails,
    bow,
    canonRules,
    fighter,
    input,
    legacyRules,
    sword,
} from './combat-fixtures';

import { CombatStatus } from '@/lib/constants/battle';
import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { attackReachError } from '@/lib/utils/battle/grid/reach-check';
import { wfrpAttackFromProfile } from '@/systems/wfrp/rules/combat/extract-attacks';
import { rangeBandOf } from '@/systems/wfrp/rules/combat/range-band';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import { EDITION_PROFILES } from '@/systems/wfrp/rules/edition/profiles';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { aimMutation } from '@/systems/wfrp/server/battle/aim-mutation';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const shooter = (over: { x?: number; movementUsed?: number } = {}) => {
    const p = fighter('a', { at: { x: over.x ?? 0, y: 5 } });

    return over.movementUsed
        ? {
              ...p,
              battleData: { ...p.battleData, movementUsed: over.movementUsed },
          }
        : p;
};

const prey = (x = 2, extra = {}) =>
    fighter('t', { side: 'enemy', at: { x, y: 5 }, ...extra });

const gun = (rangeFt: number): BattleAttack => ({
    ...bow(),
    range: `${rangeFt}/${rangeFt * 3} ft`,
});

const mods = (
    a: BattleParticipant,
    t: BattleParticipant,
    extra: Parameters<typeof attackDetails>[3] = {},
    attack = gun(150)
) =>
    attackDetails(a, t, attack, { map: testMap(100, 20), ...extra }).details
        ?.mods ?? [];

const net = (
    a: BattleParticipant,
    t: BattleParticipant,
    extra: Parameters<typeof attackDetails>[3] = {}
) =>
    attackDetails(a, t, gun(150), { map: testMap(100, 20), ...extra }).details
        ?.netSl ?? 0;

const withCondition = (p: BattleParticipant, key: 'prone' | 'surprised') =>
    applyWfrpConditionTo(p, {
        key,
        round: 0,
        edition: EDITION_PROFILES.canon5e,
        sourceName: 'test',
    }).participant;

describe('canon: range bands (p302, p166)', () => {
    bookExample(
        302,
        'bow range 50: 4 yd PB +2, 25 Short +1, 50 Medium 0, 100 Long -1, 150 Extreme -2, 151 rejected',
        () => {
            expect(rangeBandOf(4, 50)).toBe('pointBlank');
            expect(rangeBandOf(25, 50)).toBe('short');
            expect(rangeBandOf(50, 50)).toBe('medium');
            expect(rangeBandOf(100, 50)).toBe('long');
            expect(rangeBandOf(150, 50)).toBe('extreme');
            expect(rangeBandOf(151, 50)).toBeNull();
        }
    );

    bookExample(302, 'pistol range 20: 10 yd is Short', () => {
        expect(rangeBandOf(10, 20)).toBe('short');
        expect(rangeBandOf(5, 20)).toBe('short');
    });

    bookExample(166, 'the band gives +2/+1/0/-1/-2 SL on the map', () => {
        const slOf = (cells: number) =>
            mods(shooter(), prey(cells)).find((m) => m.key === 'range')?.sl ??
            0;

        expect(slOf(2)).toBe(2);
        expect(slOf(12)).toBe(1);
        expect(slOf(25)).toBe(0);
        expect(slOf(50)).toBe(-1);
        expect(slOf(75)).toBe(-2);
    });

    bookExample(
        302,
        'a shot beyond Extreme is rejected by the core reach check',
        () => {
            const attack = wfrpAttackFromProfile(
                'b',
                'Bow',
                {
                    range: 'ranged',
                    rangeFt: 150,
                    damageFlat: 4,
                    addSb: true,
                    qualities: [],
                    flaws: [],
                    twoHanded: true,
                },
                { bands: true }
            );

            expect(attack.range).toBe('150/450 ft');

            const check = (cells: number) =>
                attackReachError(
                    testMap(100, 20),
                    [],
                    shooter(),
                    attack as BattleAttack,
                    [prey(cells)],
                    canonRules,
                    undefined
                );

            expect(check(75)).toBeNull();
            expect(check(76)).not.toBeNull();
        }
    );

    it('without a map the shot is Medium', () => {
        expect(
            attackDetails(shooter(), prey(2), gun(150)).details?.mods ?? []
        ).toEqual([]);
    });

    it('the legacy model reads no band', () => {
        expect(
            attackDetails(shooter(), prey(2), gun(150), {
                map: testMap(100, 20),
                rules: legacyRules,
            }).details?.mods
        ).toBeUndefined();
    });
});

describe('canon: ranged modifiers (p166-167)', () => {
    bookExample(
        166,
        'target behind cover -1 SL, the damage is priced in the test',
        () => {
            const open = attackDetails(shooter(), prey(25), gun(150), {
                map: testMap(100, 20),
            });

            const covered = attackDetails(shooter(), prey(25), gun(150), {
                map: testMap(100, 20),
                obstacle: true,
            });

            expect(covered.details?.mods).toEqual([{ key: 'cover', sl: -1 }]);
            expect(covered.result.obstacleInTest).toBe(true);
            expect(open.result.obstacleInTest).toBeUndefined();
            expect(covered.details?.netSl).toBe((open.details?.netSl ?? 0) - 1);
        }
    );

    bookExample(
        166,
        'Prone is the same -1 line as cover and does not add up',
        () => {
            const prone = withCondition(prey(25), 'prone');

            expect(mods(shooter(), prone)).toEqual([
                { key: 'targetProneRanged', sl: -1 },
            ]);
            expect(mods(shooter(), prone, { obstacle: true })).toEqual([
                { key: 'cover', sl: -1 },
            ]);
        }
    );

    bookExample(166, 'a Surprised target is +1 SL', () => {
        expect(mods(shooter(), withCondition(prey(25), 'surprised'))).toEqual([
            { key: 'targetSurprised', sl: 1 },
        ]);
    });

    bookExample(166, 'attacker moved before firing -1 SL', () => {
        expect(mods(shooter({ movementUsed: 3 }), prey(25))).toEqual([
            { key: 'moved', sl: -1 },
        ]);
    });

    bookExample(166, 'fog -1 and rain -2 SL; kinds the book does not name are 0', () => {
        const weather = (kind: 'fog' | 'rain' | 'storm' | 'snow') =>
            mods(shooter(), prey(25), {
                map: testMap(100, 20, { weather: kind }),
            });

        expect(weather('fog')).toEqual([{ key: 'weather', sl: -1 }]);
        expect(weather('rain')).toEqual([{ key: 'weather', sl: -2 }]);
        expect(weather('storm')).toEqual([]);
        expect(weather('snow')).toEqual([]);
        expect(
            mods(shooter(), prey(25), {
                map: testMap(100, 20, {
                    terrain: { '25:5': { kind: 'difficult', obscured: true } },
                }),
            })
        ).toEqual([]);
    });

    bookExample(167, 'called shot -2 SL on a ranged attack too', () => {
        expect(
            mods(shooter(), prey(25), {
                system: input({ calledShot: 'head' }),
            })
        ).toEqual([{ key: 'calledShot', sl: -2 }]);
    });

    bookExample(167, 'shooting an engaged target has Disadvantage', () => {
        const a = shooter();

        const t = prey(25);

        const friend = fighter('f', { at: { x: 24, y: 5 } });

        const alone = attackDetails(a, t, gun(150), {
            map: testMap(100, 20),
            participants: [a, t],
        });

        const engaged = attackDetails(a, t, gun(150), {
            map: testMap(100, 20),
            participants: [a, t, friend],
        });

        expect(engaged.details?.mods).toEqual([
            { key: 'intoMelee', sl: 0, disadvantage: 1 },
        ]);
        expect(alone.details?.mods).toBeUndefined();
        expect(engaged.details?.netSl).toBeLessThan(alone.details?.netSl ?? 0);
    });

    bookExample(
        167,
        'Disadvantage cancels against Advantage from Fortune',
        () => {
            const a = shooter();

            const t = prey(25);

            const friend = fighter('f', { at: { x: 24, y: 5 } });

            const ctx = {
                map: testMap(100, 20),
                participants: [a, t, friend],
            };

            const both = attackDetails(a, t, gun(150), {
                ...ctx,
                system: input({ kind: 'sl' }),
            });

            expect(both.details?.netSl).toBe(
                attackDetails(a, t, gun(150), {
                    map: testMap(100, 20),
                    participants: [a, t],
                }).details?.netSl
            );
        }
    );

    bookExample(
        167,
        'ranged at a Helpless target on Point Blank hits automatically',
        () => {
            const down = (p: BattleParticipant): BattleParticipant => ({
                ...p,
                combatStats: {
                    ...p.combatStats,
                    status: CombatStatus.UNCONSCIOUS,
                },
            });

            const run = (cells: number) =>
                attackDetails(shooter(), down(prey(cells)), gun(150), {
                    map: testMap(100, 20),
                    manualRoll: 99,
                }).result.isHit;

            expect(run(2)).toBe(true);
            expect(run(25)).toBe(false);
        }
    );
});

describe('canon: Aimed Shot (p167)', () => {
    const aimed = (movementUsed = 0) =>
        withWfrpState(shooter(), {
            aim: { targetId: 't', movementUsed },
        });

    bookExample(
        167,
        'aim +1 SL on the next shot at that target; lost after moving',
        () => {
            expect(mods(aimed(), prey(25))).toEqual([{ key: 'aim', sl: 1 }]);
            expect(
                mods(
                    {
                        ...aimed(),
                        battleData: { ...aimed().battleData, movementUsed: 2 },
                    },
                    prey(25)
                ).some((m) => m.key === 'aim')
            ).toBe(false);
        }
    );

    bookExample(167, 'a different target gets no Aim bonus', () => {
        expect(
            mods(
                aimed(),
                fighter('other', { side: 'enemy', at: { x: 25, y: 5 } })
            )
        ).toEqual([]);
    });

    bookExample(167, 'any attack ends the Aim, a defender loses it too', () => {
        const shot = attackDetails(aimed(), prey(25), gun(150), {
            map: testMap(100, 20),
        });

        const after = shot.result.attackerUpdate?.(aimed());

        expect(wfrpState(after!).aim).toBeUndefined();

        const defending = withWfrpState(
            fighter('t', { side: 'enemy', at: { x: 1, y: 5 } }),
            {
                aim: { targetId: 'a', movementUsed: 0 },
            }
        );

        const blow = attackDetails(shooter(), defending, sword(), {
            participants: [shooter(), defending],
        });

        expect(
            wfrpState(blow.result.targetUpdate!(defending)).aim
        ).toBeUndefined();
    });

    it('net SL rises by 1 with the Aim', () => {
        expect(net(aimed(), prey(25))).toBe(net(shooter(), prey(25)) + 1);
    });

    it('the aim operation spends the Action and remembers the target', async () => {
        const { context } = await import(
            '@/lib/server/battles/__tests__/mutations/fixtures'
        );

        await import('@/lib/server/systems/registry');

        const base = shooter();

        const a = {
            ...base,
            controlledBy: 'user-1',
            battleData: { ...base.battleData, attacks: [bow()] },
        } as unknown as BattleParticipant;

        const t = prey(25);

        const c = context({ participants: [a, t], rng: () => 0.5 });

        const out = aimMutation(
            { ...c, meta: { ...c.meta, rules: canonRules } },
            { participantId: 'a', targetId: 't' }
        );

        const hero = out.participants.find((p) => p.basicInfo.id === 'a')!;

        expect(wfrpState(hero).aim).toEqual({ targetId: 't', movementUsed: 0 });
        expect(hero.actionFlags.hasUsedAction).toBe(true);
    });
});
