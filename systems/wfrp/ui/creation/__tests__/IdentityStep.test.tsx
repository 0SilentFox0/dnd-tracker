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

        expect(screen.queryByText('wfrpCreation.story.replace')).toBeNull();

        rerender(<IdentityStep form={withQuiz({ canReplace: true }, replace)} />);
        fireEvent.click(screen.getByText('wfrpCreation.story.replace'));

        expect(replace).toHaveBeenCalled();
    });

    it('shows the truncation warning', () => {
        render(<IdentityStep form={withQuiz({ truncated: true })} />);

        expect(screen.getByText('wfrpCreation.story.truncated')).toBeTruthy();
    });
});
