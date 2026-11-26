// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MainSkillEditForm } from '@/systems/skilltrees/ui/content/main-skills/MainSkillEditForm';
import type { MainSkill } from '@/types/main-skills';

const submit = vi.hoisted(() =>
    vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
);

vi.mock('@/systems/skilltrees/hooks', () => ({
    useMainSkillForm: () => ({
        form: { data: {}, set: vi.fn() },
        spellGroups: [],
        status: { isSaving: false, error: 'boom' },
        actions: { submit, cancel: vi.fn() },
    }),
}));
vi.mock('@/systems/skilltrees/ui/content/main-skills/MainSkillFormFields', () => ({
    MainSkillFormFields: () => <div />,
}));

afterEach(cleanup);

describe('MainSkillEditForm', () => {
    it('submits through the single save button and shows the error in the form', () => {
        render(
            <MainSkillEditForm
                campaignId="c"
                mainSkill={{ id: 'm' } as MainSkill}
            />
        );

        const save = screen.getAllByRole('button', {
            name: 'skills.mainSkills.edit.submit',
        });

        expect(save).toHaveLength(1);
        expect(save[0].closest('form')).toBeNull();
        fireEvent.click(save[0]);
        expect(submit).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('alert').closest('form')).not.toBeNull();
    });
});
