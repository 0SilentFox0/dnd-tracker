// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SkillCreateForm } from '@/systems/skilltrees/ui/content/skills/form/SkillCreateForm';

const state = vi.hoisted(() => ({
    error: null as string | null,
    isEdit: false,
    submit: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
}));

vi.mock('@/systems/skilltrees/hooks', () => ({
    useSkillForm: () => ({
        form: { data: { abilities: [] }, set: vi.fn() },
        mainSkills: [],
        abilities: {
            valid: true,
            errors: 0,
            issues: [],
            onValidityChange: vi.fn(),
        },
        status: {
            isSaving: false,
            error: state.error,
            isEdit: state.isEdit,
        },
        actions: { submit: state.submit, cancel: vi.fn() },
    }),
}));
vi.mock('@/components/abilities', () => ({
    AbilityListEditor: () => <div />,
    withAbilityErrors: (label: string) => label,
}));
vi.mock('@/systems/skilltrees/ui/content/skills/form/basic', () => ({
    SkillBasicInfo: () => <div>basic</div>,
}));
vi.mock('@/systems/skilltrees/ui/content/skills/form/main-skill', () => ({
    SkillMainSkillSection: () => <div />,
}));
vi.mock('@/systems/skilltrees/ui/content/skills/form/spell', () => ({
    SkillSpellSection: () => <div />,
}));

describe('SkillCreateForm', () => {
    afterEach(() => {
        cleanup();
        state.error = null;
        state.isEdit = false;
        state.submit.mockClear();
    });

    it('has one submit button outside the form that submits it', () => {
        render(<SkillCreateForm campaignId="c" spells={[]} />);

        const save = screen.getAllByRole('button', {
            name: 'skills.form.submitCreate',
        });

        expect(save).toHaveLength(1);
        expect(save[0].getAttribute('form')).toBe('skill-form');
        expect(save[0].closest('form')).toBeNull();
        fireEvent.click(save[0]);
        expect(state.submit).toHaveBeenCalledTimes(1);
    });

    it('shows the save error as an alert above the tabs', () => {
        state.error = 'boom';

        render(<SkillCreateForm campaignId="c" spells={[]} />);

        const alert = screen.getByRole('alert');

        expect(alert.textContent).toContain('boom');
        expect(
            alert.compareDocumentPosition(screen.getByRole('tablist')) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });
});
