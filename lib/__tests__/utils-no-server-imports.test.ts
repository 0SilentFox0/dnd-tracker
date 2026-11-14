import { describe, expect, it } from 'vitest';

import { readSource, sources } from './helpers/source-files';

const SERVER_IMPORT = /(?:from|import\()\s*["']@\/lib\/server\//;

describe('lib/utils does not depend on lib/server', () => {
    it('no non-test file in lib/utils imports @/lib/server/*', () => {
        const offenders = sources('lib/utils').filter((file) =>
            SERVER_IMPORT.test(readSource(file))
        );

        expect(offenders).toEqual([]);
    });
});
