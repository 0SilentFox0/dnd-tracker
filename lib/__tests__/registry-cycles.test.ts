import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { ROOT, staticGraph } from './helpers/static-graph';

const PAIRS = [
    {
        name: 'rules',
        registry: 'lib/utils/rules/systems/registry.ts',
        layer: 'index.ts',
    },
    {
        name: 'server',
        registry: 'lib/server/systems/registry.ts',
        layer: 'server/index.ts',
    },
    {
        name: 'ui',
        registry: 'components/systems/registry.ts',
        layer: 'ui/index.ts',
    },
];

const KNOWN_CYCLES: string[] = [];

const LOOKUPS = [
    'lib/utils/rules/systems/lookup.ts',
    'lib/server/systems/lookup.ts',
    'components/systems/lookup.ts',
].filter((f) => fs.existsSync(path.join(ROOT, f)));

const ids = fs
    .readdirSync(path.join(ROOT, 'systems'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

describe('registry <-> system import cycles', () => {
    it('matches the known cycle list', () => {
        const found = PAIRS.flatMap(({ name, registry, layer }) =>
            ids
                .filter((id) =>
                    fs.existsSync(path.join(ROOT, 'systems', id, layer))
                )
                .filter((id) =>
                    staticGraph([`systems/${id}/${layer}`]).files.has(registry)
                )
                .map((id) => `${name}:${id}`)
        ).sort();

        expect(
            found,
            'a new cycle, or one is gone: shrink KNOWN_CYCLES'
        ).toEqual(KNOWN_CYCLES);
    });

    it.each(LOOKUPS)('%s does not reach a system implementation', (lookup) => {
        const reached = [...staticGraph([lookup]).files].filter(
            (f) => /^systems\//.test(f) && !/^systems\/[^/]+\/meta\.ts$/.test(f)
        );

        expect(reached).toEqual([]);
    });

    it('a lookup never reaches its own install root', () => {
        for (const lookup of LOOKUPS) {
            const root = lookup.replace(/lookup\.ts$/, 'registry.ts');

            expect(staticGraph([lookup]).files.has(root)).toBe(false);
        }
    });
});
