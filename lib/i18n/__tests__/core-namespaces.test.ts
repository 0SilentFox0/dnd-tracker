import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CORE_NAMESPACES } from '@/lib/i18n/core-namespaces';

describe('CORE_NAMESPACES', () => {
    it('every namespace has a message file in each locale (a typo is not a new namespace)', () => {
        const missing = CORE_NAMESPACES.flatMap((ns) =>
            ['en', 'uk']
                .filter(
                    (locale) =>
                        !existsSync(
                            join(
                                process.cwd(),
                                'messages',
                                locale,
                                `${ns}.json`
                            )
                        )
                )
                .map((locale) => `${locale}/${ns}`)
        );

        expect(missing).toEqual([]);
    });

    it('has no duplicates', () => {
        expect(new Set(CORE_NAMESPACES).size).toBe(CORE_NAMESPACES.length);
    });
});
