// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeT } from '@/lib/i18n/test/mock-t';
import type { RawTree } from '@/lib/utils/skills/progression';
import type { TreeNodes } from '@/lib/utils/skills/progression';
import { EditorTable } from '@/systems/skilltrees/ui/content/skill-tree/editor/EditorTable';

const t = makeT('skillTree');

const branch = (id: string, name: string) => ({
    id,
    name,
    color: '#fff',
    icon: null,
    spellGroupId: null,
});

function setup(
    over: {
        branches?: string[];
        raw?: Partial<RawTree>;
        errorIds?: string[];
        readOnly?: boolean;
    } = {}
) {
    const names = over.branches ?? ['Alpha', 'Beta'];

    const raw: RawTree = {
        mainSkills: [
            {
                id: 'racial',
                name: 'Racial',
                color: '#000',
                levelSkillIds: { basic: 'sk-racial' },
            },
            ...names.map((n) => ({
                id: `b-${n}`,
                name: n,
                color: '#fff',
                levelSkillIds: { basic: `lvl-${n}` },
                levels: { basic: { circle3: [{ id: `slot-${n}` }] } },
            })),
        ],
        ...over.raw,
    };

    const tree = {
        branches: names.map((n) => branch(`b-${n}`, n)),
    } as unknown as TreeNodes;

    const actions = {
        onCell: vi.fn(),
        onMove: vi.fn(),
        onRemove: vi.fn(),
        onAddBranch: vi.fn(),
    };

    const skillsById = new Map([
        ['sk-racial', { name: 'Racial skill', icon: null }],
        ['lvl-Alpha', { name: 'Alpha level', icon: null }],
    ]);

    render(
        <EditorTable
            raw={raw}
            tree={tree}
            skillsById={skillsById}
            errorIds={new Set(over.errorIds ?? [])}
            readOnly={over.readOnly}
            actions={actions}
        />
    );

    return actions;
}

describe('EditorTable', () => {
    afterEach(cleanup);

    it('renders a row per branch plus racial and ultimate rows', () => {
        setup();

        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
        expect(screen.getByText(/skillTree\.editor\.racial\b/)).toBeInTheDocument();
        expect(screen.getByText(/skillTree\.editor\.ultimate\b/)).toBeInTheDocument();
    });

    it('shows known skills in cells and falls back to the raw id for unknown ones', () => {
        setup();

        const racial = screen.getByRole('button', {
            name: t('cells.racial', { tier: t('tiers.basic') }),
        });

        expect(racial.textContent).toContain('Racial skill');

        const unknown = screen.getByRole('button', {
            name: t('cells.level', { branch: 'Beta', tier: t('tiers.basic') }),
        });

        expect(unknown.textContent).toContain('lvl-Beta');
    });

    it('clicking a cell calls onCell with its ref and label', () => {
        const actions = setup();

        const label = t('cells.level', {
            branch: 'Alpha',
            tier: t('tiers.basic'),
        });

        fireEvent.click(screen.getByRole('button', { name: label }));

        expect(actions.onCell).toHaveBeenCalledWith(
            { kind: 'level', branchId: 'b-Alpha', level: 'basic' },
            label
        );
    });

    it('branch actions call onMove / onRemove, and the add button calls onAddBranch', () => {
        const actions = setup();

        fireEvent.click(
            screen.getByRole('button', {
                name: t('editor.moveDown', { name: 'Alpha' }),
            })
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: t('editor.moveUp', { name: 'Beta' }),
            })
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: t('editor.removeBranch', { name: 'Beta' }),
            })
        );
        fireEvent.click(
            screen.getByRole('button', { name: t('editor.addBranch') })
        );

        expect(actions.onMove).toHaveBeenNthCalledWith(1, 'b-Alpha', 1);
        expect(actions.onMove).toHaveBeenNthCalledWith(2, 'b-Beta', -1);
        expect(actions.onRemove).toHaveBeenCalledWith('b-Beta', 'Beta');
        expect(actions.onAddBranch).toHaveBeenCalledTimes(1);
    });

    it('disables move up on the first and move down on the last branch', () => {
        setup();

        expect(
            screen.getByRole('button', {
                name: t('editor.moveUp', { name: 'Alpha' }),
            })
        ).toBeDisabled();
        expect(
            screen.getByRole('button', {
                name: t('editor.moveDown', { name: 'Beta' }),
            })
        ).toBeDisabled();
    });

    it('readOnly hides branch controls and the add button and ignores cell clicks', () => {
        const actions = setup({ readOnly: true });

        expect(
            screen.queryByRole('button', { name: t('editor.addBranch') })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', {
                name: t('editor.removeBranch', { name: 'Alpha' }),
            })
        ).not.toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', {
                name: t('cells.racial', { tier: t('tiers.basic') }),
            })
        );

        expect(actions.onCell).not.toHaveBeenCalled();
    });

    it('marks cells whose skill id is in errorIds', () => {
        setup({ errorIds: ['sk-racial'] });

        const racial = screen.getByRole('button', {
            name: t('cells.racial', { tier: t('tiers.basic') }),
        });

        const other = screen.getByRole('button', {
            name: t('cells.level', { branch: 'Alpha', tier: t('tiers.basic') }),
        });

        expect(racial.className).not.toBe(other.className);
    });

    it('renders with no branches', () => {
        setup({ branches: [] });

        expect(
            screen.getByRole('button', { name: t('editor.addBranch') })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /editor\.moveUp/ })
        ).not.toBeInTheDocument();
    });
});
