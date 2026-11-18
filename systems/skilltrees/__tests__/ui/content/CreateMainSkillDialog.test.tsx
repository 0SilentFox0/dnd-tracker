// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import { CreateMainSkillDialog } from '@/systems/skilltrees/ui/content/main-skills/CreateMainSkillDialog';

const mocks = vi.hoisted(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    notify: vi.fn(),
    refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('@/lib/hooks/skills', () => ({
    useCreateMainSkill: () => ({
        mutateAsync: mocks.mutateAsync,
        isPending: mocks.isPending,
    }),
}));
vi.mock('@/lib/hooks/spells', () => ({
    useSpellGroups: () => ({ data: [] }),
}));
vi.mock('@/lib/hooks/common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/hooks/common')>()),
    useNotify: () => mocks.notify,
}));

const open = (onOpenChange = vi.fn()) => {
    renderWithConfirm(
        <CreateMainSkillDialog
            open
            onOpenChange={onOpenChange}
            campaignId="c1"
        />
    );

    return onOpenChange;
};

const nameInput = () =>
    screen.getByLabelText(/skills.mainSkills.form.name/) as HTMLInputElement;

const submit = () =>
    fireEvent.click(
        screen.getByRole('button', { name: 'common.actions.create' })
    );

describe('CreateMainSkillDialog', () => {
    beforeEach(() => {
        mocks.isPending = false;
        mocks.mutateAsync.mockResolvedValue({});
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('a blank name is rejected with a notice and nothing is created', async () => {
        const onOpenChange = open();

        fireEvent.change(nameInput(), { target: { value: '   ' } });
        submit();

        await waitFor(() =>
            expect(mocks.notify).toHaveBeenCalledWith(
                'common.form.nameRequired'
            )
        );
        expect(mocks.mutateAsync).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('creates with the trimmed name and no empty icon, then closes and refreshes', async () => {
        const onOpenChange = open();

        fireEvent.change(nameInput(), { target: { value: '  Magic ' } });
        submit();

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
        expect(mocks.mutateAsync).toHaveBeenCalledWith({
            name: 'Magic',
            color: '#000000',
            icon: undefined,
            isEnableInSkillTree: false,
            spellGroupId: null,
        });
        expect(mocks.refresh).toHaveBeenCalledTimes(1);
    });

    it('a failed create keeps the dialog open and shows the error message', async () => {
        mocks.mutateAsync.mockRejectedValue(new Error('Name taken'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const onOpenChange = open();

        fireEvent.change(nameInput(), { target: { value: 'Magic' } });
        submit();

        await waitFor(() =>
            expect(mocks.notify).toHaveBeenCalledWith('Name taken')
        );
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(mocks.refresh).not.toHaveBeenCalled();
    });

    it('cancel closes without creating; the submit button is disabled while pending', () => {
        mocks.isPending = true;

        const onOpenChange = open();

        expect(
            screen.getByRole('button', { name: 'common.actions.creating' })
        ).toBeDisabled();

        fireEvent.click(
            screen.getByRole('button', { name: 'common.actions.cancel' })
        );

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(mocks.mutateAsync).not.toHaveBeenCalled();
    });
});
