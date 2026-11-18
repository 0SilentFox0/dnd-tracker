// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '@/components/ui/__tests__/match-media';
import type { CellRef } from '@/systems/skilltrees/rules/progression';
import { SlotPicker } from '@/systems/skilltrees/ui/content/skill-tree/editor/SlotPicker';

const skills = [
    { id: 'a', name: 'Slash', icon: null, mainSkillId: 'attack', summary: [] },
    { id: 'b', name: 'Parry', icon: null, mainSkillId: 'defense', summary: [] },
    {
        id: 'c',
        name: 'Racial trait',
        icon: null,
        mainSkillId: null,
        summary: [],
    },
];

const slotRef: CellRef = {
    kind: 'slot',
    branchId: 'attack',
    circle: 'outer',
    index: 0,
};

const open = (props: Partial<Parameters<typeof SlotPicker>[0]> = {}) => {
    const onPick = vi.fn();

    const onClose = vi.fn();

    render(
        <SlotPicker
            target={{ ref: slotRef, label: 'Outer 1' }}
            current={null}
            skills={skills}
            usedAt={() => null}
            onPick={onPick}
            onClose={onClose}
            {...props}
        />
    );

    return { onPick, onClose };
};

const options = () => screen.getAllByRole('option').map((o) => o.textContent);

describe('SlotPicker', () => {
    afterEach(cleanup);

    it('renders nothing without a target', () => {
        open({ target: null });

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('a branch slot lists only that branch skills until "all" is ticked', () => {
        open();

        expect(options()).toEqual(['Slash']);

        fireEvent.click(screen.getByRole('checkbox'));

        expect(options()).toEqual(['Slash', 'Parry', 'Racial trait']);
    });

    it('a racial slot lists skills without a branch', () => {
        open({
            target: {
                ref: { kind: 'racial', level: 'basic' },
                label: 'R',
            },
        });

        expect(options()).toEqual(['Racial trait']);
    });

    it('an ultimate slot lists everything', () => {
        open({
            target: {
                ref: { kind: 'ultimate' },
                label: 'U',
            },
        });

        expect(options()).toHaveLength(3);
    });

    it('the search filters by name', () => {
        open();

        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.change(
            screen.getByPlaceholderText('skillTree.picker.search'),
            {
                target: { value: 'par' },
            }
        );

        expect(options()).toEqual(['Parry']);
    });

    it('place stays disabled until a different skill is selected, then picks it', () => {
        const { onPick } = open();

        const place = screen.getByRole('button', {
            name: 'skillTree.picker.place',
        });

        expect(place).toBeDisabled();

        fireEvent.click(screen.getByRole('option', { name: /Slash/ }));

        expect(place).not.toBeDisabled();

        fireEvent.click(place);

        expect(onPick).toHaveBeenCalledWith('a');
    });

    it('with a current skill: remove is enabled and clears the slot; re-selecting the current skill keeps place disabled', () => {
        const { onPick } = open({ current: 'a' });

        expect(
            screen.getByRole('button', { name: 'skillTree.picker.place' })
        ).toBeDisabled();

        fireEvent.click(
            screen.getByRole('button', { name: 'common.actions.remove' })
        );

        expect(onPick).toHaveBeenCalledWith(null);
    });

    it('remove is disabled for an empty slot', () => {
        open();

        expect(
            screen.getByRole('button', { name: 'common.actions.remove' })
        ).toBeDisabled();
    });

    it('a skill used elsewhere is marked and cannot be selected', () => {
        open({ usedAt: (id) => (id === 'a' ? 'Defense · outer 2' : null) });

        const option = screen.getByRole('option', { name: /Slash/ });

        expect(option.getAttribute('aria-disabled')).toBe('true');
        expect(option.textContent).toContain('skillTree.picker.usedAt');

        fireEvent.click(option);

        expect(option.getAttribute('aria-selected')).toBe('false');
        expect(
            screen.getByRole('button', { name: 'skillTree.picker.place' })
        ).toBeDisabled();
    });

    it('Enter selects an option from the keyboard', () => {
        open();

        const option = screen.getByRole('option', { name: /Slash/ });

        fireEvent.keyDown(option, { key: 'Enter' });

        expect(option.getAttribute('aria-selected')).toBe('true');
    });
});
