import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT, sourceFiles } from '@/scripts/shared/system-ratchet';

const SCANNED = [
    'lib/utils/battle',
    'lib/utils/abilities/engine',
    'lib/server/battles',
];

const BUILDERS = [
    'lib/utils/battle/participant/',
    'lib/utils/battle/store/',
    'lib/utils/battle/transform/',
    'lib/utils/abilities/build/',
];

const STATBLOCK =
    /\babilities\.(?:strength|dexterity|constitution|intelligence|wisdom|charisma|modifiers|proficiencyBonus|armorClass|speed|spellSlots|morale|moraleCap|minTargets|maxTargets)\b|\babilities\[/g;

/** Only goes down; target 0 is E3. */
const MAX: Record<string, number> = {};

const countStatblockReads = (text: string) =>
    text.match(STATBLOCK)?.length ?? 0;

const found = () =>
    Object.fromEntries(
        sourceFiles(SCANNED)
            .filter((file) => !BUILDERS.some((b) => file.startsWith(b)))
            .map((file) => [
                file,
                countStatblockReads(
                    fs.readFileSync(path.join(ROOT, file), 'utf8')
                ),
            ])
            .filter(([, n]) => (n as number) > 0)
    ) as Record<string, number>;

describe('statblock columns in core rules', () => {
    it('counts the column accesses', () => {
        expect(
            countStatblockReads(
                'a.abilities.strength + b.abilities[k] + abilities.xabilities'
            )
        ).toBe(2);
        expect(countStatblockReads('hero.abilities.baseInitiative')).toBe(0);
    });

    it('no file reads more than recorded and none is new', () => {
        const now = found();

        expect(
            Object.entries(now)
                .filter(([file, n]) => n > (MAX[file] ?? 0))
                .map(
                    ([file, n]) =>
                        `new read: ${file} has ${n}, allowed ${MAX[file] ?? 0}`
                )
        ).toEqual([]);
    });

    it('lower the entry when a file got cleaner', () => {
        const now = found();

        expect(
            Object.entries(MAX)
                .filter(([file, max]) => (now[file] ?? 0) < max)
                .map(
                    ([file, max]) =>
                        `lower: ${file} has ${now[file] ?? 0}, recorded ${max}`
                )
        ).toEqual([]);
    });
});

const DB_SCANNED = ['lib', 'systems', 'scripts', 'app'];

const COLUMNS =
    'strength|dexterity|constitution|intelligence|wisdom|charisma|armorClass|initiative|speed';

const SELECTS_COLUMN = new RegExp(`\\b(?:${COLUMNS})\\s*:\\s*true\\b`);

const READS_ROW_COLUMN = new RegExp(
    `\\b(?:character|unit|unitBase|row|hero|stored|fresh|existing|u|c)\\??\\.(?:${COLUMNS})\\b`
);

const LOADS_ROW =
    /\b(?:character|unit|unitBase)\.(?:findMany|findFirst|findUnique|findUniqueOrThrow|findFirstOrThrow)\b/;

const OVERLAY =
    /\b(?:withColumnView|withStoredColumns|flattenStoredColumns|readD20Columns)\b/;

const CHARACTERISTICS = /\bcharacteristics\b/;

const CODEC_LAYER = [
    'lib/utils/rules/systems/column-view.ts',
    'systems/d20/rules/characteristics/',
    'scripts/db/lib/backfill-d20-characteristics',
];

/** Only goes down; not DB statblock reads (battle participant, rules registry, JSON saving throws). */
const SELECT_EXEMPT = [
    'lib/server/battles/store/load-battle.ts',
    'lib/utils/rules/registry.ts',
    'scripts/seed/seed-example-demo.ts',
];

/** Reads the import input rows; the only DB load is a name select. */
const ROW_EXEMPT = ['lib/utils/units/import-units.ts'];

export const selectsColumnWithoutCharacteristics = (text: string) =>
    SELECTS_COLUMN.test(text) && !CHARACTERISTICS.test(text);

export const readsColumnWithoutOverlay = (text: string) =>
    LOADS_ROW.test(text) && READS_ROW_COLUMN.test(text) && !OVERLAY.test(text);

const dbFiles = () =>
    sourceFiles(DB_SCANNED).filter(
        (file) => !CODEC_LAYER.some((c) => file.startsWith(c))
    );

const dbOffenders = (
    test: (text: string) => boolean,
    exempt: readonly string[]
) =>
    dbFiles()
        .filter((file) => test(fs.readFileSync(path.join(ROOT, file), 'utf8')))
        .filter((file) => !exempt.includes(file));

describe('statblock columns are read through characteristics', () => {
    it('flags a select of a column without characteristics', () => {
        expect(
            selectsColumnWithoutCharacteristics(
                'prisma.unit.findMany({ select: { armorClass: true } })'
            )
        ).toBe(true);
        expect(
            selectsColumnWithoutCharacteristics(
                'select: { armorClass: true, characteristics: true }'
            )
        ).toBe(false);
    });

    it('flags a row column read without the overlay', () => {
        expect(
            readsColumnWithoutOverlay(
                'const rows = await prisma.unit.findMany(); rows.map((u) => u.speed)'
            )
        ).toBe(true);
        expect(
            readsColumnWithoutOverlay(
                'prisma.unit.findMany().then((r) => r.map(withStoredColumns)); u.speed'
            )
        ).toBe(false);
    });

    it('no select of a column lacks characteristics', () =>
        expect(
            dbOffenders(selectsColumnWithoutCharacteristics, SELECT_EXEMPT)
        ).toEqual([]));

    it('no file reads a column off a loaded row without the overlay', () =>
        expect(dbOffenders(readsColumnWithoutOverlay, ROW_EXEMPT)).toEqual([]));

    it('lower the exempt lists when a file got fixed', () => {
        const stale = [
            ...SELECT_EXEMPT.filter(
                (file) =>
                    !selectsColumnWithoutCharacteristics(
                        fs.readFileSync(path.join(ROOT, file), 'utf8')
                    )
            ),
            ...ROW_EXEMPT.filter(
                (file) =>
                    !readsColumnWithoutOverlay(
                        fs.readFileSync(path.join(ROOT, file), 'utf8')
                    )
            ),
        ];

        expect(stale).toEqual([]);
    });
});
