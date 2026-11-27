// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IdentityStep } from '../IdentityStep';

vi.mock('@/components/common/fields/ImageUpload', () => ({
    ImageUpload: () => null,
}));

afterEach(cleanup);

const form = {
    step: { total: 5 },
    preview: null,
    identity: {
        values: { name: 'Hans' },
        set: vi.fn(),
        quiz: { truncated: false, canReplace: false, replace: vi.fn() },
    },
} as never;

const withQuiz = (quiz: object, replace = vi.fn()) =>
    ({
        step: { total: 5 },
        preview: null,
        identity: {
            values: { name: 'Hans' },
            set: vi.fn(),
            quiz: { truncated: false, canReplace: false, replace, ...quiz },
        },
    }) as never;

describe('IdentityStep', () => {
    it('has no alignment select for a system without alignments', () => {
        render(<IdentityStep form={form} />);

        expect(
            screen.queryByText('wfrpCreation.identity.alignment')
        ).toBeNull();
        expect(
            screen.getByLabelText(/wfrpCreation.identity.name/)
        ).toBeTruthy();
    });

    it('offers the quiz replacement only when allowed and runs it', () => {
        const replace = vi.fn();

        const { rerender } = render(<IdentityStep form={form} />);

        expect(screen.queryByText('wfrpStory.replace')).toBeNull();

        rerender(
            <IdentityStep form={withQuiz({ canReplace: true }, replace)} />
        );
        fireEvent.click(screen.getByText('wfrpStory.replace'));

        expect(replace).toHaveBeenCalled();
    });

    it('shows the truncation warning', () => {
        render(<IdentityStep form={withQuiz({ truncated: true })} />);

        expect(screen.getByText('wfrpStory.truncated')).toBeTruthy();
    });

    it('disables adding goals at the limit', () => {
        const at = (n: number) =>
            ({
                step: { total: 5 },
                preview: null,
                identity: {
                    values: {
                        name: 'Hans',
                        goals: Array.from({ length: n }, (_, i) => ({
                            text: `g${i}`,
                            kind: 'personal',
                        })),
                    },
                    set: vi.fn(),
                    quiz: {
                        truncated: false,
                        canReplace: false,
                        replace: vi.fn(),
                    },
                },
            }) as never;

        const { rerender } = render(<IdentityStep form={at(4)} />);

        fireEvent.change(
            screen.getByLabelText('wfrpCreation.identity.goalPlaceholder'),
            {
                target: { value: 'new' },
            }
        );

        expect(
            (
                screen.getByText(
                    'wfrpCreation.identity.addGoal'
                ) as HTMLButtonElement
            ).disabled
        ).toBe(false);

        rerender(<IdentityStep form={at(5)} />);

        expect(
            (
                screen.getByText(
                    'wfrpCreation.identity.addGoal'
                ) as HTMLButtonElement
            ).disabled
        ).toBe(true);
    });
});
