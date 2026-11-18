// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UnitFiveEFields } from '../UnitFiveEFields';

import { ABILITY_KEYS } from '@/lib/constants/abilities';
import {
    proficiencyForChallenge,
    xpForChallenge,
} from '@/lib/constants/challenge';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

describe('UnitFiveEFields', () => {
    afterEach(cleanup);

    it('choosing a CR sets proficiency; clearing it only clears CR', () => {
        const onChange = vi.fn();

        render(<UnitFiveEFields formData={{ cr: null }} onChange={onChange} />);
        fireEvent.change(input('cr'), { target: { value: '5' } });
        expect(onChange).toHaveBeenLastCalledWith({
            cr: 5,
            proficiencyBonus: proficiencyForChallenge(5),
        });
        cleanup();

        render(<UnitFiveEFields formData={{ cr: 5 }} onChange={onChange} />);
        fireEvent.change(input('cr'), { target: { value: '' } });
        expect(onChange).toHaveBeenLastCalledWith({ cr: null });
    });

    it('shows the CR default XP as a placeholder and stores an XP override or null', () => {
        const onChange = vi.fn();

        render(<UnitFiveEFields formData={{ cr: 5 }} onChange={onChange} />);
        expect(input('xp')).toHaveAttribute(
            'placeholder',
            String(xpForChallenge(5))
        );
        fireEvent.change(input('xp'), { target: { value: '1234' } });
        expect(onChange).toHaveBeenLastCalledWith({ xp: 1234 });
        fireEvent.change(input('xp'), { target: { value: '' } });
        expect(onChange).toHaveBeenLastCalledWith({ xp: null });
    });

    it('has no XP placeholder without a CR', () => {
        render(<UnitFiveEFields formData={{}} onChange={vi.fn()} />);
        expect(input('xp')).toHaveAttribute('placeholder', '');
    });

    it('counts default to their minimum and never go below it', () => {
        const onChange = vi.fn();

        render(<UnitFiveEFields formData={{}} onChange={onChange} />);
        expect(input('multiattack')).toHaveValue('1');
        expect(input('legendaryActions')).toHaveValue('0');
        fireEvent.change(input('multiattack'), { target: { value: '0' } });
        expect(onChange).toHaveBeenLastCalledWith({ multiattack: 1 });
        fireEvent.change(input('legendaryActions'), { target: { value: '3' } });
        expect(onChange).toHaveBeenLastCalledWith({ legendaryActions: 3 });
        fireEvent.change(input('legendaryResistances'), {
            target: { value: '-2' },
        });
        expect(onChange).toHaveBeenLastCalledWith({ legendaryResistances: 0 });
    });

    it('toggles save proficiencies keeping ability order', () => {
        const onChange = vi.fn();

        render(
            <UnitFiveEFields
                formData={{ saveProficiencies: ['wisdom'] }}
                onChange={onChange}
            />
        );
        expect(screen.getAllByRole('checkbox')).toHaveLength(
            ABILITY_KEYS.length
        );
        expect(screen.getByRole('checkbox', { checked: true })).toBe(
            document.getElementById('save-wisdom')
        );

        fireEvent.click(document.getElementById('save-strength')!);
        expect(onChange).toHaveBeenLastCalledWith({
            saveProficiencies: ['strength', 'wisdom'],
        });

        fireEvent.click(document.getElementById('save-wisdom')!);
        expect(onChange).toHaveBeenLastCalledWith({ saveProficiencies: [] });
    });
});
