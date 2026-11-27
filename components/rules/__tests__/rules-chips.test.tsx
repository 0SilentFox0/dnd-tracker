// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RulesHeaderChips } from '../RulesChips';
import { RulesSide } from '../RulesSide';

vi.mock('../mechanic-text', () => ({
    useMechanicText: () => (key: string) => `label:${key}`,
}));

afterEach(cleanup);

describe('rules chips', () => {
    it('module chips collapse to +N more', () => {
        const chips = Array.from({ length: 6 }, (_, i) => ({
            key: `m${i}`,
            label: `Module ${i}`,
            tone: 'meta' as const,
        }));

        render(<RulesHeaderChips chips={chips} />);

        expect(screen.getByText('Module 3')).toBeTruthy();
        expect(screen.queryByText('Module 4')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /rules\.page\.more/ }));

        expect(screen.getByText('Module 5')).toBeTruthy();
    });

    it('changed chip reset calls reset(key)', () => {
        const reset = vi.fn();

        render(<RulesSide changed={['morale', 'initiative']} reset={reset} />);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'rules.page.resetSection: label:morale',
            })
        );

        expect(reset).toHaveBeenCalledWith('morale');
    });

    it('changed chips collapse after six', () => {
        const keys = Array.from({ length: 8 }, (_, i) => `k${i}`);

        render(<RulesSide changed={keys} reset={vi.fn()} />);

        expect(screen.queryByText('label:k7')).toBeNull();
        expect(screen.getByRole('button', { name: /rules\.page\.more/ })).toBeTruthy();
    });

    it('save disabled without changes', () => {
        render(
            <RulesSide
                changed={[]}
                reset={vi.fn()}
                actions={{
                    formId: 'f',
                    canSave: false,
                    isSaving: false,
                    onCancel: vi.fn(),
                }}
            />
        );

        expect(
            screen.getByRole('button', { name: 'common.actions.save' })
        ).toBeDisabled();
    });
});
