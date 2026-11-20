import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import {
    regenCeiling,
    regenerateOnRoll,
} from '@/systems/wfrp/rules/traits/regeneration';
import { wfrpRegenerate } from '@/systems/wfrp/rules/turn/creature-hooks';
import type { BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const troll = (hp: number, max = 20): BattleParticipant =>
    makeParticipant({
        id: 't',
        hp,
        maxHp: max,
        abilities: [trait([{ kind: 'wfrpRegenerate' }])],
    });

const hpAfter = (p: BattleParticipant, roll: number) =>
    regenerateOnRoll(p, roll).participant.combatStats.currentHp;

describe('canon: Regeneration (p358)', () => {
    bookExample(358, 'above 0 Wounds it regains 1d10, up to the maximum', () => {
        expect(hpAfter(troll(5), 6)).toBe(11);
        expect(hpAfter(troll(18), 6)).toBe(20);
    });

    bookExample(358, 'at 0 Wounds it regains 1 on an 8 or more', () => {
        expect(hpAfter(troll(0), 8)).toBe(1);
        expect(hpAfter(troll(0), 7)).toBe(0);
    });

    bookExample(358, 'a 10 heals a Critical Wound', () => {
        const p = withWfrpState(troll(5), { critWounds: 2 });

        const r = regenerateOnRoll(p, 10);

        expect(r.critHealed).toBe(true);
        expect(wfrpState(r.participant).critWounds).toBe(1);
        expect(regenerateOnRoll(p, 9).critHealed).toBe(false);
    });

    bookExample(358, 'fire wounds do not regenerate', () => {
        const p = withWfrpState(troll(15), { fireWounds: 4 });

        expect(regenCeiling(p)).toBe(16);
        expect(hpAfter(p, 9)).toBe(16);
    });

    bookExample(358, 'the turn-start hook rolls the d10', () => {
        const r = wfrpRegenerate({
            participants: [troll(5)],
            id: 't',
            round: 1,
            rng: () => 0.55,
            rules: canon,
            applyDamage: applyDamageConsequences,
        });

        expect(r.participants[0].combatStats.currentHp).toBe(11);
        expect(CANON.traitModel).toBe('canon');
    });
});
