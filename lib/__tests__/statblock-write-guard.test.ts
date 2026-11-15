import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT, sourceFiles } from '@/scripts/shared/system-ratchet';

const SCANNED = ['lib', 'app', 'scripts', 'systems'];

const COLUMNS =
    'strength|dexterity|constitution|intelligence|wisdom|charisma|armorClass|initiative|speed';

const COLUMN = new RegExp(
    `(?:\\b(?:${COLUMNS})\\s*:|\\b(?:${COLUMNS})\\b(?=\\s*[,}])|\\[\\s*['\"](?:${COLUMNS})['\"]\\s*\\]\\s*:)`
);

/** Only goes down; the S.4 switch removes the need for it. */
const EXEMPT: string[] = [];

const CALL_EXEMPT: string[] = [];

export const writesWithoutCharacteristics = (text: string) =>
    callsWithoutCharacteristics(text).length > 0;

const CALL =
    /\b(?:character|unit|unitBase)\.(?:create|createMany|update|updateMany|upsert)\s*\(/g;

const SCORE_SPREAD = /\.\.\.[^,]*\babilityScores\b/;

const SPREAD_IDENTIFIER = /\.\.\.\s*([A-Za-z_$][\w$]*)/g;

const spreadsStatObject = (body: string, source: string) =>
    [...body.matchAll(SPREAD_IDENTIFIER)].some(([, name]) =>
        new RegExp(
            `\\b(?:const|let|var)\\s+${name}\\s*=\\s*\\{[^}]*${COLUMN.source}`
        ).test(source)
    );

const objectBodyAfter = (text: string, start: number): string => {
    const open = text.indexOf('{', start);

    if (open < 0) return text.slice(start);

    let depth = 0;

    for (let i = open; i < text.length; i++) {
        if (text[i] === '{') depth++;

        if (text[i] === '}' && --depth === 0) return text.slice(open, i + 1);
    }

    return text.slice(open);
};

const writeData = (body: string) => {
    const match = /\bdata\s*:\s*/.exec(body);

    if (!match) return '';

    const start = match.index + match[0].length;

    return body[start] === '{'
        ? objectBodyAfter(body, start)
        : body.slice(start);
};

const hasDualWriteData = (body: string) =>
    /\b(?:characteristics(?:Patch)?|d20RowData|draftFields|unitCreateData|toUnitCreateData)\b/.test(
        writeData(body)
    );

const hasStatSpread = (body: string, source: string) => {
    const data = writeData(body);

    const keyVariable = new RegExp(
        `\\b(?:const|let)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*['\"](?:${COLUMNS})['\"]`
    );

    const keyMatch = keyVariable.exec(source);

    return (
        COLUMN.test(data) ||
        SCORE_SPREAD.test(data) ||
        spreadsStatObject(data, source) ||
        Boolean(keyMatch && data.includes(`[${keyMatch[1]}]`))
    );
};

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
            hasStatSpread(body, text) && !hasDualWriteData(body)
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
            callsWithoutCharacteristics(
                'const strength = 10; prisma.unit.create({ data: { strength } })'
            )
        ).toHaveLength(1);
        expect(
            callsWithoutCharacteristics(
                "const key = 'strength'; prisma.unit.update({ data: { [key]: 16 } })"
            )
        ).toHaveLength(1);
        expect(
            callsWithoutCharacteristics(
                'const strength = 10; const stats = { strength }; prisma.unit.create({ data: { ...stats } })'
            )
        ).toHaveLength(1);
        expect(
            callsWithoutCharacteristics(
                'prisma.unit.update({ data: { strength: 10 }, select: { characteristics: true } })'
            )
        ).toHaveLength(1);
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
