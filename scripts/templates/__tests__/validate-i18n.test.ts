import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { type Pack, type PackRow, readPack } from '../lib/pack';
import { validatePack } from '../lib/validate';
import { nameRefIssues } from '../systems/homm/name-refs';

const fixtures = path.join(__dirname, 'fixtures');

const dirs: string[] = [];

afterEach(() => {
    for (const dir of dirs.splice(0))
        fs.rmSync(dir, { recursive: true, force: true });
});

function withDictionary(
    dictionary: Record<string, { text: string; en: string }> | null,
    edit?: (pack: Pack) => void
) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-i18n-'));

    dirs.push(dir);
    fs.cpSync(
        path.join(fixtures, 'fixture-pack'),
        path.join(dir, 'fixture-pack'),
        { recursive: true }
    );

    const file = path.join(dir, 'fixture-pack', 'i18n', 'uk.json');

    if (dictionary === null) fs.rmSync(file);
    else fs.writeFileSync(file, JSON.stringify(dictionary));

    const pack = readPack('fixture-pack', dir);

    edit?.(pack);

    return validatePack(pack, { dir })
        .filter((issue) => issue.level === 'error')
        .map((issue) => issue.message);
}

describe('validatePack: dictionaries and schools', () => {
    it('flags a locale without its dictionary file', () => {
        expect(withDictionary(null)).toEqual([
            'i18n uk: i18n/uk.json is missing',
        ]);
    });

    it('flags a placeholder mismatch between text and en', () => {
        const errors = withDictionary({
            'feats/fix-alert/name': { text: 'Пильний {x}', en: 'Alert' },
        });

        expect(errors).toEqual([
            'i18n uk: placeholders of "feats/fix-alert/name" differ between text and en',
        ]);
    });

    it('flags two names of one kind that translate to the same name', () => {
        const errors = withDictionary({
            'feats/fix-alert/name': { text: 'Той самий', en: 'Alert' },
            'feats/fix-archery/name': { text: 'Той самий', en: 'Archery' },
        });

        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain('Той самий');
    });

    it('flags a school that is not a spell group name', () => {
        const errors = withDictionary({}, (pack) => {
            (pack.rows.spells as PackRow[])[0].damageBonus = {
                school: 'Nowhere',
            };
        });

        expect(
            errors.some((m) =>
                m.includes('school "Nowhere" is not a spell group name')
            )
        ).toBe(true);
    });
});

describe('nameRefIssues (HOMM D30)', () => {
    const pack = (rows: Pack['rows']) =>
        ({ manifest: { include: undefined }, rows }) as unknown as Pack;

    const base = {
        races: [{ slug: 'demons', name: 'Demons' }],
        'main-skills': [{ slug: 'attack', name: 'Attack' }],
    } as unknown as Pack['rows'];

    it('accepts exact race and main-skill names', () => {
        const rows = {
            ...base,
            units: [
                {
                    slug: 'imp',
                    name: 'Imp',
                    abilities: [
                        {
                            condition: {
                                type: 'targetRace',
                                races: ['Demons'],
                            },
                            effects: [{ kind: 'summon', group: 'Demons' }],
                        },
                    ],
                },
            ],
            skillTrees: [
                {
                    slug: 'demons',
                    race: 'Demons',
                    skills: { mainSkills: [{ id: 'attack', name: 'Attack' }] },
                },
            ],
        } as unknown as Pack['rows'];

        expect(nameRefIssues(pack(rows))).toEqual([]);
    });

    it('checks condition.races of any condition type and effects[].group of any effect kind, as the overlay maps them', () => {
        const rows = {
            ...base,
            units: [
                {
                    slug: 'imp',
                    name: 'Imp',
                    abilities: [
                        {
                            condition: { type: 'any', races: ['Ghosts'] },
                            effects: [{ kind: 'damage', group: 'Elves' }],
                        },
                    ],
                },
            ],
        } as unknown as Pack['rows'];

        expect(nameRefIssues(pack(rows)).map((i) => i.message)).toEqual([
            'units "imp": race name "Ghosts" is not a race of the pack',
            'units "imp": race name "Elves" is not a race of the pack',
        ]);
    });

    it('flags unknown race names in conditions, summon groups and trees, and unknown branch names', () => {
        const rows = {
            ...base,
            units: [
                {
                    slug: 'imp',
                    name: 'Imp',
                    abilities: [
                        {
                            condition: {
                                type: 'targetRace',
                                races: ['Демони'],
                            },
                            effects: [{ kind: 'summon', group: 'Elves' }],
                        },
                    ],
                },
            ],
            skillTrees: [
                {
                    slug: 'x',
                    race: 'Ghosts',
                    skills: { mainSkills: [{ id: 'attack', name: 'Напад' }] },
                },
            ],
        } as unknown as Pack['rows'];

        expect(nameRefIssues(pack(rows)).map((i) => i.message)).toEqual([
            'units "imp": race name "Демони" is not a race of the pack',
            'units "imp": race name "Elves" is not a race of the pack',
            'skillTrees "x": race "Ghosts" is not a race of the pack',
            'skillTrees "x": branch name "Напад" is not a main skill of the pack',
        ]);
    });
});
