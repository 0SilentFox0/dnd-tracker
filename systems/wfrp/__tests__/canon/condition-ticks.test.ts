import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { CombatStatus } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { wfrpAbilitiesOf } from '@/systems/wfrp/rules/combat/participant';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import type { WfrpConditionKey } from '@/systems/wfrp/rules/conditions/catalog';
import {
    wfrpConditionsTurnStart,
    wfrpSkippedTurn,
} from '@/systems/wfrp/rules/conditions/tick';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant } from '@/types/battle';

const CANON_RULES = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const src = textRef('battleWfrp.log.removed', { target: 'x', condition: 'y' });

const make = (
    hp: number,
    conds: Array<[WfrpConditionKey, number]>,
    ap = { head: 2, arm: 0, body: 3, leg: 1 }
): BattleParticipant => {
    const base = makeParticipant({ id: 'a', hp, maxHp: 20 });

    const withStats: BattleParticipant = {
        ...base,
        abilities: {
            ...base.abilities,
            ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, { ap }),
        },
    };

    return conds.reduce(
        (acc, [key, levels]) =>
            applyWfrpConditionTo(acc, {
                key,
                levels,
                round: 1,
                sourceName: src,
            }).participant,
        withStats
    );
};

const tick = (p: BattleParticipant, rng: () => number) =>
    wfrpConditionsTurnStart([p], 'a', {
        round: 2,
        rng,
        rules: CANON_RULES,
        applyDamage: applyDamageConsequences,
    });

const hpAfter = (r: { participants: BattleParticipant[] }) =>
    r.participants[0].combatStats.currentHp;

describe('canon5e condition ticks', () => {
    bookExample(185, 'Poisoned costs 1 Wound each round', () => {
        expect(hpAfter(tick(make(10, [['poisoned', 1]]), () => 0.5))).toBe(9);
    });

    bookExample(
        185,
        'Ablaze is reduced by TB and the weakest location (no minimum)',
        () => {
            const high = tick(make(20, [['ablaze', 1]]), () => 0.999);

            const low = tick(make(20, [['ablaze', 1]]), () => 0);

            expect(hpAfter(low)).toBe(20);
            expect(20 - hpAfter(high)).toBe(10 - 3);
        }
    );

    bookExample(
        185,
        'Bleeding at 0 Wounds: a failed Endurance test knocks out',
        () => {
            const r = tick(make(1, [['bleeding', 1]]), () => 0.99);

            expect(r.participants[0].combatStats.status).toBe(
                CombatStatus.UNCONSCIOUS
            );
        }
    );

    bookExample(185, 'Bleeding above 0 Wounds never knocks out', () => {
        const r = tick(make(10, [['bleeding', 1]]), () => 0.99);

        expect(r.participants[0].combatStats.status).toBe(CombatStatus.ACTIVE);
    });

    bookExample(185, 'unconscious at 0 Wounds: a 10 stops one bleeding', () => {
        const p = {
            ...make(0, [['bleeding', 2]]),
        };

        const down = {
            ...p,
            combatStats: { ...p.combatStats, status: CombatStatus.UNCONSCIOUS },
        };

        const r = wfrpSkippedTurn([down], 'a', {
            round: 2,
            rng: () => 0.99,
            rules: CANON_RULES,
        });

        expect(r.participants[0].combatStats.status).toBe(
            CombatStatus.UNCONSCIOUS
        );
        expect(r.messages).toHaveLength(1);
    });
});
