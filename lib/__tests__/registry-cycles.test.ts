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

// E3: invert fromCharacter / make the registry lazy
const KNOWN_CYCLES = ['rules:d20', 'server:d20'];

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
});
