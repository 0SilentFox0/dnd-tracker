import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BUILTIN_SOUNDS } from '@/lib/constants/soundboard';

const publicDir = join(process.cwd(), 'public');

const licenses = readFileSync(join(publicDir, 'sfx', 'LICENSE.md'), 'utf8');

describe('builtin sound files', () => {
    it.each(BUILTIN_SOUNDS.map((s) => [s.url]))(
        '%s exists, is <= 100 KB and is licensed',
        (url) => {
            const path = join(publicDir, url);

            expect(existsSync(path)).toBe(true);
            expect(statSync(path).size).toBeLessThanOrEqual(100 * 1024);
            expect(licenses).toContain(url.replace('/sfx/', ''));
        }
    );
});
