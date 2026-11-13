// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrimaryAbilityPicker } from '@/systems/d20/ui/stats/PrimaryAbilityPicker';

const ARIA = (ability: string) =>
    `characters.stats.primary.aria {"ability":"gameTerms.abilities.${ability}.label"}`;

describe('PrimaryAbilityPicker', () => {
    afterEach(cleanup);

    it('labels come from gameTerms.abilities, aria carries the ability', () => {
        render(<PrimaryAbilityPicker value="strength" onChange={vi.fn()} />);

        expect(
            screen.getByText('characters.stats.primary.legend')
        ).toBeTruthy();
        expect(screen.getByLabelText(ARIA('strength'))).toBeTruthy();
    });

    it('only one primary ability; a second click clears it', () => {
        const onChange = vi.fn();

        const { rerender } = render(
            <PrimaryAbilityPicker value={null} onChange={onChange} />
        );

        fireEvent.click(
            screen.getByRole('checkbox', { name: ARIA('dexterity') })
        );
        expect(onChange).toHaveBeenLastCalledWith('dexterity');
        rerender(
            <PrimaryAbilityPicker value="dexterity" onChange={onChange} />
        );
        fireEvent.click(
            screen.getByRole('checkbox', { name: ARIA('dexterity') })
        );
        expect(onChange).toHaveBeenLastCalledWith(null);
    });
});
