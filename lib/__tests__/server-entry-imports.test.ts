import { describe, expect, it } from 'vitest';

import { staticGraph } from './helpers/static-graph';

const FORBIDDEN = [
    'lib/utils/rules/systems/registry.ts',
    'lib/server/systems/registry.ts',
];

const ENTRIES = [
    'lib/db.ts',
    'lib/utils/api/api-auth.ts',
    'app/api/pusher/auth/route.ts',
];

describe('server entry imports', () => {
    it('walk sees row-hash from lib/db.ts', () => {
        expect(staticGraph(['lib/db.ts']).files).toContain(
            'lib/utils/content/row-hash.ts'
        );
    });

    it.each(ENTRIES)('%s does not pull a system registry or a system', (entry) => {
        const files = [...staticGraph([entry]).files];

        expect(files.filter((f) => FORBIDDEN.includes(f))).toEqual([]);
        expect(files.filter((f) => /^systems\/[^/]+\/index\.ts$/.test(f))).toEqual(
            []
        );
    });
});
