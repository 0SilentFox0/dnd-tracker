import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { mulberry32 } from '@/lib/utils/common/rng';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { wfrpMiscast } from '@/systems/wfrp/rules/magic/miscast';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';

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

const rows = (slot: 'miscastMinor' | 'miscastMajor' | 'wrath') =>
    rules.tables[slot] ?? [];

const cast = (
    kind: 'minor' | 'major' | 'wrath',
    presetRoll: number,
    sin = 0
) => {
    const base = makeParticipant({ id: 'c', hp: 20, maxHp: 20 });

    const caster = sin ? withWfrpState(base, { sin }) : base;

    return wfrpMiscast([caster], 'c', kind, {
        round: 1,
        rng: mulberry32(1),
        rules,
        applyDamage: applyDamageConsequences,
        presetRoll,
    }).participants[0];
};

describe('canon: miscast and Wrath tables (p218, p238-239)', () => {
    it.each(['miscastMinor', 'miscastMajor', 'wrath'] as const)(
        '%s has 20 rows in steps of 5 up to 100',
        (slot) => {
            const t = rows(slot);

            expect(t).toHaveLength(20);
            expect(t[t.length - 1].max).toBe(100);
            expect(t.every((r, i) => i === 0 || r.max > t[i - 1].max)).toBe(true);
        }
    );

    it('the Minor and Major tables step by 5, Wrath by 5 up to 80', () => {
        expect(rows('miscastMinor').map((r) => r.max)).toEqual(
            Array.from({ length: 20 }, (_, i) => (i + 1) * 5)
        );
        expect(rows('miscastMajor').map((r) => r.max)).toEqual(
            Array.from({ length: 20 }, (_, i) => (i + 1) * 5)
        );
        expect(
            rows('wrath')
                .slice(0, 16)
                .map((r) => r.max)
        ).toEqual(Array.from({ length: 16 }, (_, i) => (i + 1) * 5));
    });

    bookExample(238, 'Minor 46-50 (Rupture): a Bleeding Condition', () => {
        expect(conditionLevel(cast('minor', 50), 'bleeding')).toBe(1);
        expect(conditionLevel(cast('minor', 5), 'bleeding')).toBe(0);
    });

    bookExample(239, 'Major 96+ (Aethyric Feedback): wounds and Prone', () => {
        const caster = cast('major', 100);

        expect(caster.combatStats.currentHp).toBeLessThan(20);
        expect(conditionLevel(caster, 'prone')).toBe(1);
    });

    bookExample(218, 'Wrath: each Sin Point adds +10 to the roll', () => {
        expect(conditionLevel(cast('wrath', 45), 'bleeding')).toBe(0);
        expect(conditionLevel(cast('wrath', 45, 2), 'bleeding')).toBe(2);
    });
});
