import { describe, expect, it } from 'vitest';

import { characterBaseHp } from '@/lib/utils/characters/hero-hp';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { GameClassData, ResolvedClassEntry } from '@/types/classes';

const fighter = {
    id: 'f',
    name: 'Fighter',
    hitDie: 10,
    subclasses: [],
} as unknown as GameClassData;

const c = { level: 3, constitution: 14, archetype: null };

describe('characterBaseHp with rule system', () => {
    it('wfrp uses wounds from characteristics', () => {
        const hp = characterBaseHp(c, {
            rules: WFRP_RULES,
            characteristics: { base: { s: 40, t: 35, wp: 30 } },
        });

        expect(hp.total).toBe(13);
        expect(hp.breakdown).toHaveLength(1);
        expect(hp.breakdown[0].label).toBe(
            'characterProfile.sheet.lines.wounds'
        );
    });

    it('d20 ignores stored characteristics', () => {
        const entries: ResolvedClassEntry[] = [
            { classId: 'f', level: 3, class: fighter, subclass: null },
        ];

        for (const opts of [{}, { entries }]) {
            expect(
                characterBaseHp(c, {
                    ...opts,
                    rules: DEFAULT_RULES,
                    characteristics: {},
                })
            ).toEqual(characterBaseHp(c, { ...opts, rules: DEFAULT_RULES }));
        }
    });
});
