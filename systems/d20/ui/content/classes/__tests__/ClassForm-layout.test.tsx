// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeClass } from '@/lib/utils/characters/classes/__tests__/class-fixtures';
import { ClassForm } from '@/systems/d20/ui/content/classes/ClassForm';

vi.mock('@/lib/hooks/classes', async () => {
    const { useState } = await import('react');

    return {
        useClassForm: (_c: string, _id: string, initial: unknown) => {
            const [data, set] = useState(initial);

            return {
                form: { data, set },
                abilities: { setErrors: () => {}, valid: true, errors: [] },
                actions: { submit: () => {}, cancel: () => {} },
                status: { isSaving: false },
            };
        },
    };
});

vi.mock('@/components/content-import/shared/SourceNotes', () => ({
    SourceNotes: () => null,
}));
vi.mock('@/systems/d20/ui/content/classes/ClassBasicsTab', () => ({
    ClassBasicsTab: () => <div>basics</div>,
}));

const form = () => document.querySelector('form') as HTMLFormElement;

describe('ClassForm layout', () => {
    afterEach(cleanup);

    it('marks the map and table tabs wide and the others not', () => {
        render(<ClassForm campaignId="c" gameClass={makeClass({ id: 'f' })} />);

        expect(form().dataset.wideTab).toBeUndefined();
        expect(screen.getAllByRole('tab')[0]).toHaveTextContent(
            'common.tabs.basic'
        );

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'classes.form.tabs.map' }),
            { button: 0 }
        );
        fireEvent.click(
            screen.getByRole('tab', { name: 'classes.form.tabs.map' })
        );

        expect(form().dataset.wideTab).toBe('true');

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'classes.form.tabs.table' }),
            { button: 0 }
        );
        fireEvent.click(
            screen.getByRole('tab', { name: 'classes.form.tabs.table' })
        );

        expect(form().dataset.wideTab).toBe('true');
    });

    it('renders one submit button outside the form bound by form id', () => {
        render(<ClassForm campaignId="c" gameClass={makeClass({ id: 'f' })} />);

        const save = screen.getByRole('button', { name: 'common.actions.save' });

        expect(save).toHaveAttribute('form', 'class-form');
        expect(form().contains(save)).toBe(false);
    });
});
