import { describe, expect, it } from 'vitest';

import { bookExample, CANON } from './book-example';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { cellKey } from '@/lib/utils/battle/grid/geometry';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { ResolveAttackCtx } from '@/lib/utils/rules/systems/types';
import { attackOf, slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { collectAttackMods } from '@/systems/wfrp/rules/combat/attack-mods';
import { rangedOpposition } from '@/systems/wfrp/rules/combat/range-band';
import {
    RANGE_BAND_SL,
    rangeBandOf,
    sbRangeFt,
    weaponRangeYd,
} from '@/systems/wfrp/rules/combat/range-band';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import type { WfrpConditionKey } from '@/systems/wfrp/rules/conditions/catalog';
import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { wfrpOnMoveEnd } from '@/systems/wfrp/rules/turn/move-end';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const baseMap = (terrain?: BattleMapConfig['terrain']): BattleMapConfig => ({
    cols: 100,
    rows: 5,
    background: null,
    opacity: 0.3,
    ...(terrain && { terrain }),
});

const unit = (
    id: string,
    x: number,
    side: 'ally' | 'enemy' = ParticipantSide.ALLY,
    skill = 45
): BattleParticipant => {
    const p = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...p,
        basicInfo: { ...p.basicInfo, side },
        battleData: { ...p.battleData, position: { x, y: 0 } },
        abilities: {
            ...p.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: skill, bs: skill },
            }),
        },
    };
};

const withCondition = (p: BattleParticipant, key: WfrpConditionKey) =>
    applyWfrpConditionTo(p, {
        key,
        round: 0,
        edition: CANON,
        sourceName: 'test',
    }).participant;

const bow = (range = '150/450 ft'): BattleAttack =>
    ({
        id: 'bow',
        name: 'Bow',
        type: AttackType.RANGED,
        range,
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({ qualities: [], flaws: [] }),
    }) as unknown as BattleAttack;

const sword = (reach?: 'average' | 'long'): BattleAttack =>
    ({
        id: 'sw',
        name: 'Sword',
        type: AttackType.MELEE,
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            ...(reach && { reach }),
        }),
    }) as unknown as BattleAttack;

const ctxOf = (
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    extra: Partial<ResolveAttackCtx> = {}
): ResolveAttackCtx => ({
    attacker,
    target,
    attack,
    participants: [attacker, target],
    rules: canon,
    rng: () => 0.5,
    map: baseMap(),
    ...extra,
});

const modsOf = (
    c: ResolveAttackCtx,
    kind: 'melee' | 'ranged',
    input?: Parameters<typeof collectAttackMods>[0]['input']
) => collectAttackMods({ ctx: c, edition: CANON, kind, input });

const slOf = (m: ReturnType<typeof modsOf>, key: string) =>
    m.mods.find((x) => x.key === key)?.sl;

const shot = (distanceCells: number, shooter = unit('a', 0)) => {
    const target = unit('t', distanceCells, ParticipantSide.ENEMY);

    return modsOf(ctxOf(shooter, target, bow()), 'ranged');
};

describe('canon: range bands (p165, p302)', () => {
    bookExample(302, 'Bow Range 50 yd: bands by distance', () => {
        const bands = [4, 20, 50, 100, 150].map((d) => rangeBandOf(d, 50));

        expect(bands).toEqual([
            'pointBlank',
            'short',
            'medium',
            'long',
            'extreme',
        ]);
        expect(rangeBandOf(152, 50)).toBeNull();
    });

    bookExample(302, 'band SL runs +2 +1 0 -1 -2', () => {
        expect(Object.values(RANGE_BAND_SL)).toEqual([2, 1, 0, -1, -2]);
    });

    bookExample(302, 'Pistol Range 20 yd: 10 yd is Short', () => {
        expect(rangeBandOf(10, 20)).toBe('short');
    });

    bookExample(302, 'a thrown Rock has Range SB x3', () => {
        expect(weaponRangeYd(`${sbRangeFt(4, 3)}/108 ft`)).toBe(12);
    });

    bookExample(165, 'the map distance picks the band SL', () => {
        expect(slOf(shot(2), 'range.pointBlank')).toBe(2);
        expect(slOf(shot(10), 'range.short')).toBe(1);
        expect(slOf(shot(25), 'range.medium')).toBeUndefined();
        expect(slOf(shot(50), 'range.long')).toBe(-1);
        expect(slOf(shot(75), 'range.extreme')).toBe(-2);
    });

    bookExample(165, 'a shot beyond Extreme is refused', () => {
        const a = unit('a', 0);

        const t = unit('t', 76, ParticipantSide.ENEMY);

        const r = resolveWfrpAttack(ctxOf(a, t, bow(), { manualRoll: 5 }));

        expect(r.isHit).toBe(false);
        expect(attackOf(r.attackRoll)).toBeUndefined();
    });
});

