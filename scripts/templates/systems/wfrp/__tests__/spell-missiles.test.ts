import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { Row } from '../common';
import { applySpellMissile, SPELL_MISSILES } from '../spell-missiles';
import { spellIssues } from '../spells';

const rows = JSON.parse(
    fs.readFileSync(
        path.join(process.cwd(), 'data/templates/grim-d100/spells.json'),
        'utf8'
    )
) as Row[];

const bySlug = (slug: string) => rows.find((r) => r.slug === slug) as Row;

describe('spell missiles in the grim template', () => {
    it('every table entry is applied and the row passes the validator', () => {
        for (const slug of Object.keys(SPELL_MISSILES)) {
            const row = bySlug(slug);

            const magic = (row.casting as { magic: { missile?: unknown } })
                .magic;

            expect(magic.missile, slug).toEqual(SPELL_MISSILES[slug].missile);
            expect(row.dice, slug).toBeUndefined();
            expect(spellIssues(row), slug).toEqual([]);
        }
    });

    it('applying the generator twice changes nothing', () => {
        for (const row of rows) expect(applySpellMissile(row)).toEqual(row);
    });

    it('rows outside the table keep their spellRoll', () => {
        expect(bySlug('ember-dart').spellEffects).toEqual([
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'magic',
            },
        ]);
    });

    it('rejects a missile row that still carries dice or a spellRoll amount', () => {
        const row = bySlug('lance-bolt');

        expect(spellIssues({ ...row, dice: 1 })).toContain(
            'a missile spell carries no dice'
        );
        expect(
            spellIssues({
                ...row,
                spellEffects: [
                    {
                        kind: 'dealDamage',
                        amount: { spellRoll: 100 },
                        damageType: 'magic',
                    },
                ],
            }).join()
        ).toContain('missile damage amount');
    });
});
