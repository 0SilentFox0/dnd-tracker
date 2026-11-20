import { describe, expect, it } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { BattleRuleError } from '@/lib/utils/battle/store';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { canonDefence } from '@/systems/wfrp/rules/combat/defence';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';
import { canonSizeOf } from '@/systems/wfrp/rules/traits/read';
import {
    isBiggerThan,
    parryVsBiggerSl,
    sizeMeleeDamage,
    sizeOpposedStrength,
    sizeRangedSl,
} from '@/systems/wfrp/rules/traits/size';
import { wfrpOnMoveEnd } from '@/systems/wfrp/rules/turn/move-end';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const unit = (
    id: string,
    size: TraitSize | undefined,
    stats: { sb?: number; tb?: number; ap?: number } = {},
    x = 0,
    side: 'ally' | 'enemy' = ParticipantSide.ALLY
): BattleParticipant => {
    const p = makeParticipant({ id, hp: 20, maxHp: 20 });

    const ap = stats.ap ?? 0;

    return withStats(
        {
            ...p,
            basicInfo: { ...p.basicInfo, side },
            battleData: { ...p.battleData, position: { x, y: 0 } },
        },
        {
            sb: stats.sb ?? 0,
            tb: stats.tb ?? 0,
            ap: { head: ap, arm: ap, body: ap, leg: ap },
            ...(size && { size }),
        }
    );
};

const attackOf = (
    type: AttackType = AttackType.MELEE,
    free = false
): BattleAttack =>
    ({
        id: 'w',
        name: 'w',
        type,
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            ...(free && { free: true as const }),
        }),
    }) as unknown as BattleAttack;

const damage = (
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack = attackOf(),
    rules = canon
) =>
    mitigateWfrpDamage({
        attacker,
        target,
        weapon: 4,
        amount: 5,
        margin: 2,
        location: 'body',
        crit: false,
        rng: () => 0.5,
        rules,
        attack,
    });

const sizeStep = (r: ReturnType<typeof damage>) =>
    r.steps.find((s) => s.key === 'size')?.value;

const victim = unit('t', 'average', { tb: 3, ap: 1 }, 1, ParticipantSide.ENEMY);

describe('canon: Size damage in melee (p360)', () => {
    bookExample(
        360,
        'Large adds SB: weapon 4 + SB 5 + SL 2 + size 5 - TB 3 - AP 1 = 12',
        () => {
            const r = damage(unit('a', 'large', { sb: 5 }), victim);

            expect(sizeStep(r)).toBe(5);
            expect(r.amount).toBe(12);
        }
    );

    bookExample(360, 'Enormous adds SB, Monstrous twice SB', () => {
        expect(sizeStep(damage(unit('a', 'enormous', { sb: 5 }), victim))).toBe(
            5
        );
        expect(
            sizeStep(damage(unit('a', 'monstrous', { sb: 8 }), victim))
        ).toBe(16);
    });

    bookExample(360, 'Small and Average add nothing', () => {
        expect(
            sizeStep(damage(unit('a', 'average', { sb: 5 }), victim))
        ).toBeUndefined();
        expect(
            sizeStep(damage(unit('a', 'small', { sb: 5 }), victim))
        ).toBeUndefined();
    });

    bookExample(360, 'a second (Momentum) attack gets no Size bonus', () => {
        const a = withWfrpState(unit('a', 'large', { sb: 5 }), {
            momentumAttack: true,
        });

        expect(sizeStep(damage(a, victim))).toBeUndefined();
    });

    bookExample(360, 'ranged and trait free attacks get no Size bonus', () => {
        const big = unit('a', 'large', { sb: 5 });

        expect(
            sizeStep(damage(big, victim, attackOf(AttackType.RANGED)))
        ).toBeUndefined();
        expect(
            sizeStep(damage(big, victim, attackOf(AttackType.MELEE, true)))
        ).toBeUndefined();
        expect(sizeMeleeDamage(big, attackOf(), 5)).toBe(5);
    });

    it('legacy keeps the multiplier model', () => {
        const r = damage(
            unit('a', 'large', { sb: 5 }),
            victim,
            attackOf(),
            WFRP_RULES
        );

        expect(sizeStep(r)).toBeGreaterThan(0);
        expect(LEGACY.sizeModel).toBe('legacy');
    });
});

