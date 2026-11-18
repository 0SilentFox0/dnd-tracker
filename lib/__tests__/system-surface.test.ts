import { describe, expect, it } from 'vitest';

import {
    countModuleModelAccess,
    countModuleSurface,
    readSurfaceExempt,
    scanCoreMessageKeys,
    scanModuleSurface,
    scanSchemaColumns,
} from '@/scripts/shared/system-ratchet';

const ids = [
    'morale',
    'lair',
    'skilltrees',
    'skilltree',
    'skillTree',
    'artifactSet',
];

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
        ['const x = 1; x.morale', 1],
        ['skipMorale: true', 1],
        ['const artifactSets = []', 1],
        ["['skilltrees', 'x']", 1],
        ['// morale is ignored in comments', 0],
        ['/* lair\n skillTree */ const x = 1', 0],
        ['const flair = 1', 0],
        ["'skill-tree'", 1],
    ])('counts %s as %i', (text, n) =>
        expect(countModuleSurface(text, ids)).toBe(n)
    );

    it.each([
        ['prisma.skillTree.findMany()', 'lib/a.ts', 1],
        ['tx.artifactSet.create({})', 'lib/a.ts', 1],
        ['prisma.skillTree.findMany()', 'systems/skilltrees/a.ts', 0],
        ['prisma.character.findMany()', 'lib/a.ts', 0],
    ])('model access %s in %s is %i', (text, file, n) =>
        expect(countModuleModelAccess(text, file)).toBe(n)
    );

    it('finds module columns in a schema', () =>
        expect(
            scanSchemaColumns(
                'model Foo {\n  id String\n  pendingMoraleCheck Json?\n}\nmodel SkillTree {\n  id String\n}',
                ids
            )
        ).toEqual(['Foo.pendingMoraleCheck', 'model SkillTree']));
});
