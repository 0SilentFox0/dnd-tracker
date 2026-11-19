import { describe, expect, it, vi } from 'vitest';

import { dropRefs } from '@/lib/server/content/copy/drop-refs';

const id = (c: string) => 'c' + c.repeat(24);

const [GONE, KEPT] = [id('a'), id('b')];

describe('dropRefs itemStats', () => {
    it('strips dropped ids inside embedded JSON and keeps the rest', () => {
        const embed = {
            type: 'itemStats',
            value: JSON.stringify({ items: [GONE, KEPT], [GONE]: 1 }),
        };

        const out = dropRefs(
            { id: 'x', blocks: [embed] },
            new Set([GONE])
        ) as any;

        const parsed = JSON.parse(out.blocks[0].value);

        expect(parsed).toEqual({ items: [KEPT] });
        expect(out.blocks[0].type).toBe('itemStats');
    });

    it('leaves malformed itemStats unchanged', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        const embed = { type: 'itemStats', value: '{not json' };

        const out = dropRefs(
            { id: 'x', blocks: [embed] },
            new Set([GONE])
        ) as any;

        expect(out.blocks[0]).toEqual(embed);
    });
});
