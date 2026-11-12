import { describe, expect, it } from 'vitest';

import { assertLocalProdcopy, parseTemplateKeys } from '../battle-sweep/args';
import {
    modeRuns,
    moraleExpectation,
    profileOf,
    SWEEP_PROFILES,
} from '../battle-sweep/profiles';
import { diffRowCounts, overallExit } from '../battle-sweep/row-counts';
import { heroSpecsFor } from '../battle-sweep/seed-template-heroes';

describe('battle-sweep template selection', () => {
    it('runs every template without --template', () =>
        expect(parseTemplateKeys(['--mode', 'sweep'])).toEqual([
            ...SWEEP_PROFILES,
        ]));

    it('runs one template with --template', () =>
        expect(
            parseTemplateKeys(['--template', 'grim-d100']).map((p) => p.key)
        ).toEqual(['grim-d100']));

    it('rejects an unknown template listing the valid ones', () => {
        expect(() => parseTemplateKeys(['--template', 'nope'])).toThrow(
            /srd-5\.2, srd-5\.2\+morale, heroes-homm, grim-d100/
        );
        expect(() => parseTemplateKeys(['--template'])).toThrow(
            /Unknown template/
        );
    });

    it('has a profile for every sweep template and heroes-homm keeps the full mode set', () => {
        expect(SWEEP_PROFILES.map((p) => p.key)).toEqual([
            'srd-5.2',
            'srd-5.2+morale',
            'heroes-homm',
            'grim-d100',
        ]);
        expect(profileOf('heroes-homm')?.modes).toEqual(
            expect.arrayContaining([
                'sweep',
                'targeted',
                'control',
                'level5',
                'maze',
            ])
        );
        expect(profileOf('grim-d100')?.judge).toBe('server');
    });

    it('gates modes by profile', () => {
        const homm = profileOf('heroes-homm')!;

        const grim = profileOf('grim-d100')!;

        expect(modeRuns(homm, 'all', 'control')).toBe(true);
        expect(modeRuns(homm, 'targeted', 'maze')).toBe(true);
        expect(modeRuns(homm, 'sweep', 'control')).toBe(false);
        expect(modeRuns(grim, 'all', 'control')).toBe(false);
        expect(modeRuns(grim, 'all', 'system')).toBe(true);
    });
});

describe('srd-5.2+morale profile', () => {
    it('opens the srd-5.2 template with the morale module and mixed-sign hero morale', () => {
        const profile = profileOf('srd-5.2+morale')!;

        expect(profile.template).toBe('srd-5.2');
        expect(profile.rules).toEqual({
            modules: ['morale'],
            patch: { morale: { enabled: true, cap: 3 } },
        });
        expect(parseTemplateKeys(['--template', 'srd-5.2+morale'])).toEqual([
            profile,
        ]);
        expect(
            heroSpecsFor([{ name: 'Elf' }], [], 4, profile.heroMorale).map(
                (s) => s.morale
            )
        ).toEqual([2, -2, 2, -2]);
        expect(heroSpecsFor([{ name: 'Elf' }], [], 1)[0]).not.toHaveProperty(
            'morale'
        );
    });

    it('expects morale checks only with the module; d20 templates without it expect none', () => {
        expect(moraleExpectation(profileOf('srd-5.2+morale')!)).toBe(
            'required'
        );
        expect(moraleExpectation(profileOf('srd-5.2')!)).toBe('absent');
        expect(moraleExpectation(profileOf('grim-d100')!)).toBeUndefined();
    });
});

describe('battle-sweep safety', () => {
    it('accepts only the local prodcopy', () => {
        expect(() =>
            assertLocalProdcopy(
                'postgresql://postgres:postgres@localhost:54322/prodcopy'
            )
        ).not.toThrow();
        expect(() =>
            assertLocalProdcopy(
                'postgresql://postgres:postgres@localhost:54322/postgres'
            )
        ).toThrow();
        expect(() =>
            assertLocalProdcopy('postgresql://u:p@db.example.com:6543/prodcopy')
        ).toThrow();
        expect(() => assertLocalProdcopy(undefined)).toThrow();
    });

    it('reports changed tables and a failing exit when any template fails', () => {
        expect(diffRowCounts({ a: 1, b: 2 }, { a: 1, b: 3, c: 1 })).toEqual([
            'b: 2 -> 3',
            'c: 0 -> 1',
        ]);
        expect(diffRowCounts({ a: 1 }, { a: 1 })).toEqual([]);
        expect(
            overallExit([
                { key: 'x', exitCode: 0 },
                { key: 'y', exitCode: 1 },
            ])
        ).toBe(1);
        expect(overallExit([{ key: 'x', exitCode: 0 }])).toBe(0);
    });
});

describe('heroSpecsFor', () => {
    it('cycles template races and classes', () => {
        const specs = heroSpecsFor(
            [{ name: 'Elf' }, { name: 'Orc' }],
            [{ id: 'c1', name: 'Wizard' }],
            3
        );

        expect(specs.map((s) => [s.race, s.classId])).toEqual([
            ['Elf', 'c1'],
            ['Orc', 'c1'],
            ['Elf', 'c1'],
        ]);
    });

    it('falls back to a classless hero and refuses a raceless template', () => {
        expect(heroSpecsFor([{ name: 'Human' }], [], 1)[0].classId).toBeNull();
        expect(() => heroSpecsFor([], [], 1)).toThrow();
    });
});
