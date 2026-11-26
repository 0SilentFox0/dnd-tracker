// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceEditForm } from '@/components/races/RaceEditForm';
import type { Race } from '@/types/races';

const state = vi.hoisted(() => ({ error: null as unknown }));

const submit = vi.hoisted(() =>
    vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
);

vi.mock('@/lib/hooks/races', () => ({
    useRaceForm: () => ({
        form: { data: {}, set: vi.fn() },
        abilities: { valid: true, errors: 0, onValidityChange: vi.fn() },
        status: { isSaving: false, error: state.error },
        actions: { submit, cancel: vi.fn() },
    }),
}));
vi.mock('@/lib/hooks/systems', () => ({
    useRuleSystem: () => ({ key: null }),
}));
vi.mock('@/components/races/RaceFormFields', () => ({
    RaceFormFields: () => <div data-testid="fields" />,
}));
vi.mock('@/components/abilities', () => ({
    withAbilityErrors: (label: string) => label,
}));

const race = { id: 'r1', abilityIssues: [] } as unknown as Race;

describe('RaceEditForm', () => {
    afterEach(() => {
        cleanup();
        state.error = null;
    });

    it('has one save button outside the form that submits it', () => {
        render(<RaceEditForm campaignId="c" race={race} />);

        const save = screen.getAllByRole('button', {
            name: 'common.actions.save',
        });

        expect(save).toHaveLength(1);
        expect(save[0].closest('form')).toBeNull();
        fireEvent.click(save[0]);
        expect(submit).toHaveBeenCalledTimes(1);
    });

    it('shows a save error as an alert inside the form', () => {
        state.error = new Error('boom');

        render(<RaceEditForm campaignId="c" race={race} />);

        const alert = screen.getByRole('alert');

        expect(alert.closest('form')).not.toBeNull();
        expect(alert.textContent).toContain('boom');
    });
});