describe('canon: Size and shooting, parrying (p166, p360)', () => {
    bookExample(
        166,
        'shooting a bigger target gives +1 SL, Monstrous +2, a smaller one -1',
        () => {
            const shooter = unit('s', 'average');

            expect(sizeRangedSl(shooter, unit('t', 'large'))).toBe(1);
            expect(sizeRangedSl(shooter, unit('t', 'enormous'))).toBe(1);
            expect(sizeRangedSl(shooter, unit('t', 'monstrous'))).toBe(2);
            expect(sizeRangedSl(shooter, unit('t', 'small'))).toBe(-1);
            expect(sizeRangedSl(shooter, unit('t', 'average'))).toBe(0);
        }
    );

    bookExample(
        360,
        'parrying a bigger attacker costs 2 SL, Dodge is free',
        () => {
            const human = unit('h', 'average');

            const ogre = unit('o', 'large');

            expect(parryVsBiggerSl(human, ogre)).toBe(-2);
            expect(parryVsBiggerSl(ogre, human)).toBe(0);

            const defence = canonDefence(human, attackOf(), CANON, ogre);

            expect(
                defence.sl.parry -
                    canonDefence(human, attackOf(), CANON).sl.parry
            ).toBe(-2);
            expect(defence.sl.dodge).toBe(0);
        }
    );

    bookExample(
        360,
        'Opposed Strength: two steps win outright, one step needs a Critical',
        () => {
            expect(
                sizeOpposedStrength(unit('a', 'large'), unit('b', 'small'))
            ).toBe('auto');
            expect(
                sizeOpposedStrength(unit('a', 'large'), unit('b', 'average'))
            ).toBe('critOnly');
            expect(
                sizeOpposedStrength(unit('a', 'large'), unit('b', 'large'))
            ).toBe('normal');
        }
    );
});

describe('canon: Tiny and Little read as Small', () => {
    it('maps the legacy sizes onto Small', () => {
        expect(canonSizeOf('tiny')).toBe('small');
        expect(canonSizeOf('little')).toBe('small');
        expect(canonSizeOf(undefined)).toBe('average');
    });

    it('treats a Little target like a Small one for shooting', () => {
        expect(sizeRangedSl(unit('s', 'average'), unit('t', 'little'))).toBe(
            -1
        );
    });
});

describe('canon: bigger fighters ignore smaller foes when leaving melee (p360)', () => {
    const map: BattleMapConfig = {
        cols: 30,
        rows: 5,
        background: null,
        opacity: 0.3,
    };

    const run = (moverSize: TraitSize, foeSize: TraitSize) => {
        const mover = unit('m', moverSize, {}, 3);

        const foe = withWfrpState(
            unit('f', foeSize, {}, 1, ParticipantSide.ENEMY),
            { engagedWith: { m: 2 } }
        );

        return () =>
            wfrpOnMoveEnd({
                mover,
                start: { x: 0, y: 0 },
                path: [{ x: 3, y: 0 }],
                cost: 3,
                participants: [mover, foe],
                round: 1,
                rng: () => 0.5,
                rules: canon,
                map,
            });
    };

    bookExample(
        360,
        'a Large mover leaves an Average foe without Disengage',
        () => {
            expect(run('large', 'average')).not.toThrow();
        }
    );

    bookExample(
        360,
        'an Average mover still needs Disengage against a Large foe',
        () => {
            expect(run('average', 'large')).toThrow(BattleRuleError);
        }
    );

    it('isBiggerThan compares canon sizes', () => {
        expect(isBiggerThan(unit('a', 'large'), unit('b', 'average'))).toBe(
            true
        );
        expect(isBiggerThan(unit('a', 'little'), unit('b', 'small'))).toBe(
            false
        );
    });
});
