import { describe, expect, it } from 'vitest';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { mulberry32 } from '@/lib/utils/common/rng';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { SpellPowerSource } from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import { caster } from '@/systems/wfrp/rules/magic/__tests__/fixtures';
import { WFRP_MAGIC } from '@/systems/wfrp/rules/magic/index';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const spellOf = (
    magic: Partial<SpellMagic>,
    damageType = 'magic'
): SpellPowerSource => ({
    name: 'Bolt',
    definition: {
        damageBonus: 6,
        casting: {
            magic: { cn: 4, kind: 'arcane', overcast: 'dice', ...magic },
        },
        effects: [{ kind: 'dealDamage', damageType }],
    },
});

const burn = (spell: SpellPowerSource) => {
    const victim = makeParticipant({ id: 't', hp: 30, maxHp: 30 });

    const r = WFRP_MAGIC.soakSpellDamage?.({
        caster: caster(),
        target: victim,
        amount: 6,
        spell,
        rules: canon,
        rng: mulberry32(7),
    });

    return {
        r,
        after: r?.afterHit?.(victim, 1).participant,
    };
};

describe('fire spells feed fireWounds', () => {
    it('an Ablaze lore attribute spell records the Wounds it dealt', () => {
        const { r, after } = burn(
            spellOf({ attribute: { condition: 'ablaze', levels: 1 } })
        );

        expect(after && wfrpState(after).fireWounds).toBe(r?.amount);
    });

    it('a fire damage type feeds it too', () => {
        const { r, after } = burn(spellOf({}, 'fire'));

        expect(after && wfrpState(after).fireWounds).toBe(r?.amount);
    });

    it('a non-fire spell leaves it untouched', () => {
        expect(burn(spellOf({})).r?.afterHit).toBeUndefined();
    });
});
