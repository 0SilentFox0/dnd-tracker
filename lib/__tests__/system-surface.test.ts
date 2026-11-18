import { describe, expect, it } from 'vitest';

import {
    countModuleSurface,
    readSurfaceExempt,
    scanCoreMessageKeys,
    scanModuleSurface,
    scanSchemaColumns,
} from '@/scripts/shared/system-ratchet';

const ids = ['morale', 'lair', 'skilltrees'];

describe('module surface ratchet', () => {
    const exempt = readSurfaceExempt();

    it('case labels, keys and operation names only fall', () => {
        const found = scanModuleSurface();

        const problems = [
            ...Object.entries(found)
                .filter(([file, n]) => n > (exempt.code[file] ?? 0))
                .map(([file, n]) => `new leak: ${file} has ${n}`),
            ...Object.entries(exempt.code)
                .filter(([file, max]) => (found[file] ?? 0) < max)
                .map(([file]) => `lower the entry: ${file}`),
        ];

        expect(problems).toEqual([]);
    });

    it('schema columns named after a module stay on the allowlist until the contract step', () =>
        expect(scanSchemaColumns()).toEqual(exempt.schema));

    it('core message namespaces carry no new module keys', () =>
        expect(scanCoreMessageKeys()).toEqual(exempt.messages));

    it.each([
        ["case 'morale':", 1],
        ["{ 'lair': 1 }", 1],
        ['morale: 1', 1],
        ["'morale-check'", 1],
        ["'pending-lair'", 1],
        ["const x = 'moraleOnly'", 0],
        ['x.morale', 0],
    ])('counts %s as %i', (text, n) =>
        expect(countModuleSurface(text, ids)).toBe(n)
    );

    it('finds module columns in a schema', () =>
        expect(
            scanSchemaColumns(
                'model Foo {\n  id String\n  pendingMoraleCheck Json?\n}\nmodel SkillTree {\n  id String\n}',
                ids
            )
        ).toEqual(['Foo.pendingMoraleCheck', 'model SkillTree']));
});
