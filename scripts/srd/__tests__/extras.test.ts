import { describe, expect, it } from 'vitest';

import { readSrdData } from '../lib/data-files';

const data = readSrdData();

describe('non-SRD extras', () => {
    it('ships Armor of Agathys with scaling temp HP and cold retaliation', () => {
        const spell = data.spells.find(
            (s) => s.slug === 'extra_armor-of-agathys'
        );

        expect(spell).toMatchObject({
            level: 1,
            concentration: false,
            targeting: { kind: 'self' },
            lists: ['Warlock'],
        });
        expect(spell?.spellEffects).toEqual([
            { kind: 'tempHp', amount: 5, upcastAmount: 5, target: 'self' },
            expect.objectContaining({
                flag: 'thorns',
                damage: 5,
                damageType: 'cold',
                whileTempHp: true,
                upcastDamage: 5,
            }),
        ]);
    });

    it('ships Inspiring Leader as a General feat granting temp HP to six allies', () => {
        const feat = data.feats.find(
            (f) => f.slug === 'extra_inspiring-leader'
        );

        expect(feat).toMatchObject({
            type: 'general',
            prerequisite: { level: 4 },
        });
        expect(feat?.abilities[0]).toMatchObject({
            trigger: { event: 'action' },
            maxTargets: 6,
            limits: { perRest: { rest: 'short', uses: 1 } },
            effects: [{ kind: 'tempHp', target: 'eventTarget' }],
        });
        expect(feat?.choices[0]).toMatchObject({
            kind: 'abilityScore',
            abilities: ['wisdom', 'charisma'],
        });
    });
});
