// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SlotGrid } from '../SlotGrid';

import { render } from '@/lib/i18n/test/render-uk';
import type { BattleParticipant } from '@/types/battle';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

type Slots = Record<string, { max: number; current: number; level?: number }>;

const caster = (spellSlots: Slots) =>
    ({ spellcasting: { spellSlots } }) as unknown as BattleParticipant;

describe('SlotGrid', () => {
    afterEach(cleanup);

    it('shows current/max for levels 1-5 even when the caster has none', () => {
        render(
            <SlotGrid participant={caster({ '1': { max: 4, current: 3 } })} />
        );
        expect(screen.getByLabelText('I коло: 3 з 4')).toBeInTheDocument();
        expect(screen.getByLabelText('II коло: 0 з 0')).toBeInTheDocument();
        expect(screen.getByLabelText('V коло: 0 з 0')).toBeInTheDocument();
        expect(screen.queryByLabelText(/^VI коло/)).toBeNull();
    });

    it('adds levels above 5 only when the caster has slots there', () => {
        render(
            <SlotGrid
                participant={caster({
                    '1': { max: 2, current: 2 },
                    '6': { max: 1, current: 0 },
                })}
            />
        );
        expect(screen.getByLabelText('VI коло: 0 з 1')).toBeInTheDocument();
        expect(screen.queryByLabelText(/^VII коло/)).toBeNull();
    });

    it('draws a pip per max slot, filled up to current', () => {
        render(
            <SlotGrid participant={caster({ '1': { max: 3, current: 1 } })} />
        );

        const cell = screen.getByLabelText('I коло: 1 з 3');

        expect(cell.querySelectorAll('i')).toHaveLength(3);
        expect(cell.querySelectorAll('i.metal-fill')).toHaveLength(1);
    });

    it('renders the pact slot row only for warlock-style casters', () => {
        const { rerender } = render(
            <SlotGrid participant={caster({ '1': { max: 2, current: 2 } })} />
        );

        expect(screen.queryByLabelText(/Пакт/)).toBeNull();

        rerender(
            <SlotGrid
                participant={caster({
                    '1': { max: 2, current: 2 },
                    pact: { max: 2, current: 1, level: 3 },
                })}
            />
        );
        expect(
            screen.getByLabelText('Пакт, III коло: 1 з 2')
        ).toBeInTheDocument();
        expect(screen.getByText('Пакт · коло 3')).toBeInTheDocument();
    });
});
