import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { RAW_CONTROL_TAGS } from '@/eslint/raw-controls.mjs';

const exempt: { file: string }[] = JSON.parse(
    readFileSync('ratchets/raw-controls-exempt.json', 'utf8')
);

const rawTag = new RegExp(`<(${RAW_CONTROL_TAGS.join('|')})[\\s>]`);

describe('raw-controls baseline', () => {
    it('lists no duplicate files', () =>
        expect(new Set(exempt.map((e) => e.file)).size).toBe(exempt.length));

    it.each(exempt.map((e) => e.file))('%s still holds a raw tag', (file) =>
        expect(readFileSync(file, 'utf8')).toMatch(rawTag)
    );
});
