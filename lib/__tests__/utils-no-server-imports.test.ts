import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readSource, sources } from './helpers/source-files';

const SPEC = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

const reachesServer = (file: string, text: string): boolean =>
    [...text.matchAll(SPEC)].some(([, spec]) => {
        const resolved = spec.startsWith('.')
            ? path.posix.normalize(path.posix.join(path.posix.dirname(file), spec))
            : spec.replace(/^@\//, '');

        return resolved === 'lib/server' || resolved.startsWith('lib/server/');
    });

describe('lib/utils does not depend on lib/server', () => {
    it('no non-test file in lib/utils imports lib/server/*', () => {
        const offenders = sources('lib/utils').filter((file) =>
            reachesServer(file, readSource(file))
        );

        expect(offenders).toEqual([]);
    });

    it('the detector sees aliased, bare, dynamic, re-export and relative imports', () => {
        const file = 'lib/utils/a/b.ts';

        for (const text of [
            "import { x } from '@/lib/server/y';",
            "import '@/lib/server/systems/registry';",
            "const m = await import('@/lib/server/y');",
            "export { x } from '@/lib/server/y';",
            "import { x } from '../../server/y';",
        ])
            expect(reachesServer(file, text), text).toBe(true);

        expect(reachesServer(file, "import { x } from '@/lib/utils/y';")).toBe(
            false
        );
    });
});
