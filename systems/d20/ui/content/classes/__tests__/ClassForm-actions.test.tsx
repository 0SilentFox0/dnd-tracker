// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeClass } from '@/lib/utils/characters/classes/__tests__/class-fixtures';
import { ClassForm } from '@/systems/d20/ui/content/classes/ClassForm';

const editor = vi.hoisted(() => ({
    state: { isSaving: false, valid: true },
    submit: vi.fn(),
    cancel: vi.fn(),
    initial: undefined as unknown,
}));

vi.mock('@/lib/hooks/classes', async () => {
    const { useState } = await import('react');

    return {
        useClassForm: (_c: string, id: string, initial: unknown) => {
            const [data, set] = useState(initial);

            editor.initial = { id, initial };

            return {
                form: { data, set },
                abilities: {
                    setErrors: () => {},
                    valid: editor.state.valid,
                    errors: [],
                },
                actions: { submit: editor.submit, cancel: editor.cancel },
                status: { isSaving: editor.state.isSaving },
            };
        },
    };
});

vi.mock('@/systems/d20/ui/content/classes/ClassBasicsTab', () => ({
    ClassBasicsTab: () => <div>basics</div>,
}));

const cls = makeClass({ id: 'fighter', name: 'Fighter' });

describe('ClassForm actions', () => {
    beforeEach(() => {
        editor.state = { isSaving: false, valid: true };
        editor.submit.mockReset();
        editor.cancel.mockReset();
    });

    afterEach(cleanup);

    it('cancel runs the editor cancel action', () => {
        render(<ClassForm campaignId="c" gameClass={cls} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'common.actions.cancel' })
        );

        expect(editor.cancel).toHaveBeenCalledTimes(1);
    });

    it('submitting the form runs the editor submit action', () => {
        render(<ClassForm campaignId="c" gameClass={cls} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'common.actions.save' })
        );

        expect(editor.submit).toHaveBeenCalledTimes(1);
    });

    it('save is disabled and labelled while saving', () => {
        editor.state.isSaving = true;
        render(<ClassForm campaignId="c" gameClass={cls} />);

        expect(
            screen.getByRole('button', { name: 'common.actions.saving' })
        ).toBeDisabled();
    });

    it('save is disabled while ability validation fails', () => {
        editor.state.valid = false;
        render(<ClassForm campaignId="c" gameClass={cls} />);

        expect(
            screen.getByRole('button', { name: 'common.actions.save' })
        ).toBeDisabled();
    });

    it('lists all five tabs and the editor gets the class id without it in the form data', () => {
        render(<ClassForm campaignId="c" gameClass={cls} />);

        for (const key of ['map', 'table', 'features', 'subclasses'])
            expect(
                screen.getByRole('tab', { name: `classes.form.tabs.${key}` })
            ).toBeInTheDocument();

        expect(
            screen.getByRole('tab', { name: 'common.tabs.basic' })
        ).toBeInTheDocument();

        const seen = editor.initial as { id: string; initial: object };

        expect(seen.id).toBe('fighter');
        expect(seen.initial).not.toHaveProperty('id');
    });
});
