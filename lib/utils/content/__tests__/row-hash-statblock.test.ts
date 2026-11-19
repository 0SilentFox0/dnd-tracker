import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contentRowHash } from '@/lib/utils/content/row-hash';
import { D20_CHARACTERISTICS_COLUMNS } from '@/systems/d20/rules/characteristics/columns';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

const cols = D20_CHARACTERISTICS_COLUMNS;

const DEFAULTS = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    initiative: 0,
    speed: 30,
};

const legacy = (row: Record<string, unknown>) => ({
    ...row,
    characteristics: {},
});

const virtualMigrate = (row: Record<string, unknown>) => {
    const migrated: Record<string, unknown> = { ...row, ...DEFAULTS };

    const characteristics: Record<string, unknown> = {};

    for (const c of cols)
        if (c in row) characteristics[c] = row[c];
        else characteristics[c] = DEFAULTS[c];

    return { ...migrated, characteristics };
};

describe('contentRowHash statblock fold', () => {
    const unit = {
        name: 'Aboleth',
        maxHp: 150,
        strength: 21,
        dexterity: 9,
        constitution: 15,
        intelligence: 18,
        wisdom: 15,
        charisma: 18,
        armorClass: 17,
        initiative: 7,
        speed: 10,
    };

    it('legacy and migrated rows hash identically', () => {
        const migrated = {
            name: 'Aboleth',
            maxHp: 150,
            ...DEFAULTS,
            characteristics: Object.fromEntries(cols.map((c) => [c, unit[c]])),
        };

        expect(contentRowHash('Unit', migrated)).toBe(
            contentRowHash('Unit', legacy(unit))
        );
        expect(contentRowHash('Character', migrated)).toBe(
            contentRowHash('Character', {
                ...unit,
                characteristics: {},
            })
        );
    });

    it('Character null and {} characteristics hash the same', () => {
        expect(
            contentRowHash('Character', { ...unit, characteristics: null })
        ).toBe(contentRowHash('Character', { ...unit, characteristics: {} }));
    });

    it('a flat pack row hashes as before', () => {
        expect(contentRowHash('Unit', unit)).toBe(
            contentRowHash('Unit', legacy(unit))
        );
    });

    it('wfrp units keep their recorded hash', () => {
        expect(
            contentRowHash('Unit', {
                name: 'U',
                hp: 5,
                characteristics: { ...DEFAULT_CHARACTERISTICS, fate: 3 },
            })
        ).toBe('3b87175c689c8886bc8fe83a57c2dbf1fbb85d43');
    });

    it('other characteristics keys survive the fold', () => {
        const withExtra = { ...unit, characteristics: { extra: 1 } };

        expect(contentRowHash('Unit', withExtra)).not.toBe(
            contentRowHash('Unit', legacy(unit))
        );
    });

    it.each(['srd-5.2', 'heroes-homm'])(
        'every %s unit hashes alike after a virtual move',
        (pack) => {
            const rows = JSON.parse(
                readFileSync(
                    join(process.cwd(), 'data/templates', pack, 'units.json'),
                    'utf8'
                )
            ) as Record<string, unknown>[];

            expect(rows.length).toBeGreaterThan(0);

            for (const row of rows) {
                const picked = Object.fromEntries(
                    Object.entries(row).filter(
                        ([k]) => !['attacks', 'abilities'].includes(k)
                    )
                );

                expect(contentRowHash('Unit', virtualMigrate(picked))).toBe(
                    contentRowHash('Unit', legacy({ ...DEFAULTS, ...picked }))
                );
            }
        }
    );
});
