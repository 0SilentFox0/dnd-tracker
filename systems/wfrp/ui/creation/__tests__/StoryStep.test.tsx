// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StoryStep } from '../StoryStep';

afterEach(cleanup);

const makeForm = (answers: Record<string, string>) => {
    const roll = vi.fn();

    const rollAll = vi.fn();

    return {
        form: {
            shown: (_k: string, v: string) => v,
            story: {
                answers,
                set: vi.fn(),
                roll,
                rollAll,
                blocks: [{ id: 'origin', questions: ['origin', 'family'] }],
            },
        } as never,
        roll,
        rollAll,
    };
};

describe('StoryStep', () => {
    it('the dice button rolls its own question', () => {
        const { form, roll } = makeForm({});

        render(<StoryStep form={form} />);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'wfrpStory.roll wfrpStory.questions.family',
            })
        );

        expect(roll).toHaveBeenCalledWith('family');
    });

    it('shows typed answers and Roll all delegates to the hook', () => {
        const { form, rollAll } = makeForm({ origin: 'typed' });

        render(<StoryStep form={form} />);

        expect(screen.getByDisplayValue('typed')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpStory.rollAll' })
        );

        expect(rollAll).toHaveBeenCalled();
    });
});
