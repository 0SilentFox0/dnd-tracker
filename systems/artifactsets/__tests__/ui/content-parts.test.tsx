// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ARTIFACT_SLOT_VALUES } from '@/lib/constants/artifacts';
import type { AbilityFlowSummary } from '@/lib/utils/abilities/segments';
import { ArtifactSetBonusDisplay } from '@/systems/artifactsets/ui/content/ArtifactSetBonusDisplay';
import { ArtifactSetMembersPicker } from '@/systems/artifactsets/ui/content/ArtifactSetMembersPicker';
import {
    ArtifactSetsLink,
    ArtifactSetsPanel,
} from '@/systems/artifactsets/ui/content/ArtifactSetsCatalogParts';
import type { ArtifactListItem } from '@/types/artifacts';

vi.mock('@/systems/artifactsets/ui/content/ArtifactSetCard', () => ({
    ArtifactSetCard: ({ set }: { set: { name: string } }) => (
        <div data-testid="set-card">{set.name}</div>
    ),
}));

const line = (value: string): AbilityFlowSummary => ({
    when: [{ key: 'summary.text', params: { value } }],
    if: [],
    then: [],
    limits: [],
});

describe('ArtifactSetBonusDisplay', () => {
    afterEach(cleanup);

    it.each([
        [null],
        [undefined],
        [{}],
        [{ name: '  ', description: ' ' }],
        ['text'],
    ])(
        'renders nothing for an empty bonus %j without ability lines',
        (setBonus) => {
            const { container } = render(
                <ArtifactSetBonusDisplay setBonus={setBonus} />
            );

            expect(container.textContent).toBe('');
        }
    );

    it('shows the trimmed name and description under the bonus heading', () => {
        render(
            <ArtifactSetBonusDisplay
                setBonus={{ name: ' Dragon blood ', description: ' +1 AC ' }}
            />
        );

        expect(screen.getByText('artifacts.sets.card.bonus')).toBeTruthy();
        expect(screen.getByText('Dragon blood')).toBeTruthy();
        expect(screen.getByText('+1 AC')).toBeTruthy();
    });

    it('ability lines alone are enough to render the block', () => {
        render(
            <ArtifactSetBonusDisplay
                setBonus={null}
                abilitySummary={[line('AC +1')]}
            />
        );

        expect(screen.getByText('artifacts.sets.card.bonus')).toBeTruthy();
    });

    it('ignores non-string name and description', () => {
        const { container } = render(
            <ArtifactSetBonusDisplay setBonus={{ name: 5, description: {} }} />
        );

        expect(container.textContent).toBe('');
    });
});

describe('ArtifactSetMembersPicker', () => {
    afterEach(cleanup);

    const artifacts: ArtifactListItem[] = [
        { id: 'a1', name: 'Helm', slot: ARTIFACT_SLOT_VALUES[0] },
        { id: 'a2', name: 'Odd', slot: 'weird-slot' },
    ];

    it('shows the empty hint when there are no artifacts', () => {
        render(
            <ArtifactSetMembersPicker
                artifacts={[]}
                selectedIds={new Set()}
                onToggle={vi.fn()}
            />
        );

        expect(screen.getByText('artifacts.sets.members.empty')).toBeTruthy();
    });

    it('reflects selection, translates known slots and keeps unknown slots raw', () => {
        render(
            <ArtifactSetMembersPicker
                artifacts={artifacts}
                selectedIds={new Set(['a2'])}
                onToggle={vi.fn()}
            />
        );

        const boxes = screen.getAllByRole('checkbox');

        expect(boxes.map((b) => b.getAttribute('aria-checked'))).toEqual([
            'false',
            'true',
        ]);
        expect(
            screen.getByText(
                new RegExp(`artifacts.slots.${ARTIFACT_SLOT_VALUES[0]}`)
            )
        ).toBeTruthy();
        expect(screen.getByText(/weird-slot/)).toBeTruthy();
    });

    it('toggling a row passes the artifact id', () => {
        const onToggle = vi.fn();

        render(
            <ArtifactSetMembersPicker
                artifacts={artifacts}
                selectedIds={new Set()}
                onToggle={onToggle}
            />
        );

        fireEvent.click(screen.getAllByRole('checkbox')[0]);

        expect(onToggle).toHaveBeenCalledWith('a1');
    });
});

describe('catalog parts', () => {
    afterEach(cleanup);

    it('the link points at the DM artifact-sets page of the campaign', () => {
        render(<ArtifactSetsLink campaignId="c9" />);

        expect(screen.getByRole('link').getAttribute('href')).toBe(
            '/campaigns/c9/dm/system/artifact-sets'
        );
    });

    it('the panel renders nothing without groups and one card per group otherwise', () => {
        const group = (id: string) => ({
            group: {
                id,
                name: `Set ${id}`,
                icon: null,
                description: null,
                setBonus: null,
                abilitySummary: [],
            },
            artifacts: [],
        });

        const empty = render(
            <ArtifactSetsPanel campaignId="c1" canEdit groups={[]} />
        );

        expect(empty.container.textContent).toBe('');
        empty.unmount();

        render(
            <ArtifactSetsPanel
                campaignId="c1"
                canEdit
                groups={[group('1'), group('2')]}
            />
        );

        expect(
            screen.getAllByTestId('set-card').map((n) => n.textContent)
        ).toEqual(['Set 1', 'Set 2']);
    });
});
