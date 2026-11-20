import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { WFRP_ROW_KINDS } from '../../../templates/systems/wfrp/common';
import { ICON_NEGATIVE_BY_KIND, SHARED_EXTRA_NEGATIVE } from '../negatives';

const terms = (s: string) =>
    s
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

describe('grim icon negatives by kind', () => {
    it('covers every row kind and appends cleanly to the base negative', () => {
        expect(Object.keys(ICON_NEGATIVE_BY_KIND).sort()).toEqual(
            [...WFRP_ROW_KINDS].sort()
        );

        for (const value of Object.values(ICON_NEGATIVE_BY_KIND))
            expect(value === '' || value.startsWith(', ')).toBe(true);
    });

    it('does not ban head/nose/eyes for artifacts (axe head, spear head)', () => {
        const banned = terms(ICON_NEGATIVE_BY_KIND.artifacts);

        for (const word of ['head', 'nose', 'eyes'])
            expect(banned).not.toContain(word);
    });

    it('lets careers and races show a person but not a big face', () => {
        for (const kind of ['careers', 'races'] as const) {
            const banned = terms(ICON_NEGATIVE_BY_KIND[kind]);

            expect(banned).toContain('close-up face');
            expect(banned).not.toContain('person');
            expect(banned).not.toContain('multiple subjects');
        }
    });

    it('bans a person for spells and items, keeps units on the generator default', () => {
        expect(terms(ICON_NEGATIVE_BY_KIND.spells)).toContain('person');
        expect(terms(ICON_NEGATIVE_BY_KIND.artifacts)).toContain('person');
        expect(ICON_NEGATIVE_BY_KIND.units).toBe('');
    });

    it('has no duplicate terms inside a kind', () => {
        for (const value of [
            ...Object.values(ICON_NEGATIVE_BY_KIND),
            SHARED_EXTRA_NEGATIVE,
        ]) {
            const list = terms(value);

            expect(new Set(list).size).toBe(list.length);
        }
    });
});

describe('generate_grim negatives patch', () => {
    it('carries exactly the TS negatives', () => {
        const patch = fs.readFileSync(
            path.join(
                __dirname,
                '../../../../docs/superpowers/plans/wfrp5-icons/generate_grim-negatives.patch'
            ),
            'utf8'
        );

        for (const value of [
            ...Object.values(ICON_NEGATIVE_BY_KIND),
            SHARED_EXTRA_NEGATIVE,
        ])
            expect(patch).toContain(`'${value}'`);
    });
});
