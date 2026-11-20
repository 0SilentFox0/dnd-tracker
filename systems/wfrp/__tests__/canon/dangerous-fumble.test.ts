import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType, EffectMarker } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import type { QualityRef } from '@/systems/wfrp/rules/equipment/qualities';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const fighter = (id: string): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, bs: 30 },
            }),
        },
    };
};

const run = (qualities: QualityRef[], roll: number) => {
    const attacker = fighter('a');

    const attack = {
        id: 'w',
        name: 'w',
        type: AttackType.RANGED,
        system: ATTACK_SLOT.write({ qualities, flaws: [], hand: 'main' }),
    } as unknown as BattleAttack;

    const rolls = [0.1, 0.3, 0.5];

    const r = resolveWfrpAttack({
        attacker,
        target: fighter('t'),
        attack,
        participants: [attacker, fighter('t')],
        rules: canon,
        rng: () => rolls.shift() ?? 0.5,
        manualRoll: roll,
    });

    return (
        r.attackerUpdate?.(attacker) ?? attacker
    ).battleData.activeEffects.flatMap((e) => e.effects.map((x) => x.type));
};

describe('canon: Dangerous feeds the fumble table (p305, p165)', () => {
    bookExample(305, 'a failed test with a 9 on a die is a fumble', () => {
        expect(run([{ key: 'dangerous' }], 69)).toContain(
            EffectMarker.SKIP_ACTION
        );
    });

    it('without Dangerous the same roll is a plain miss', () => {
        expect(run([], 69)).not.toContain(EffectMarker.SKIP_ACTION);
    });
});
