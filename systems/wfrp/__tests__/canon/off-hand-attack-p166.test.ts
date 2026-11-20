import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { attackOf, slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import type { BattleAttack } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const fighter = (id: string) => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40 },
            }),
        },
    };
};

const sword = (offHand: boolean) =>
    ({
        id: 'sw',
        name: 'Sword',
        type: AttackType.MELEE,
        system: ATTACK_SLOT.write({
            qualities: [],
            flaws: [],
            ...(offHand && { hand: 'off' as const }),
        }),
    }) as unknown as BattleAttack;

const netSl = (rules: typeof canon, offHand: boolean) => {
    const a = fighter('a');

    const t = fighter('t');

    const r = resolveWfrpAttack({
        attacker: a,
        target: t,
        attack: sword(offHand),
        participants: [a, t],
        rules,
        rng: () => 0.5,
        manualRoll: 5,
    });

    return attackOf(r.attackRoll)?.netSl ?? 0;
};

describe('canon: off-hand attack (p166)', () => {
    bookExample(166, 'an off-hand weapon attack takes -2 SL', () => {
        expect(netSl(canon, true)).toBe(netSl(canon, false) - 2);
    });

    bookExample(166, 'legacy gear ignores the off-hand mark', () => {
        expect(netSl(legacy, true)).toBe(netSl(legacy, false));
    });
});
