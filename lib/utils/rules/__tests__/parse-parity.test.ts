import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
    EXPECTED_DIFFERENCES,
    expectedDifferenceFor,
} from '../parse-parity-expected';
import { parseRules } from '../schema';

import { legacyParseRules } from '@/scripts/db/lib/legacy-rules-parse';
import { diffRules } from '@/scripts/db/lib/rules-parse-diff';

const TEMPLATES = [
    'grim-d100',
    'grim-d100-empty',
    'heroes-homm',
    'srd-5.2',
    'srd-5.2-empty',
];

const readTemplate = (id: string): unknown =>
    JSON.parse(
        readFileSync(
            join(process.cwd(), 'data/templates', id, 'rules.json'),
            'utf8'
        )
    );

describe('parseRules parity with frozen pre-Ч3 parse', () => {
    it.each(TEMPLATES)('template %s parses identically', (id) => {
        const raw = readTemplate(id);

        expect(parseRules(raw)).toEqual(legacyParseRules(raw));
    });

    const srd = readTemplate('srd-5.2') as Record<string, unknown>;

    const CASES: Record<string, unknown> = {
        null: null,
        'not an object': 'rules',
        'empty object': {},
        'missing sections': { morale: { enabled: false, cap: 5 } },
        'invalid section value': {
            ...srd,
            morale: { enabled: 'yes', cap: 99 },
        },
        'partial section fills defaults': { ...srd, criticals: { critOn: 19 } },
        'unknown extra key in section': {
            ...srd,
            saves: { proficiency: true, bogus: 1 },
        },
        'unknown top-level key': { ...srd, futureSection: { a: 1 } },
        'legacy retaliation key': {
            ...srd,
            actions: {
                enabled: true,
                opportunityAttacks: true,
                retaliation: false,
                variant: '2024',
            },
        },
        'initiative out of order': {
            ...srd,
            initiative: { heroMin: 30, heroMax: 5, mode: 'roll' },
        },
        'criticals out of order': {
            ...srd,
            criticals: { critOn: 3, fumbleOn: 5 },
        },
        'invalid custom condition item': {
            ...srd,
            conditions: {
                enabled: true,
                exhaustion: '2014',
                custom: [
                    { key: 'BAD KEY', name: '', description: '', markers: [] },
                ],
            },
        },
        'invalid system key': {
            ...srd,
            system: { key: 'nope' },
            classes: { enabled: true },
        },
        'system with unknown module': {
            ...srd,
            system: { key: 'dnd5e', modules: ['nope'] },
        },
        'system modules deduped and sorted': {
            ...srd,
            system: { key: 'dnd5e', modules: ['b', 'a', 'a'] },
        },
    };

    const BY_DESIGN: Record<string, { expected: unknown }> = {
        'unknown extra key in section': { expected: { proficiency: true } },
        'invalid custom condition item': {
            expected: { enabled: true, exhaustion: '2014' },
        },
    };

    it.each(Object.keys(CASES))('synthetic: %s', (name) => {
        const next = parseRules(CASES[name]);

        const legacy = legacyParseRules(CASES[name]);

        const difference = BY_DESIGN[name];

        if (!difference) return expect(next).toEqual(legacy);

        const shared = EXPECTED_DIFFERENCES.find((entry) => entry.id === name);

        if (!shared)
            throw new Error(`no shared expected difference for ${name}`);

        expect(next[shared.section], shared.reason).toEqual(
            difference.expected
        );
        expect({ ...next, [shared.section]: legacy[shared.section] }).toEqual(
            legacy
        );
    });

    it('by-design differences are explained per exact path only', () => {
        for (const name of Object.keys(BY_DESIGN)) {
            const { differences } = diffRules(CASES[name]);

            expect(differences.length, name).toBeGreaterThan(0);
            expect(
                differences.filter((d) => !d.byDesign),
                name
            ).toEqual([]);
        }
    });

    it('predicates do not cover other paths or a changed kept value', () => {
        const rawSaves = { saves: { proficiency: true, bogus: 1 } };

        expect(
            expectedDifferenceFor(
                'saves.proficiency',
                rawSaves,
                parseRules(rawSaves)
            )
        ).toBeDefined();
        expect(
            expectedDifferenceFor('saves.other', rawSaves, parseRules(rawSaves))
        ).toBeUndefined();
        expect(
            expectedDifferenceFor(
                'saves.proficiency',
                rawSaves,
                parseRules({ saves: { proficiency: false } })
            )
        ).toBeUndefined();

        const badCustom = {
            conditions: {
                enabled: true,
                exhaustion: '2014',
                custom: [{ key: 'BAD KEY' }],
            },
        };

        expect(
            expectedDifferenceFor(
                'conditions.enabled',
                badCustom,
                parseRules(badCustom)
            )
        ).toBeDefined();
        expect(
            expectedDifferenceFor(
                'conditions.enabled',
                badCustom,
                parseRules({ conditions: { enabled: false } })
            )
        ).toBeUndefined();
        expect(
            expectedDifferenceFor(
                'conditions.other',
                badCustom,
                parseRules(badCustom)
            )
        ).toBeUndefined();

        const validCustom = {
            conditions: { enabled: true, exhaustion: '2014', custom: [] },
        };

        expect(
            expectedDifferenceFor(
                'conditions.enabled',
                validCustom,
                parseRules(validCustom)
            )
        ).toBeUndefined();
    });

    it('invalid system.modules are dropped from the parse result but reported', () => {
        const warn = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined);

        expect(
            parseRules({
                system: { key: 'dnd5e', modules: ['definitely-not-a-module'] },
            }).system
        ).toEqual({ key: 'dnd5e' });
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('definitely-not-a-module')
        );

        warn.mockRestore();
    });
});
