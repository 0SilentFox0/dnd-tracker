import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT, sourceFiles } from '@/scripts/shared/system-ratchet';

const SCANNED = ['lib', 'app', 'scripts', 'systems'];

const COLUMN =
    /\b(?:strength|dexterity|constitution|intelligence|wisdom|charisma|armorClass|initiative|speed)\s*:/;

const WRITE =
    /\b(?:character|unit|unitBase)\.(?:create|createMany|update|updateMany|upsert)\s*\(|\bPrisma\.(?:Unit|Character|UnitBase)\w*(?:Create|Update)\w*Input\b|\bfunction\s+\w*RowData\b/;

const DUAL_WRITE = /\bcharacteristics\b|\bd20RowData\b|\bdraftFields\(/;

/** Only goes down; the S.4 switch removes the need for it. */
const EXEMPT: string[] = [];

export const writesWithoutCharacteristics = (text: string) =>
    COLUMN.test(text) && WRITE.test(text) && !DUAL_WRITE.test(text);

const offenders = () =>
    sourceFiles(SCANNED).filter((file) =>
        writesWithoutCharacteristics(
            fs.readFileSync(path.join(ROOT, file), 'utf8')
        )
    );

describe('statblock writes carry characteristics', () => {
    it('flags a write of a column without characteristics', () => {
        expect(
            writesWithoutCharacteristics(
                'prisma.unit.create({ data: { strength: 10 } })'
            )
        ).toBe(true);
        expect(
            writesWithoutCharacteristics(
                'prisma.unit.create({ data: d20RowData({ strength: 10 }) })'
            )
        ).toBe(false);
        expect(
            writesWithoutCharacteristics(
                'prisma.skill.create({ data: { speed: 1 } })'
            )
        ).toBe(false);
    });

    it('no file is new', () => {
        expect(offenders().filter((file) => !EXEMPT.includes(file))).toEqual(
            []
        );
    });

    it('lower the list when a file got fixed', () => {
        const now = offenders();

        expect(EXEMPT.filter((file) => !now.includes(file))).toEqual([]);
    });
});
