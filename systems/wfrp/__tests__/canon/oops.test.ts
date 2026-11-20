import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { bookExample, CANON, NO_RNG } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { wornWeaponDamage } from '@/systems/wfrp/rules/combat/weapon-wear';
import { selfSlMod } from '@/systems/wfrp/rules/conditions/test-mod';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState } from '@/systems/wfrp/rules/state';
import { wfrpRoundOrder } from '@/systems/wfrp/rules/turn/round-order';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const pack = JSON.parse(
    readFileSync(
        join(process.cwd(), 'data/templates/grim-d100/rules.json'),
        'utf8'
    )
);

const rules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
    tables: pack.tables,
});

const sword = (unbreakable = false): BattleAttack =>
    ({
        id: 'w',
        name: 'w',
        type: AttackType.MELEE,
        damageDice: '',
        damageBonus: 5,
        system: ATTACK_SLOT.write({
            qualities: unbreakable ? [{ key: 'unbreakable' }] : [],
            flaws: [],
            hand: 'main',
        }),
    }) as unknown as BattleAttack;

const fighter = (id: string, side: ParticipantSide = ParticipantSide.ALLY): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20, side });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf(
                {
                    ...DEFAULT_CHARACTERISTICS,
                    base: { ...DEFAULT_CHARACTERISTICS.base, ws: 30 },
                },
                { tb: 3 }
            ),
        },
    };
};

const fraction = (roll: number) => (roll - 0.5) / 100;

const fumble = (oops: number, attack = sword(), others: BattleParticipant[] = []) => {
    const attacker = fighter('a');

    const target = fighter('t', ParticipantSide.ENEMY);

    const rolls = [fraction(5), fraction(oops), 0.1, 0.3];

    const r = resolveWfrpAttack({
        attacker,
        target,
        attack,
        participants: [attacker, target, ...others],
        rules,
        rng: () => rolls.shift() ?? 0.5,
        manualRoll: 88,
    });

    const after = r.attackerUpdate?.(attacker) ?? attacker;

    return { r, after, attacker };
};

const roundStart = (participants: BattleParticipant[]) =>
    wfrpRoundOrder({ participants, round: 2, rng: NO_RNG, rules }).participants;

describe('canon: Oops table (p165)', () => {
    bookExample(165, 'oops 3-4: the weapon takes 1 Damage and you act last next round', () => {
        const { after } = fumble(30);

        expect(wfrpState(after).weaponWear).toEqual({ w: 1 });
        expect(wfrpState(after).actLastNext).toBe(true);
    });

    bookExample(165, 'oops 3-4: an Unbreakable weapon is not damaged', () => {
        const { after } = fumble(30, sword(true));

        expect(wfrpState(after).weaponWear).toBeUndefined();
        expect(wfrpState(after).actLastNext).toBe(true);
    });

    bookExample(164, 'a damaged weapon deals 1 less Damage per point, never below +0', () => {
        const { after, attacker } = fumble(30);

        expect(wornWeaponDamage(5, attacker, sword())).toBe(5);
        expect(wornWeaponDamage(5, after, sword())).toBe(4);
        expect(wornWeaponDamage(0, after, sword())).toBe(0);
    });

    bookExample(165, 'oops 3-4: next round the fumbler moves to the end of the order', () => {
        const { after } = fumble(30);

        const order = roundStart([after, fighter('b'), fighter('c')]);

        expect(order.map((p) => p.basicInfo.id)).toEqual(['b', 'c', 'a']);
        expect(wfrpState(order[2]).actLastNext).toBeUndefined();
    });

    bookExample(165, 'oops 3-4: without the flag the order is untouched', () => {
        const order = roundStart([fighter('a'), fighter('b')]);

        expect(order.map((p) => p.basicInfo.id)).toEqual(['a', 'b']);
    });

    bookExample(165, 'oops 5-6: -1 SL on every test in the following round only', () => {
        const { after } = fumble(50);

        expect(wfrpState(after).oopsPenalty).toBe('next');
        expect(selfSlMod(after, CANON)).toBe(0);

        const during = roundStart([after])[0];

        expect(selfSlMod(during, CANON)).toBe(-1);

        const later = roundStart([during])[0];

        expect(selfSlMod(later, CANON)).toBe(0);
        expect(wfrpState(later).oopsPenalty).toBeUndefined();
    });

    bookExample(165, 'oops 10: a random ally is named, with the units die as the SL', () => {
        const { r, after } = fumble(95, sword(), [fighter('x')]);

        expect(JSON.stringify(r.lines)).toContain('battleWfrp.log.fumbleAlly"');
        expect(
            after.battleData.activeEffects.some((e) => e.name.includes('stunned'))
        ).toBe(false);
    });

    bookExample(165, 'oops 10: with no ally in reach you stun yourself', () => {
        const { r, after } = fumble(95);

        expect(JSON.stringify(r.lines)).toContain('battleWfrp.log.fumbleAllyNone');
        expect(
            after.battleData.activeEffects.some((e) => e.name.includes('stunned'))
        ).toBe(true);
    });

    it('the grim pack carries the Oops and Misfire tables', () => {
        expect(rules.tables.oops).toHaveLength(7);
        expect(rules.tables.misfire).toHaveLength(2);
    });
});
