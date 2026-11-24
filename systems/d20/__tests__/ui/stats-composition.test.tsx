// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpellSlotsPanel } from '@/systems/d20/ui/battle/SpellSlotsPanel';
import { CharacterAbilityScores } from '@/systems/d20/ui/stats/CharacterAbilityScores';
import { StatsFields } from '@/systems/d20/ui/StatsFields';
import { UnitStatsFields } from '@/systems/d20/ui/UnitStatsFields';

const rules = vi.hoisted(() => ({ spells: true }));

vi.mock('@/lib/hooks/battle', () => ({
    useBattleRules: () => rules,
}));
vi.mock('@/systems/d20/ui/battle/SlotGrid', () => ({
    SlotGrid: ({ participant }: { participant: { id: string } }) => (
        <div>slots:{participant.id}</div>
    ),
}));
vi.mock('@/systems/d20/ui/stats/CharacterCombatParams', () => ({
    CharacterCombatParams: ({
        extraFields,
    }: {
        extraFields?: React.ReactNode;
    }) => (
        <div>
            combat
            {extraFields}
        </div>
    ),
}));
vi.mock('@/systems/d20/ui/units/UnitFiveEFields', () => ({
    UnitFiveEFields: () => <div>five-e</div>,
}));

const bindings = (data: Record<string, unknown> = {}, set = vi.fn()) =>
    ({
        abilityScores: { data, set },
        combatStats: {},
    }) as never;

describe('d20 SpellSlotsPanel', () => {
    afterEach(cleanup);

    it('renders the slot grid when the rules have spells', () => {
        rules.spells = true;
        render(<SpellSlotsPanel hero={{ id: 'h' } as never} />);

        expect(screen.getByText('slots:h')).toBeInTheDocument();
    });

    it('renders nothing when the rules have no spells', () => {
        rules.spells = false;

        const { container } = render(
            <SpellSlotsPanel hero={{ id: 'h' } as never} />
        );

        expect(container).toBeEmptyDOMElement();
    });
});

describe('d20 CharacterAbilityScores', () => {
    afterEach(cleanup);

    it('hides the primary picker by default', () => {
        render(
            <CharacterAbilityScores
                abilityScores={{ data: {}, set: vi.fn() } as never}
            />
        );

        expect(document.getElementById('strength')).not.toBeNull();
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('shows the primary picker with withPrimary', () => {
        render(
            <CharacterAbilityScores
                abilityScores={{ data: {}, set: vi.fn() } as never}
                withPrimary
            />
        );

        expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });

    it('writes a changed score through set(key, value)', () => {
        const set = vi.fn();

        render(
            <CharacterAbilityScores
                abilityScores={{ data: { strength: 10 }, set } as never}
            />
        );

        const input = document.getElementById('strength') as HTMLElement;

        fireEvent.change(input, { target: { value: '14' } });
        fireEvent.blur(input);

        expect(set).toHaveBeenCalledWith('strength', 14);
    });
});

describe('d20 StatsFields', () => {
    afterEach(cleanup);

    it('edit mode renders scores and combat in titled panels', () => {
        render(
            <StatsFields
                bindings={bindings()}
                campaignId="c"
                mode="edit"
                extraFields={<i>extra</i>}
            />
        );

        expect(screen.getAllByText(/combat/).length).toBeGreaterThan(0);
        expect(screen.getByText('extra')).toBeInTheDocument();
        expect(
            screen.getByText('characters.form.sections.abilityScores')
        ).toBeInTheDocument();
    });

    it('create mode wraps both blocks in titled sections', () => {
        render(
            <StatsFields bindings={bindings()} campaignId="c" mode="create" />
        );

        expect(
            screen.getByText('characters.form.sections.abilityScores')
        ).toBeInTheDocument();
        expect(
            screen.getByText('characters.form.sections.combatParams')
        ).toBeInTheDocument();
    });
});

describe('d20 UnitStatsFields', () => {
    afterEach(cleanup);

    it('hides the 5e block without monster stats or CR', () => {
        render(<UnitStatsFields formData={{}} onChange={vi.fn()} />);

        expect(screen.queryByText('five-e')).toBeNull();
        expect(
            screen.getByText('units.basic.abilityScores')
        ).toBeInTheDocument();
    });

    it('shows the 5e block for monster stats or a defined CR (including 0)', () => {
        const { unmount } = render(
            <UnitStatsFields formData={{}} onChange={vi.fn()} monsterStats />
        );

        expect(screen.getByText('five-e')).toBeInTheDocument();
        unmount();

        render(<UnitStatsFields formData={{ cr: 0 }} onChange={vi.fn()} />);

        expect(screen.getByText('five-e')).toBeInTheDocument();
    });

    it('wraps a changed ability into a patch object', () => {
        const onChange = vi.fn();

        render(<UnitStatsFields formData={{}} onChange={onChange} />);

        const input = document.getElementById('strength') as HTMLElement;

        fireEvent.change(input, { target: { value: '12' } });
        fireEvent.blur(input);

        expect(onChange).toHaveBeenCalledWith({ strength: 12 });
    });
});
