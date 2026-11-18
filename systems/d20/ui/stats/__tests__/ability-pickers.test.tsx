// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AbilityScoresGrid } from '../AbilityScoresGrid';
import { PrimaryAbilityPicker } from '../PrimaryAbilityPicker';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

describe('AbilityScoresGrid', () => {
    afterEach(cleanup);

    it('defaults missing and null scores to 10', () => {
        render(
            <AbilityScoresGrid
                data={{ strength: 16, dexterity: null }}
                set={vi.fn()}
            />
        );
        expect(document.getElementById('strength')).toHaveValue('16');
        expect(document.getElementById('dexterity')).toHaveValue('10');
        expect(document.getElementById('constitution')).toHaveValue('10');
    });

    it('shows modifiers only on request', () => {
        const { rerender } = render(
            <AbilityScoresGrid
                data={{ strength: 16, dexterity: 8 }}
                set={vi.fn()}
            />
        );

        expect(document.body.textContent).not.toMatch(/\(\+3\)/);

        rerender(
            <AbilityScoresGrid
                data={{ strength: 16, dexterity: 8 }}
                set={vi.fn()}
                showModifier
            />
        );
        expect(document.body.textContent).toMatch(/\(\+3\)/);
        expect(document.body.textContent).toMatch(/\(-1\)/);
        expect(document.body.textContent).toMatch(/\(\+0\)/);
    });

    it('commits a changed score with its key', () => {
        const set = vi.fn();

        render(<AbilityScoresGrid data={{}} set={set} />);

        const input = document.getElementById('wisdom') as HTMLInputElement;

        fireEvent.change(input, { target: { value: '14' } });
        fireEvent.blur(input);
        expect(set).toHaveBeenCalledWith('wisdom', 14);
    });
});

describe('PrimaryAbilityPicker', () => {
    afterEach(cleanup);

    it('checks only the selected ability', () => {
        render(<PrimaryAbilityPicker value="strength" onChange={vi.fn()} />);

        const boxes = screen.getAllByRole('checkbox');

        expect(
            boxes.filter((b) => b.getAttribute('aria-checked') === 'true')
        ).toHaveLength(1);
    });

    it('selects an ability and toggles the selected one off', () => {
        const onChange = vi.fn();

        const { rerender } = render(
            <PrimaryAbilityPicker value={null} onChange={onChange} />
        );

        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        expect(onChange).toHaveBeenLastCalledWith('strength');

        rerender(<PrimaryAbilityPicker value="strength" onChange={onChange} />);
        fireEvent.click(screen.getAllByRole('checkbox')[0]);
        expect(onChange).toHaveBeenLastCalledWith(null);

        fireEvent.click(screen.getAllByRole('checkbox')[1]);
        expect(onChange).toHaveBeenLastCalledWith('dexterity');
    });
});
