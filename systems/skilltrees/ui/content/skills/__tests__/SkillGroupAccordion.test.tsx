// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UNGROUPED_KEY } from '@/lib/constants/ungrouped';
import { SkillGroupAccordion } from '@/systems/skilltrees/ui/content/skills/list/SkillGroupAccordion';
import type { SpellGroup } from '@/types/spells';

const hook = vi.hoisted(() => ({
    useSpellGroupActions: vi.fn(),
}));

const item = vi.hoisted(() => ({ props: vi.fn() }));

vi.mock('@/lib/hooks/spells', () => ({
    useSpellGroupActions: hook.useSpellGroupActions,
}));

vi.mock(
    '@/systems/skilltrees/ui/content/skills/list/SkillGroupAccordionItem',
    () => ({
        SkillGroupAccordionItem: (props: Record<string, unknown>) => {
            item.props(props);

            return <div data-testid="item">{String(props.groupName)}</div>;
        },
    })
);

vi.mock('@/components/common/RenameGroupDialog', () => ({
    RenameGroupDialog: (props: {
        groupName: string;
        dialog: { open: boolean };
    }) => (
        <div data-testid="rename" data-open={String(props.dialog.open)}>
            {props.groupName}
        </div>
    ),
}));

const actions = {
    handlers: {
        openRenameDialog: vi.fn(),
        confirmRemoveAll: vi.fn().mockResolvedValue(undefined),
        handleRenameGroup: vi.fn(),
        closeRenameDialog: vi.fn(),
    },
    dialogs: { rename: { open: true, setOpen: vi.fn() } },
    state: { newGroupName: 'x', setNewGroupName: vi.fn() },
    pending: { isRenaming: false },
};

const groups = [{ id: 'g1', name: 'Combat' }] as unknown as SpellGroup[];

const lastProps = () => item.props.mock.calls.at(-1)![0];

describe('SkillGroupAccordion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hook.useSpellGroupActions.mockReturnValue(actions);
    });
    afterEach(cleanup);

    it('resolves the group id and passes it to the actions hook', () => {
        render(
            <SkillGroupAccordion
                groupName="Combat"
                skills={[]}
                campaignId="c1"
                spellGroups={groups}
            />
        );

        expect(hook.useSpellGroupActions).toHaveBeenCalledWith({
            campaignId: 'c1',
            groupName: 'Combat',
            groupId: 'g1',
        });
    });

    it('wires the group menu to the hook handlers for a real group', () => {
        render(
            <SkillGroupAccordion
                groupName="Combat"
                skills={[]}
                campaignId="c1"
                spellGroups={groups}
                mainSkillColor="#abc"
            />
        );

        const props = lastProps();

        expect(props.accent).toBe('#abc');

        props.groupMenu.onRename();
        props.groupMenu.onRemoveAll();

        expect(actions.handlers.openRenameDialog).toHaveBeenCalled();
        expect(actions.handlers.confirmRemoveAll).toHaveBeenCalled();
        expect(screen.getByTestId('rename').dataset.open).toBe('true');
    });

    it('has no menu for the ungrouped bucket or an unknown group', () => {
        const { rerender } = render(
            <SkillGroupAccordion
                groupName={UNGROUPED_KEY}
                skills={[]}
                campaignId="c1"
                spellGroups={groups}
            />
        );

        expect(lastProps().groupMenu).toBeUndefined();

        rerender(
            <SkillGroupAccordion
                groupName="Missing"
                skills={[]}
                campaignId="c1"
                spellGroups={groups}
            />
        );

        expect(lastProps().groupMenu).toBeUndefined();
        expect(lastProps().accent).toBeUndefined();
    });

    it('canEdit=false drops the menu and the rename dialog', () => {
        render(
            <SkillGroupAccordion
                groupName="Combat"
                skills={[]}
                campaignId="c1"
                spellGroups={groups}
                canEdit={false}
            />
        );

        expect(lastProps().groupMenu).toBeUndefined();
        expect(lastProps().canEdit).toBe(false);
        expect(screen.queryByTestId('rename')).not.toBeInTheDocument();
    });
});
