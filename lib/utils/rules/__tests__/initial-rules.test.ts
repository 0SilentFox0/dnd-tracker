import { describe, expect, it } from 'vitest';

import { initialRules } from '../initial-rules';
import { parseRules } from '../schema';
import { sectionsOfSystem } from '../section-registry';
import { getRule, rulePaths } from '../sections';

import grimEmpty from '@/data/templates/grim-d100-empty/rules.json';
import heroesHomm from '@/data/templates/heroes-homm/rules.json';
import srdEmpty from '@/data/templates/srd-5.2-empty/rules.json';

const LOCALIZED_OR_DATA = /^(defaultAttacks|advancement|tables)\./;

const differences = (key: string, pack: unknown): string[] => {
    const ours = parseRules(initialRules({ key }));

    const theirs = parseRules(pack);

    return rulePaths(sectionsOfSystem({ key }))
        .filter((path) => !LOCALIZED_OR_DATA.test(path))
        .filter(
            (path) =>
                JSON.stringify(getRule(ours, path)) !==
                JSON.stringify(getRule(theirs, path))
        )
        .map(
            (path) =>
                `${path}: ${JSON.stringify(getRule(ours, path))} vs ${JSON.stringify(getRule(theirs, path))}`
        );
};

describe('initialRules parity with the empty packs', () => {
    it.each([
        ['dnd5e', srdEmpty],
        ['wfrp', grimEmpty],
        ['homm', heroesHomm],
    ])('%s', (key, pack) => {
        expect(differences(key, pack)).toEqual([]);
    });
});

describe('initialRules', () => {
    it('writes the module set explicitly, [] for a bare base', () => {
        expect(initialRules({ key: 'dnd5e' }).system).toEqual({
            key: 'dnd5e',
            modules: [],
        });
        expect(initialRules({ key: 'homm' }).system).toEqual({
            key: 'homm',
            modules: [
                'artifactsets',
                'heroscaling',
                'morale',
                'retaliation',
                'skilltrees',
                'unitstacks',
            ],
        });
    });

    it('a module of a bare base brings its section with defaults', () => {
        const rules = parseRules(
            initialRules({ key: 'dnd5e', modules: ['morale'] })
        );

        expect(rules.system.modules).toEqual(['morale']);
        expect(sectionsOfSystem(rules.system)).toHaveProperty('morale');
        expect(rules.morale).toEqual({ enabled: true, cap: 3 });
    });

    it('extra sections land in the result', () => {
        const extra = { defaultAttacks: { meleeName: 'Fist' } };

        expect(initialRules({ key: 'dnd5e' }, extra).defaultAttacks).toEqual({
            meleeName: 'Fist',
        });
    });
});
