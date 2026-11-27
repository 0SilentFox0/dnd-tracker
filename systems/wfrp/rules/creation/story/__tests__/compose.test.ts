import { describe, expect, it, vi } from 'vitest';

import { BACKGROUND_LIMIT, composeStory } from '../compose';

const phrase = (id: string, answer: string) => `[${id}:${answer}]`;

describe('composeStory', () => {
    it('returns empty result for no answers', () => {
        expect(composeStory({}, phrase)).toEqual({
            background: '',
            goals: [],
            truncated: false,
        });
        expect(composeStory({ origin: '  ', hair: '' }, phrase).background).toBe(
            ''
        );
    });

    it('orders paragraphs: appearance first, then blocks', () => {
        const { background } = composeStory(
            {
                faith: 'f',
                origin: 'o',
                family: 'fa',
                hair: 'h',
                age: 'a',
                leftHome: 'l',
            },
            phrase
        );

        expect(background).toBe(
            [
                '[age:a] [hair:h]',
                '[origin:o] [family:fa]',
                '[leftHome:l]',
                '[faith:f]',
            ].join('\n\n')
        );
    });

    it('sends ambitions and secret to goals only', () => {
        const { background, goals } = composeStory(
            {
                ambitionLong: ' long ',
                ambitionShort: 'short',
                secret: 'hush',
                origin: 'o',
            },
            phrase
        );

        expect(goals).toEqual(
            expect.arrayContaining([
                { text: 'long', kind: 'main' },
                { text: 'short', kind: 'personal' },
                { text: 'hush', kind: 'secret' },
            ])
        );
        expect(goals).toHaveLength(3);
        expect(background).toBe('[origin:o]');
    });

    it('passes the trimmed answer to phrase', () => {
        const spy = vi.fn(phrase);

        composeStory({ origin: '  home  ' }, spy);

        expect(spy).toHaveBeenCalledWith('origin', 'home');
    });

    it('cuts to the limit on a word boundary', () => {
        const answer = Array.from({ length: 1000 }, () => 'word').join(' ');

        const r = composeStory({ origin: answer }, (_id, a) => a);

        expect(r.truncated).toBe(true);
        expect(r.background.length).toBeLessThanOrEqual(BACKGROUND_LIMIT);
        expect(r.background.endsWith('word')).toBe(true);
        expect(answer.startsWith(r.background)).toBe(true);
    });
});
