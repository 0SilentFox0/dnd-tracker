// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderSkillTree } from './render-intl';

import type { ProgressionNode } from '@/lib/utils/skills/progression';
import type {
    BranchRow as Row,
    NodeState,
} from '@/systems/skilltrees/rules/progression';
import { BranchRow } from '@/systems/skilltrees/ui/progression/BranchRow';
import { NewBranchRow } from '@/systems/skilltrees/ui/progression/NewBranchRow';
import { OfferList } from '@/systems/skilltrees/ui/progression/OfferList';
import { PointsHeader } from '@/systems/skilltrees/ui/progression/PointsHeader';
import { UltimateRow } from '@/systems/skilltrees/ui/progression/UltimateRow';
import type { CharacterProgressionDto } from '@/types/progression';

vi.unmock('next-intl');

const dto = (): CharacterProgressionDto => ({
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
        s1: skill('Slash'),
        s2: skill('Parry'),
        s3: skill('Riposte'),
        s4: skill('Feint'),
        ult: skill('Whirlwind'),
    },
});

const skill = (name: string) => ({
    name,
    icon: null,
    summary: [],
    description: '',
    spellGroupId: null,
    grantedSpellId: null,
    damageAffinity: { affectsDamage: false, damageType: null },
});

describe('PointsHeader', () => {
    afterEach(cleanup);

    it('shows the spent/level counter and the free-points badge only when there are free points', async () => {
        const first = await renderSkillTree(
            <PointsHeader level={4} spent={3} free={1} />,
            'en'
        );

        expect(screen.getByText('Progression · level 4')).toBeTruthy();
        expect(screen.getByText('3 / 4')).toBeTruthy();
        expect(screen.getByText('1 free point')).toBeTruthy();
        first.unmount();

        await renderSkillTree(
            <PointsHeader level={4} spent={4} free={0} />,
            'en'
        );

        expect(screen.queryByText(/free point/)).toBeNull();
    });
});

describe('NewBranchRow', () => {
    afterEach(cleanup);

    it('announces how many branches are available and fires onSelect', async () => {
        const onSelect = vi.fn();

        await renderSkillTree(
            <NewBranchRow count={3} onSelect={onSelect} />,
            'en'
        );

        fireEvent.click(
            screen.getByRole('button', { name: /one of 3 available/ })
        );

        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});

describe('UltimateRow', () => {
    afterEach(cleanup);

    it('labels the slot with the ultimate skill name when one is assigned and selects its state', async () => {
        const onSelect = vi.fn();

        const state: NodeState = { nodeId: 'ult', state: 'learned' };

        await renderSkillTree(
            <UltimateRow state={state} dto={dto()} onSelect={onSelect} />,
            'en'
        );

        fireEvent.click(screen.getByRole('button', { name: 'Whirlwind' }));

        expect(onSelect).toHaveBeenCalledWith(state);
    });

    it('falls back to the generic label and disables an unassigned slot', async () => {
        await renderSkillTree(
            <UltimateRow
                state={{ nodeId: null, state: 'locked' }}
                dto={dto()}
                onSelect={vi.fn()}
            />,
            'en'
        );

        expect(
            screen.getByRole('button', { name: 'Locked: Ultimate' })
        ).toBeDisabled();
    });
});

describe('BranchRow', () => {
    afterEach(cleanup);

    const row = (level: Row['level']): Row => ({
        branchId: 'attack',
        level,
        outer: [
            { nodeId: 's1', state: 'learned' },
            { nodeId: 's2', state: 'available' },
        ],
        middle: [{ nodeId: 's3', state: 'locked' }],
        inner: [{ nodeId: null, state: 'locked' }],
    });

    it('groups slots under the branch and tier, naming learned, available, locked and empty slots', async () => {
        await renderSkillTree(
            <BranchRow row={row('basic')} dto={dto()} onSelect={vi.fn()} />,
            'en'
        );

        expect(
            screen.getByRole('group', { name: 'Attack · Basics' })
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Slash' })).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Learn: Parry' })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Locked: Riposte' })
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Locked: Empty slot' })
        ).toBeDisabled();
    });

    it('clicking the tier button selects the branch-level node as learned', async () => {
        const onSelect = vi.fn();

        await renderSkillTree(
            <BranchRow row={row('advanced')} dto={dto()} onSelect={onSelect} />,
            'en'
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Branch tier: Attack · Advanced',
            })
        );

        expect(onSelect).toHaveBeenCalledWith({
            nodeId: 'attack_advanced_level',
            state: 'learned',
        });
    });

    it('a branch without a tier shows a dash and a disabled tier button', async () => {
        const onSelect = vi.fn();

        await renderSkillTree(
            <BranchRow row={row(null)} dto={dto()} onSelect={onSelect} />,
            'en'
        );

        const tier = screen.getByRole('button', {
            name: 'Branch tier: Attack · —',
        });

        expect(tier).toBeDisabled();
        fireEvent.click(tier);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('slot selection passes the slot state', async () => {
        const onSelect = vi.fn();

        await renderSkillTree(
            <BranchRow row={row('basic')} dto={dto()} onSelect={onSelect} />,
            'en'
        );

        fireEvent.click(screen.getByRole('button', { name: 'Learn: Parry' }));

        expect(onSelect).toHaveBeenCalledWith({
            nodeId: 's2',
            state: 'available',
        });
    });
});

describe('OfferList', () => {
    afterEach(cleanup);

    const nodes: ProgressionNode[] = ['s1', 's2', 's3', 's4'].map(
        (id, index) => ({
            kind: 'slot',
            nodeId: id,
            branchId: 'attack',
            circle: 'outer',
            index,
            skillId: id,
        })
    );

    const renderList = (
        extra: Partial<Parameters<typeof OfferList>[0]> = {}
    ) => {
        const onSelect = vi.fn();

        const onClearFilter = vi.fn();

        return {
            onSelect,
            onClearFilter,
            ready: renderSkillTree(
                <OfferList
                    offers={nodes}
                    dto={dto()}
                    filter={null}
                    onClearFilter={onClearFilter}
                    onSelect={onSelect}
                    {...extra}
                />,
                'en'
            ),
        };
    };

    it('shows the top three offers and expands the rest on demand', async () => {
        const { ready } = renderList();

        await ready;

        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        expect(screen.queryByText('Feint')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /1 more option/ }));

        expect(screen.getAllByRole('listitem')).toHaveLength(4);
        expect(
            screen.queryByRole('button', { name: /more option/ })
        ).toBeNull();
    });

    it('picking an offer passes its node', async () => {
        const { ready, onSelect } = renderList();

        await ready;

        fireEvent.click(screen.getByRole('button', { name: /Parry/ }));

        expect(onSelect).toHaveBeenCalledWith(nodes[1]);
    });

    it('an active filter narrows the list, ignores the 3-item cap and can be cleared', async () => {
        const { ready, onClearFilter } = renderList({
            filter: {
                label: 'Only odd',
                match: (n) => n.nodeId === 's1' || n.nodeId === 's4',
            },
        });

        await ready;

        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(
            screen.queryByRole('button', { name: /more option/ })
        ).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Only odd/ }));

        expect(onClearFilter).toHaveBeenCalledTimes(1);
    });
});
