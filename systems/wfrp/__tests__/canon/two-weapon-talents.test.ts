import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { attackOf, slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { canonDefence } from '@/systems/wfrp/rules/combat/defence';
import {
    grantSecondAttack,
    hasMomentum,
    secondAttackBlocker,
} from '@/systems/wfrp/rules/combat/momentum';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { canonWeaponUse } from '@/systems/wfrp/rules/combat/weapon-use';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT, type WfrpHand } from '@/systems/wfrp/rules/slots';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const weapon = (name: string, hand: WfrpHand): BattleAttack =>
    ({
        id: name,
        name,
        type: AttackType.MELEE,
        system: ATTACK_SLOT.write({ qualities: [], flaws: [], hand }),
    }) as unknown as BattleAttack;

const sword = weapon('Sword', 'main');

const dagger = weapon('Dagger', 'off');

const fighter = (
    id: string,
    talent?: 'ambidextrous' | 'dualWielder',
    attacks: BattleAttack[] = [sword, dagger]
): BattleParticipant => {
    const base = makeParticipant({
        id,
        hp: 20,
        maxHp: 20,
        abilities: talent
            ? [trait([{ kind: 'wfrpTalent', talent }], { key: `t-${id}` })]
            : [],
    });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40 },
            }),
        },
        battleData: { ...base.battleData, attacks },
    };
};

const netSl = (attacker: BattleParticipant, attack: BattleAttack) => {
    const t = fighter('t', undefined, []);

    const r = resolveWfrpAttack({
        attacker,
        target: t,
        attack,
        participants: [attacker, t],
        rules: canon,
        rng: () => 0.5,
        manualRoll: 5,
    });

    return attackOf(r.attackRoll)?.netSl ?? 0;
};

describe('canon: Ambidextrous (p114)', () => {
    bookExample(114, 'the off-hand attack loses its -2 SL penalty', () => {
        const plain = fighter('a');

        const able = fighter('a', 'ambidextrous');

        expect(netSl(plain, dagger)).toBe(netSl(plain, sword) - 2);
        expect(netSl(able, dagger)).toBe(netSl(able, sword));
    });

    bookExample(114, 'parrying with the off-hand weapon is unpenalised', () => {
        const offOnly = [dagger];

        const sl = (talent?: 'ambidextrous') =>
            canonDefence(fighter('d', talent, offOnly), sword, CANON).sl.parry;

        expect(sl()).toBe(sl('ambidextrous') - 2);
    });
});

describe('canon: Dual Wielder (p119)', () => {
    const struck = (p: BattleParticipant) => ({
        ...p,
        actionFlags: { ...p.actionFlags, hasUsedAction: true },
    });

    bookExample(119, 'the second attack costs no Momentum', () => {
        const plain = withWfrpState(struck(fighter('a')), { lastHand: 'main' });

        const dual = withWfrpState(struck(fighter('a', 'dualWielder')), {
            lastHand: 'main',
        });

        expect(secondAttackBlocker(plain, canon)).toBe('none');
        expect(secondAttackBlocker(dual, canon)).toBeNull();

        const granted = grantSecondAttack(dual, true);

        expect(hasMomentum(granted)).toBe(false);
        expect(granted.battleData.attacksLeft).toBe(1);
    });

    bookExample(119, 'a Dagger gains Parry only with two weapons in hand', () => {
        const parries = (p: BattleParticipant, attack: BattleAttack) =>
            canonWeaponUse(p, attack).refs.qualities.some((q) => q.key === 'parry');

        expect(parries(fighter('a', 'dualWielder'), dagger)).toBe(true);
        expect(parries(fighter('a'), dagger)).toBe(false);
        expect(parries(fighter('a', 'dualWielder', [dagger]), dagger)).toBe(false);
        expect(parries(fighter('a', 'dualWielder'), sword)).toBe(false);
    });
});
