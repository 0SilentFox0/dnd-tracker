import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { withStats } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import { attemptWfrpConditionEnd } from '@/systems/wfrp/rules/conditions/end-test';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { qualityInflicts } from '@/systems/wfrp/rules/equipment/quality-effects';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const edition = { conditionModel: 'sl' as const };

const caught = (strength?: number) =>
    applyWfrpConditionTo(withStats(makeParticipant({ id: 'p' }), { tb: 3 }), {
        key: 'entangled',
        round: 1,
        sourceName: 'net',
        edition,
        ...(strength !== undefined && { strength }),
    }).participant;

describe('canon: Entangled strength (p186, p305)', () => {
    bookExample(305, 'Inflict (Entangled 50) reports the hold strength', () => {
        expect(
            qualityInflicts(
                {
                    qualities: [
                        {
                            key: 'inflict',
                            value: 1,
                            condition: 'entangled',
                            strength: 50,
                        },
                    ],
                    flaws: [],
                },
                'canon'
            )
        ).toEqual([{ key: 'entangled', strength: 50 }]);
    });

    bookExample(
        186,
        'the strength is kept while Entangled and dropped when free',
        () => {
            const p = caught(45);

            expect(wfrpState(p).entangledStrength).toBe(45);
            expect(conditionLevel(p, 'entangled')).toBe(1);
            expect(wfrpState(caught()).entangledStrength).toBeUndefined();
        }
    );

    bookExample(
        186,
        'breaking free is an Opposed Strength Test against the hold',
        () => {
            const p = caught(90);

            const lost = attemptWfrpConditionEnd([p], 'p', 'entangled', {
                round: 1,
                rng: () => 0.5,
                rules: canon,
                presetRoll: 40,
            });

            expect(lost.success).toBe(false);
            expect(conditionLevel(lost.participants[0], 'entangled')).toBe(1);

            const weak = caught(5);

            const won = attemptWfrpConditionEnd([weak], 'p', 'entangled', {
                round: 1,
                rng: () => 0.9,
                rules: canon,
                presetRoll: 10,
            });

            expect(won.success).toBe(true);
            expect(conditionLevel(won.participants[0], 'entangled')).toBe(0);
        }
    );
});
