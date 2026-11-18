// @vitest-environment happy-dom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '@/components/ui/__tests__/match-media';
import { AddBranchSheet } from '@/systems/skilltrees/ui/content/skill-tree/editor/AddBranchSheet';

const open = (onCreate = vi.fn().mockResolvedValue(true)) => {
    const actions = { onClose: vi.fn(), onAdd: vi.fn(), onCreate };

    render(
        <AddBranchSheet
            open
            branches={[
                { id: 'attack', name: 'Attack', color: '#ff0000' },
                { id: 'defense', name: 'Defense', color: '#0000ff' },
            ]}
            actions={actions}
        />
    );

    return actions;
};

const nameInput = () =>
    screen.getByPlaceholderText(
        'skillTree.addBranch.namePlaceholder'
    ) as HTMLInputElement;

const createButton = () =>
    screen.getByRole('button', { name: 'skillTree.addBranch.create' });

describe('AddBranchSheet', () => {
    afterEach(cleanup);

    it('picking an existing branch adds it by id', () => {
        const { onAdd } = open();

        fireEvent.click(screen.getByRole('button', { name: 'Defense' }));

        expect(onAdd).toHaveBeenCalledWith('defense');
    });

    it('create is disabled for a blank name', () => {
        open();

        expect(createButton()).toBeDisabled();

        fireEvent.change(nameInput(), { target: { value: '   ' } });

        expect(createButton()).toBeDisabled();
    });

    it('creates with the trimmed name and chosen colour, then clears the name on success', async () => {
        const { onCreate } = open();

        fireEvent.change(nameInput(), { target: { value: ' Magic ' } });
        fireEvent.change(screen.getByLabelText('skillTree.addBranch.color'), {
            target: { value: '#00ff00' },
        });
        fireEvent.click(createButton());

        await waitFor(() =>
            expect(onCreate).toHaveBeenCalledWith({
                name: 'Magic',
                color: '#00ff00',
            })
        );
        await waitFor(() => expect(nameInput().value).toBe(''));
    });

    it('keeps the name when the creation is refused', async () => {
        const { onCreate } = open(vi.fn().mockResolvedValue(false));

        fireEvent.change(nameInput(), { target: { value: 'Magic' } });
        fireEvent.click(createButton());

        await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(createButton()).not.toBeDisabled());
        expect(nameInput().value).toBe('Magic');
    });
});
