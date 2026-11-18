// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NewSkillPicker } from '../NewSkillPicker';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');
vi.mock('@/components/ui/select-field', async () => ({
    SelectField: (await import('@/components/ui/__tests__/select-field-mock'))
        .SelectField,
}));

const pickSkill = (value: string) =>
    fireEvent.change(screen.getByRole('combobox', { name: 'Нова навичка' }), {
        target: { value },
    });

const buyButton = () =>
    screen
        .getAllByRole('button')
        .find((b) => /Купити/.test(b.textContent ?? ''))!;

describe('NewSkillPicker', () => {
    afterEach(cleanup);

    const props = { available: 50, pending: false, onBuy: vi.fn() };

    it('is disabled until a skill is chosen', () => {
        render(<NewSkillPicker {...props} cost={() => 20} />);
        expect(buyButton()).toBeDisabled();
        expect(buyButton()).toHaveTextContent('Купити');
    });

    it('buys a no-spec skill with its price and resets the selection', () => {
        const onBuy = vi.fn();

        const cost = vi.fn(() => 20);

        render(<NewSkillPicker {...props} onBuy={onBuy} cost={cost} />);
        pickSkill('heal');
        expect(cost).toHaveBeenCalledWith('heal');
        expect(buyButton()).toHaveTextContent('Купити · 20');
        fireEvent.click(buyButton());
        expect(onBuy).toHaveBeenCalledWith('heal');
        expect(buyButton()).toBeDisabled();
    });

    it('is disabled when the price exceeds the balance, pending, or unavailable', () => {
        const { rerender } = render(
            <NewSkillPicker {...props} available={10} cost={() => 20} />
        );

        pickSkill('heal');
        expect(buyButton()).toBeDisabled();

        rerender(<NewSkillPicker {...props} pending cost={() => 20} />);
        expect(buyButton()).toBeDisabled();

        rerender(<NewSkillPicker {...props} cost={() => null} />);
        expect(buyButton()).toBeDisabled();
    });

    it('requires a valid free-text specialisation for open skills and normalises it', () => {
        const onBuy = vi.fn();

        render(<NewSkillPicker {...props} onBuy={onBuy} cost={() => 20} />);
        pickSkill('trade');

        const spec = screen.getByRole('textbox', { name: 'Спеціалізація' });

        expect(buyButton()).toBeDisabled();

        fireEvent.change(spec, { target: { value: 'Bad Name!' } });
        expect(buyButton()).toBeDisabled();

        fireEvent.change(spec, { target: { value: ' Baker ' } });
        expect(buyButton()).toBeEnabled();
        fireEvent.click(buyButton());
        expect(onBuy).toHaveBeenCalledTimes(1);
        expect(onBuy.mock.calls[0][0]).toContain('baker');
    });

    it('offers a fixed specialisation list and clears it when the skill changes', () => {
        const onBuy = vi.fn();

        render(<NewSkillPicker {...props} onBuy={onBuy} cost={() => 20} />);
        pickSkill('ranged');

        const spec = screen.getByRole('combobox', { name: 'Спеціалізація' });

        expect(buyButton()).toBeDisabled();
        fireEvent.change(spec, { target: { value: 'bow' } });
        expect(buyButton()).toBeEnabled();

        pickSkill('heal');
        expect(
            screen.queryByRole('combobox', { name: 'Спеціалізація' })
        ).toBeNull();
    });
});