describe('canon: ranged situation modifiers (p165-166)', () => {
    const target = unit('t', 10, ParticipantSide.ENEMY);

    bookExample(
        165,
        'Aim at the target gives +1 SL and is spent by the shot',
        () => {
            const aimed = withWfrpState(unit('a', 0), {
                aim: { targetId: 't' },
            });

            const c = ctxOf(aimed, target, bow(), { manualRoll: 5 });

            expect(slOf(modsOf(c, 'ranged'), 'aim')).toBe(1);

            const r = resolveWfrpAttack(c);

            expect(
                wfrpState(r.attackerUpdate?.(aimed) ?? aimed).aim
            ).toBeUndefined();
        }
    );

    bookExample(165, 'Aim at another target gives nothing and is lost', () => {
        const aimed = withWfrpState(unit('a', 0), { aim: { targetId: 'x' } });

        const c = ctxOf(aimed, target, bow(), { manualRoll: 5 });

        expect(slOf(modsOf(c, 'ranged'), 'aim')).toBeUndefined();

        expect(
            wfrpState(resolveWfrpAttack(c).attackerUpdate?.(aimed) ?? aimed).aim
        ).toBeUndefined();
    });

    bookExample(165, 'moving ends the Aim', () => {
        const aimed = withWfrpState(unit('a', 5), { aim: { targetId: 't' } });

        const out = wfrpOnMoveEnd({
            mover: aimed,
            start: { x: 0, y: 0 },
            path: [{ x: 5, y: 0 }],
            cost: 5,
            participants: [aimed, target],
            round: 1,
            rng: () => 0.5,
            rules: canon,
            map: baseMap(),
        });

        expect(wfrpState(out.participants[0]).aim).toBeUndefined();
    });

    bookExample(165, 'a shooter who moved this turn takes -1 SL', () => {
        const moved = unit('a', 0);

        moved.battleData.movementUsed = 3;

        expect(
            slOf(modsOf(ctxOf(moved, target, bow()), 'ranged'), 'moved')
        ).toBe(-1);
    });

    bookExample(
        165,
        'a blocked line of fire or a manual cover flag is -1 SL',
        () => {
            const a = unit('a', 0);

            const blocker = unit('b', 5, ParticipantSide.ENEMY);

            const blocked = ctxOf(a, target, bow(), {
                participants: [a, target, blocker],
            });

            expect(slOf(modsOf(blocked, 'ranged'), 'cover')).toBe(-1);
            expect(
                slOf(
                    modsOf(ctxOf(a, target, bow()), 'ranged', { cover: true }),
                    'cover'
                )
            ).toBe(-1);
            expect(
                slOf(modsOf(ctxOf(a, target, bow()), 'ranged'), 'cover')
            ).toBeUndefined();
        }
    );

    bookExample(165, 'a prone target is -1 SL, a surprised one +1 SL', () => {
        const a = unit('a', 0);

        expect(
            slOf(
                modsOf(
                    ctxOf(a, withCondition(target, 'prone'), bow()),
                    'ranged'
                ),
                'prone'
            )
        ).toBe(-1);
        expect(
            slOf(
                modsOf(
                    ctxOf(a, withCondition(target, 'surprised'), bow()),
                    'ranged'
                ),
                'surprised'
            )
        ).toBe(1);
    });

    bookExample(
        165,
        'shooting at a target engaged with others is at Disadvantage',
        () => {
            const a = unit('a', 0);

            const friend = withWfrpState(unit('f', 11), {
                engagedWith: { t: 2 },
            });

            const c = ctxOf(a, target, bow(), {
                participants: [a, target, friend],
            });

            expect(modsOf(c, 'ranged').disadvantage).toBe(1);
            expect(modsOf(ctxOf(a, target, bow()), 'ranged').disadvantage).toBe(
                0
            );
        }
    );

    bookExample(165, 'at Point Blank the target may Dodge', () => {
        expect(
            rangedOpposition({
                band: 'pointBlank',
                engaged: false,
                helpless: false,
                targets: { dodge: 40, parry: 50 },
            })
        ).toEqual([{ kind: 'dodge', target: 40 }]);
        expect(
            rangedOpposition({
                band: 'short',
                engaged: false,
                helpless: false,
                targets: { dodge: 40, parry: 50 },
            })
        ).toEqual([]);
        expect(
            rangedOpposition({
                band: 'pointBlank',
                engaged: true,
                helpless: false,
                targets: { dodge: 40, parry: 50 },
            })
        ).toEqual([{ kind: 'parry', target: 50 }]);
    });

    bookExample(
        165,
        'a Point Blank shot is an opposed test against Dodge',
        () => {
            const a = unit('a', 0);

            const near = unit('t', 2, ParticipantSide.ENEMY);

            const r = resolveWfrpAttack(
                ctxOf(a, near, bow(), { manualRoll: 5 })
            );

            expect(attackOf(r.attackRoll)?.defender?.kind).toBe('dodge');
        }
    );

    bookExample(
        165,
        'a called shot costs -2 SL and picks the location on a hit',
        () => {
            const a = unit('a', 0);

            const system = FORTUNE_INPUT.write({
                kind: 'none',
                mods: { calledShot: 'leftLeg' },
            });

            const c = ctxOf(a, target, bow(), { manualRoll: 5, system });

            expect(
                slOf(
                    modsOf(c, 'ranged', { calledShot: 'leftLeg' }),
                    'calledShot'
                )
            ).toBe(-2);

            const r = resolveWfrpAttack(c);

            expect(r.isHit).toBe(true);
            expect(attackOf(r.attackRoll)?.location).toBe('leftLeg');
        }
    );
});

