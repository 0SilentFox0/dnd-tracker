import { describe, expect, it } from 'vitest';

import { summarizeChoices } from '../summary';

describe('summarizeChoices', () => {
    it('keeps label and numeric count, scaled counts become 1', () => {
        const { items, more } = summarizeChoices([
            { id: 'skills', label: 'Two skills', count: 2 },
            { id: 'tool', label: 'Tool', count: { scale: 'proficiency' } },
        ]);

        expect(items).toEqual([
            { id: 'skills', label: 'Two skills', count: 2 },
            { id: 'tool', label: 'Tool', count: 1 },
        ]);
        expect(more).toBe(0);
    });

    it('limits the list and reports the overflow', () => {
        const choices = ['a', 'b', 'c', 'd'].map((id) => ({
            id,
            label: id.toUpperCase(),
            count: 1,
        }));

        const { items, more } = summarizeChoices(choices);

        expect(items.map((i) => i.id)).toEqual(['a', 'b']);
        expect(more).toBe(2);
    });
});
