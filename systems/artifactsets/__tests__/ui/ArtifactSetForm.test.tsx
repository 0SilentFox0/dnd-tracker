// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import { ArtifactSetForm } from '@/systems/artifactsets/ui/content/ArtifactSetForm';

const state = vi.hoisted(() => ({
    error: null as string | null,
    submit: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
    remove: vi.fn(),
}));

vi.mock('@/systems/artifactsets/hooks', () => ({
    useArtifactSetForm: () => ({
        form: {
            data: {
                name: '',
                description: '',
                icon: '',
                bonusName: '',
                bonusDescription: '',
                abilities: [],
            },
            set: vi.fn(),
        },
        members: {
            selectable: [],
            selectedIds: new Set<string>(),
            toggle: vi.fn(),
        },
        abilities: { valid: true, errors: 0, onValidityChange: vi.fn() },
        status: { isBusy: false, error: state.error },
        actions: { submit: state.submit, remove: state.remove },
    }),
}));
vi.mock('@/components/abilities', () => ({
    AbilityListEditor: () => <div />,
    withAbilityErrors: (label: string) => label,
}));

const heading = { title: 'T', aside: 'A' };

describe('ArtifactSetForm', () => {
    afterEach(() => {
        cleanup();
        state.error = null;
        state.remove.mockClear();
    });

    it('has one save button outside the form and no delete when creating', () => {
        renderWithConfirm(<ArtifactSetForm campaignId="c" heading={heading} />);

        const save = screen.getAllByRole('button', {
            name: 'artifacts.sets.form.create',
        });

        expect(save).toHaveLength(1);
        expect(save[0].getAttribute('form')).toBe('artifact-set-form');
        expect(save[0].closest('form')).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'common.form.more' })
        ).toBeNull();
    });

    it('keeps delete only in the overflow menu when editing', () => {
        renderWithConfirm(
            <ArtifactSetForm campaignId="c" setId="s" heading={heading} />
        );

        expect(
            screen.queryByRole('button', { name: 'artifacts.sets.form.delete' })
        ).toBeNull();
        expect(
            screen.getByRole('button', { name: 'common.form.more' })
        ).toBeTruthy();
    });

    it('shows the save error as an alert inside the form', () => {
        state.error = 'boom';

        renderWithConfirm(<ArtifactSetForm campaignId="c" heading={heading} />);

        expect(screen.getByRole('alert').closest('form')).not.toBeNull();
    });
});
