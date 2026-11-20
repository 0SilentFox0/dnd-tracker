import { describe, expect } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';
import {
    attackDetails,
    bow,
    canonRules,
    fighter,
    legacyRules,
    sword,
} from './combat-fixtures';

import { isOutnumbering } from '@/systems/wfrp/rules/combat/engagement';
import { mitigateWfrpDamage } from '@/systems/wfrp/rules/combat/mitigate';
import { ACTION_SLOT } from '@/systems/wfrp/rules/slots';
import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';
import {
    canonSizeStep,
    outnumberWeight,
    sizeParrySl,
    sizeRangedSl,
} from '@/systems/wfrp/rules/traits/size';
import type { BattleAttack } from '@/types/battle';

const ring = (
    count: number,
    size: TraitSize | undefined,
    side: 'ally' | 'enemy'
) =>
    Array.from({ length: count }, (_, i) =>
        fighter(`${side}${i}`, {
            side,
            size,
            at: [
                { x: 4, y: 5 },
                { x: 6, y: 5 },
                { x: 5, y: 4 },
                { x: 5, y: 6 },
            ][i],
        })
    );

const outnumbers = (
    attackers: ReturnType<typeof ring>,
    target: ReturnType<typeof fighter>
) =>
    isOutnumbering(attackers[0], target, [...attackers, target], null, CANON);

const hit = (
    size: TraitSize | undefined,
    attack: BattleAttack,
    sys?: ReturnType<typeof ACTION_SLOT.write>
) => {
    const a = fighter('a', { size, sb: 4 });

    const t = fighter('t', { side: 'enemy', tb: 0 });

    return mitigateWfrpDamage({
        attacker: a,
        target: t,
        weapon: 4,
        amount: 4,
        margin: 0,
        location: 'body',
        crit: false,
        attack,
        system: sys,
        rng: () => 0.5,
        rules: canonRules,
    });
};

const total = (r: ReturnType<typeof hit>) => r.amount;

describe('canon: size outnumbering (p360)', () => {
    const large = fighter('big', {
        side: 'enemy',
        size: 'large',
        at: { x: 5, y: 5 },
    });

    bookExample(
        360,
        'four Average outnumber one Large 2:1, three do not',
        () => {
            const four = ring(4, undefined, 'ally');

            expect(outnumbers(four, large)).toBe(true);
            expect(outnumbers(four.slice(0, 3), large)).toBe(false);
        }
    );

    bookExample(
        360,
        'two Large ogres outnumber one human 2:1, not 4:1',
        () => {
            const human = fighter('h', { side: 'enemy', at: { x: 5, y: 5 } });

            const ogres = ring(2, 'large', 'ally');

            expect(outnumbers(ogres, human)).toBe(true);
            expect(outnumbers(ogres.slice(0, 1), human)).toBe(false);
        }
    );

    bookExample(360, 'four Large outnumber one Monstrous', () => {
        const dragon = fighter('d', {
            side: 'enemy',
            size: 'monstrous',
            at: { x: 5, y: 5 },
        });

        const four = ring(4, 'large', 'ally');

        expect(outnumbers(four, dragon)).toBe(true);
        expect(outnumbers(four.slice(0, 3), dragon)).toBe(false);
    });

    bookExample(360, 'the legacy model weighs every creature as 1', () => {
        const three = ring(3, undefined, 'ally');

        expect(
            isOutnumbering(three[0], large, [...three, large], null, LEGACY)
        ).toBe(true);
    });
});

describe('canon: size damage (p360)', () => {
    bookExample(
        360,
        'Large adds SB, Enormous SB, Monstrous 2xSB to melee damage',
        () => {
            const melee = sword();

            expect(total(hit(undefined, melee))).toBe(8);
            expect(total(hit('large', melee))).toBe(12);
            expect(total(hit('enormous', melee))).toBe(12);
            expect(total(hit('monstrous', melee))).toBe(16);
        }
    );

    bookExample(
        360,
        'no size bonus on ranged, free attacks or baked-in profiles',
        () => {
            expect(total(hit('large', bow()))).toBe(8);
            expect(total(hit('large', sword({ sizeBaked: true })))).toBe(8);

            const free = ACTION_SLOT.write({
                attack: {
                    roll: 10,
                    target: 40,
                    sl: 0,
                    netSl: 0,
                    location: 'body',
                    doubles: false,
                    free: true,
                },
            });

            expect(total(hit('large', sword(), free))).toBe(8);
        }
    );

    bookExample(360, 'the legacy model keeps the per-step bonus', () => {
        const a = fighter('a', { size: 'large', sb: 4 });

        const t = fighter('t', { side: 'enemy' });

        const r = mitigateWfrpDamage({
            attacker: a,
            target: t,
            weapon: 4,
            amount: 4,
            margin: 0,
            location: 'body',
            crit: false,
            attack: sword(),
            rng: () => 0.5,
            rules: legacyRules,
        });

        expect(r.amount).toBe(16);
    });
});

describe('canon: size and defence (p360, p166)', () => {
    bookExample(360, 'parry against a larger foe -2 SL, dodge unaffected', () => {
        const human = fighter('h');

        const ogre = fighter('o', { size: 'large' });

        expect(sizeParrySl(human, ogre, CANON)).toBe(-2);
        expect(sizeParrySl(ogre, human, CANON)).toBe(0);
        expect(sizeParrySl(human, ogre, LEGACY)).toBe(0);
    });

    bookExample(
        166,
        'shooting a larger target +1 SL, Monstrous +2, smaller -1',
        () => {
            const shooter = fighter('s');

            expect(sizeRangedSl(shooter, fighter('t', { size: 'large' }))).toBe(
                1
            );
            expect(
                sizeRangedSl(shooter, fighter('t', { size: 'monstrous' }))
            ).toBe(2);
            expect(
                sizeRangedSl(fighter('s', { size: 'large' }), fighter('t'))
            ).toBe(-1);
            expect(sizeRangedSl(shooter, fighter('t'))).toBe(0);
        }
    );

    bookExample(166, 'size gives a ranged attack SL, melee none', () => {
        const a = fighter('a');

        const big = fighter('t', { side: 'enemy', size: 'large' });

        const plain = fighter('t', { side: 'enemy' });

        const ranged = (t: typeof big) =>
            attackDetails(a, t, bow()).details?.netSl ?? 0;

        const melee = (t: typeof big) =>
            attackDetails(a, t, sword()).details?.netSl ?? 0;

        expect(ranged(big)).toBe(ranged(plain) + 1);
        expect(attackDetails(a, big, bow()).details?.mods).toEqual([
            { key: 'sizeRanged', sl: 1 },
        ]);
        expect(melee(big)).toBe(melee(plain));
    });

    bookExample(360, 'Little counts as Small under canon5e', () => {
        expect(canonSizeStep(fighter('l', { size: 'little' }))).toBe(
            canonSizeStep(fighter('s', { size: 'small' }))
        );
        expect(outnumberWeight(fighter('l', { size: 'tiny' }), CANON)).toBe(1);
    });
});
