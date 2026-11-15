import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT, sourceFiles } from '@/scripts/shared/system-ratchet';

const SCANNED = ['lib', 'app', 'scripts', 'systems'];

const COLUMNS =
    'strength|dexterity|constitution|intelligence|wisdom|charisma|armorClass|initiative|speed';

const COLUMN =
    /\b(?:strength|dexterity|constitution|intelligence|wisdom|charisma|armorClass|initiative|speed)\s*:/;

const WRITE =
    /\b(?:character|unit|unitBase)\.(?:create|createMany|update|updateMany|upsert)\s*\(|\bPrisma\.(?:Unit|Character|UnitBase)\w*(?:Create|Update)\w*Input\b|\bfunction\s+\w*RowData\b/;

const DUAL_WRITE = /\bcharacteristics(?:Patch)?\b|\bd20RowData\b|\bdraftFields\(/;

/** Only goes down; the S.4 switch removes the need for it. */
const EXEMPT: string[] = [];

const CALL_EXEMPT: string[] = [];

export const writesWithoutCharacteristics = (text: string) =>
    COLUMN.test(text) && WRITE.test(text) && !DUAL_WRITE.test(text);

const CALL =
    /\b(?:character|unit|unitBase)\.(?:create|createMany|update|updateMany|upsert)\s*\(/g;

const SCORE_SPREAD = /\.\.\.[^,]*\babilityScores\b/;

const SPREAD_IDENTIFIER = /\.\.\.\s*([A-Za-z_$][\w$]*)/g;

const spreadsStatObject = (body: string, source: string) =>
    [...body.matchAll(SPREAD_IDENTIFIER)].some(([, name]) =>
        new RegExp(
            `\\b(?:const|let|var)\\s+${name}\\s*=\\s*\\{[^}]*\\b(?:${COLUMNS})\\s*:`
        ).test(source)
    );

function callBodies(text: string): string[] {
    const bodies: string[] = [];

    for (const match of text.matchAll(CALL)) {
        let depth = 1;

        let i = match.index + match[0].length;

        const start = i;

        while (i < text.length && depth > 0) {
            if (text[i] === '(') depth += 1;
            else if (text[i] === ')') depth -= 1;

            i += 1;
        }

        bodies.push(text.slice(start, i));
    }

    return bodies;
}

export const callsWithoutCharacteristics = (text: string) =>
    callBodies(text).filter(
        (body) =>
            (COLUMN.test(body) ||
                SCORE_SPREAD.test(body) ||
                spreadsStatObject(body, text)) &&
            !DUAL_WRITE.test(body)
    );

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

    it('flags a single write call that spreads scores without characteristics', () => {
        expect(
            callsWithoutCharacteristics(
                'a.character.update({ data: { ...gain.abilityScores } }); b.character.update({ data: { ...x.fields, ...characteristicsPatch(x.fields) } })'
            )
        ).toHaveLength(1);
        expect(
            callsWithoutCharacteristics(
                'const stats = { strength: 10 }; prisma.unit.create({ data: { ...stats } })'
            )
        ).toHaveLength(1);
        expect(
            callsWithoutCharacteristics(
                'const fields = { name: "x" }; prisma.unit.create({ data: { ...fields } })'
            )
        ).toHaveLength(0);
        expect(
            callsWithoutCharacteristics(
                'const stats = { strength: 10 }; prisma.unit.create({ data: d20RowData({ ...stats }) })'
            )
        ).toHaveLength(0);
    });

    it('no write call keeps scores out of characteristics', () => {
        const calls = sourceFiles(SCANNED).flatMap((file) =>
            callsWithoutCharacteristics(
                fs.readFileSync(path.join(ROOT, file), 'utf8')
            ).map(() => file)
        );

        expect(calls.filter((file) => !CALL_EXEMPT.includes(file))).toEqual([]);
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
