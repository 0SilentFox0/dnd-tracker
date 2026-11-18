// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderSkillTree } from './render-intl';

import '@/components/ui/__tests__/match-media';
import type { ProgressionNode } from '@/lib/utils/skills/progression';
import {
    NodeSheet,
    type SheetTarget,
} from '@/systems/skilltrees/ui/progression/NodeSheet';
import type { CharacterProgressionDto } from '@/types/progression';

vi.unmock('next-intl');

const dto: CharacterProgressionDto = {
    treeId: 't',
    tree: null,
    race: 'Elf',
    raceIcon: null,
    level: 4,
    seenLevel: 4,
    isOwner: true,
    isDM: false,
    unlocked: [],
    branches: {
        attack: {
            name: 'Attack',
            color: 'red',
            icon: null,
            spellGroupId: null,
        },
    },
    skills: {
        s1: {
            name: 'Slash',
            icon: null,
            summary: [],
            description: 'Cuts deep.',
            spellGroupId: null,
            grantedSpellId: null,
            damageAffinity: { affectsDamage: false, damageType: null },
        },
    },
};

const slot: ProgressionNode = {
    kind: 'slot',
    nodeId: 's1',
    branchId: 'attack',
    circle: 'outer',
    index: 0,
    skillId: 's1',
};

const emptyTier: ProgressionNode = {
    kind: 'branchLevel',
    nodeId: 'attack_basic_level',
    branchId: 'attack',
    level: 'basic',
    skillId: null,
};

const show = (
    target: SheetTarget | null,
    actions: Partial<Parameters<typeof NodeSheet>[0]['actions']> = {}
) => {
    const merged = {
        onClose: vi.fn(),
        onLearn: vi.fn(),
        onUnlearn: vi.fn(),
        pending: false,
        ...actions,
    };

    return {
        actions: merged,
        ready: renderSkillTree(
            <NodeSheet target={target} dto={dto} actions={merged} />,
            'en'
        ),
    };
};

describe('NodeSheet', () => {
    afterEach(cleanup);

    it('renders nothing without a target', async () => {
        const { ready } = show(null);

        const { container } = await ready;

        expect(container.textContent).toBe('');
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('an available skill shows its description and a Learn button that learns the node', async () => {
        const { ready, actions } = show({ node: slot, state: 'available' });

        await ready;

        expect(screen.getByText('Cuts deep.')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Learn' }));

        expect(actions.onLearn).toHaveBeenCalledWith('s1');
        expect(screen.queryByRole('button', { name: 'Unlearn' })).toBeNull();
    });

    it('Learn is disabled while a mutation is pending', async () => {
        const { ready } = show(
            { node: slot, state: 'available' },
            { pending: true }
        );

        await ready;

        expect(screen.getByRole('button', { name: 'Learn' })).toBeDisabled();
    });

    it('a learned skill offers Unlearn', async () => {
        const { ready, actions } = show({ node: slot, state: 'learned' });

        await ready;

        fireEvent.click(screen.getByRole('button', { name: 'Unlearn' }));

        expect(actions.onUnlearn).toHaveBeenCalledWith('s1');
    });

    it('a locked node has no action button and explains the reason', async () => {
        const { ready } = show({
            node: slot,
            state: 'locked',
            reason: 'noPoints',
        });

        await ready;

        expect(screen.getByText('No free points — level up')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Learn' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Unlearn' })).toBeNull();
    });

    it('an available node without an onLearn handler has no Learn button', async () => {
        const { ready } = show(
            { node: slot, state: 'available' },
            { onLearn: undefined }
        );

        await ready;

        expect(screen.queryByRole('button', { name: 'Learn' })).toBeNull();
    });

    it('an unassigned branch tier says the DM has not assigned a skill', async () => {
        const { ready } = show({ node: emptyTier, state: 'locked' });

        await ready;

        expect(
            screen.getByText('The DM has not assigned a skill to this tier yet')
        ).toBeTruthy();
    });
});
