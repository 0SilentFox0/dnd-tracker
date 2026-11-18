// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AttackType } from '@/lib/constants/battle';
import { getHeroDamageDiceForLevel } from '@/lib/constants/hero-scaling';
import { DiceTableEditor } from '@/systems/heroscaling/ui/DiceTableEditor';

const levelInput = (level: number) =>
    screen.getByLabelText(
        `rules.diceTable.levelLabel ${JSON.stringify({ title: 'Melee', level })}`
    ) as HTMLInputElement;

const renderEditor = (
    table: Record<string, string> | null,
    onChange = vi.fn()
) => {
    render(
        <DiceTableEditor
            title="Melee"
            type={AttackType.MELEE}
            table={table}
            onChange={onChange}
        />
    );

    return onChange;
};

describe('DiceTableEditor', () => {
    afterEach(cleanup);

    it('with no table shows empty inputs with default dice as placeholders and disables reset', () => {
        renderEditor(null);

        expect(levelInput(1).value).toBe('');
        expect(levelInput(1).placeholder).toBe(
            getHeroDamageDiceForLevel(1, AttackType.MELEE)
        );
        expect(
            screen.getByRole('button', { name: 'rules.diceTable.reset' })
        ).toBeDisabled();
    });

    it('typing a value emits the table merged with the existing entries', () => {
        const onChange = renderEditor({ '1': '1d6' });

        fireEvent.change(levelInput(2), { target: { value: '2d8' } });

        expect(onChange).toHaveBeenCalledWith({ '1': '1d6', '2': '2d8' });
    });

    it('typing into an empty table starts a new one', () => {
        const onChange = renderEditor(null);

        fireEvent.change(levelInput(3), { target: { value: '1d10' } });

        expect(onChange).toHaveBeenCalledWith({ '3': '1d10' });
    });

    it('reset emits null when a table is set', () => {
        const onChange = renderEditor({ '1': '1d6' });

        const reset = screen.getByRole('button', {
            name: 'rules.diceTable.reset',
        });

        expect(levelInput(1).value).toBe('1d6');

        fireEvent.click(reset);

        expect(onChange).toHaveBeenCalledWith(null);
    });
});
