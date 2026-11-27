// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStoryQuiz } from '../useStoryQuiz';

import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';

const fixedRng = (roll: number) => () => (roll - 1 + 0.5) / 100;

const appearance = {
    age: { base: 14, dice: 2 },
    heightCm: { base: 145, dice: 2 },
    eyes: ['blue', 'green'],
    hair: ['black', 'red'],
} satisfies NonNullable<SpeciesProfile['appearance']>;

describe('useStoryQuiz', () => {
    it('roll sets the translated table row', () => {
        const { result } = renderHook(() => useStoryQuiz({ rng: fixedRng(37) }));

        act(() => result.current.roll('origin'));

        expect(result.current.answers.origin).toBe(
            'wfrpStory.tables.origin.4'
        );
    });

    it('rolls appearance numbers and translated colours', () => {
        const { result } = renderHook(() =>
            useStoryQuiz({ rng: fixedRng(1), appearance })
        );

        act(() => result.current.roll('age'));
        act(() => result.current.roll('eyes'));

        expect(result.current.answers.age).toBe('16');
        expect(result.current.answers.eyes).toBe(
            'wfrpCreation.story.colours.blue'
        );
    });

    it('rollAll keeps filled answers', () => {
        const { result } = renderHook(() => useStoryQuiz({ rng: fixedRng(37) }));

        act(() => result.current.set('origin', 'my own'));
        act(() => result.current.rollAll());

        expect(result.current.answers.origin).toBe('my own');
        expect(result.current.answers.family).toBe(
            'wfrpStory.tables.family.4'
        );
    });

    it('drops the appearance block without a profile appearance', () => {
        const without = renderHook(() => useStoryQuiz({ rng: fixedRng(1) }));

        const withIt = renderHook(() =>
            useStoryQuiz({ rng: fixedRng(1), appearance })
        );

        expect(without.result.current.blocks.map((b) => b.id)).not.toContain(
            'appearance'
        );
        expect(withIt.result.current.blocks.map((b) => b.id)).toContain(
            'appearance'
        );

        act(() => without.result.current.roll('age'));

        expect(without.result.current.answers.age).toBeUndefined();
    });

    it('compose phrases answers through story.sentences', () => {
        const { result } = renderHook(() => useStoryQuiz({ rng: fixedRng(1) }));

        act(() => result.current.set('origin', 'X'));
        act(() => result.current.set('secret', 'S'));

        const c = result.current.compose();

        expect(c.background).toContain('wfrpStory.sentences.origin');
        expect(c.goals).toEqual([{ text: 'S', kind: 'secret' }]);
    });
});