describe('canon: melee situation modifiers (p166)', () => {
    const foe = unit('t', 1, ParticipantSide.ENEMY);

    bookExample(
        166,
        'high ground is +1 for the attacker and -1 for the defender',
        () => {
            const a = unit('a', 0);

            expect(
                slOf(
                    modsOf(ctxOf(a, foe, sword()), 'melee', {
                        highGround: 'attacker',
                    }),
                    'highGround'
                )
            ).toBe(1);
            expect(
                slOf(
                    modsOf(ctxOf(a, foe, sword()), 'melee', {
                        highGround: 'defender',
                    }),
                    'highGround'
                )
            ).toBe(-1);
        }
    );

    bookExample(166, 'an attacker in difficult terrain is -1 SL', () => {
        const map = baseMap({
            [cellKey({ x: 0, y: 0 })]: { kind: 'difficult' },
        });

        const a = unit('a', 0);

        expect(
            slOf(modsOf(ctxOf(a, foe, sword(), { map }), 'melee'), 'difficult')
        ).toBe(-1);
    });

    bookExample(
        166,
        'a prone attacker is -1 SL, an entangled target +1 SL',
        () => {
            const a = unit('a', 0);

            expect(
                slOf(
                    modsOf(
                        ctxOf(withCondition(a, 'prone'), foe, sword()),
                        'melee'
                    ),
                    'proneSelf'
                )
            ).toBe(-1);
            expect(
                slOf(
                    modsOf(
                        ctxOf(a, withCondition(foe, 'entangled'), sword()),
                        'melee'
                    ),
                    'entangled'
                )
            ).toBe(1);
        }
    );

    bookExample(166, 'cramped space: Average reach -1, longer -2', () => {
        const a = unit('a', 0);

        expect(
            slOf(
                modsOf(ctxOf(a, foe, sword('average')), 'melee', {
                    enclosed: true,
                }),
                'enclosed'
            )
        ).toBe(-1);
        expect(
            slOf(
                modsOf(ctxOf(a, foe, sword('long')), 'melee', {
                    enclosed: true,
                }),
                'enclosed'
            )
        ).toBe(-2);
    });

    bookExample(166, 'outnumbering and high ground add up', () => {
        const a = unit('a', 0);

        const ally = unit('a2', 0);

        ally.battleData.position = { x: 1, y: 1 };

        const linked = withWfrpState(ally, {
            engagedWith: { [foe.basicInfo.id]: 2 },
        });

        const m = modsOf(
            ctxOf(a, foe, sword(), { participants: [a, linked, foe] }),
            'melee',
            { highGround: 'attacker' }
        );

        expect(m.sl).toBe(2);
    });
});

describe('legacy: no canon attack modifiers', () => {
    it('legacy rules record no situational modifiers', () => {
        const a = unit('a', 0);

        const t = unit('t', 10, ParticipantSide.ENEMY);

        const system = FORTUNE_INPUT.write({
            kind: 'none',
            mods: { calledShot: 'leftLeg', cover: true },
        });

        const r = resolveWfrpAttack(
            ctxOf(a, t, bow('150 ft'), { rules: legacy, manualRoll: 5, system })
        );

        expect(attackOf(r.attackRoll)?.mods).toBeUndefined();
    });
});
