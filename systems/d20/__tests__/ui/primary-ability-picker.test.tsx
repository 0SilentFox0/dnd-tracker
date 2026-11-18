// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CORE_ABILITY_SCORES } from '@/lib/constants/abilities';
import { PrimaryAbilityPicker } from '@/systems/d20/ui/stats/PrimaryAbilityPicker';
import type { AbilityKey } from '@/types/characters';

const ARIA = (ability: string) =>
    `characters.stats.primary.aria {"ability":"gameTerms.abilities.${ability}.label"}`;

const box = (ability: string) =>
    screen.getByRole('checkbox', { name: ARIA(ability) });

const checked = () =>
    screen
        .getAllByRole('checkbox')
        .filter((c) => c.getAttribute('aria-checked') === 'true')
        .map((c) => c.getAttribute('aria-label'));

function Harness({ initial }: { initial: AbilityKey | null }) {
    const [value, setValue] = useState(initial);

    return <PrimaryAbilityPicker value={value} onChange={setValue} />;
}

describe('PrimaryAbilityPicker', () => {
    afterEach(cleanup);

    it('shows a legend and one checkbox per core ability with its label', () => {
        render(<Harness initial={null} />);

        expect(
            screen.getByText('characters.stats.primary.legend')
        ).toBeTruthy();
        expect(screen.getAllByRole('checkbox')).toHaveLength(
            CORE_ABILITY_SCORES.length
        );
        expect(
            screen.getByText('gameTerms.abilities.strength.label')
        ).toBeTruthy();
        expect(checked()).toEqual([]);
    });

    it('marks only the current primary ability', () => {
        render(<Harness initial="strength" />);

        expect(checked()).toEqual([ARIA('strength')]);
    });

    it('picking another ability moves the mark instead of adding a second', () => {
        render(<Harness initial="strength" />);

        fireEvent.click(box('dexterity'));

        expect(checked()).toEqual([ARIA('dexterity')]);
    });

    it('clicking the marked ability clears it', () => {
        render(<Harness initial={null} />);

        fireEvent.click(box('dexterity'));
        expect(checked()).toEqual([ARIA('dexterity')]);

        fireEvent.click(box('dexterity'));
        expect(checked()).toEqual([]);
    });
});
