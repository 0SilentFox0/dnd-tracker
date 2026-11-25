// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const requestSpellBook = vi.hoisted(() => vi.fn());

const turn = vi.hoisted(() => ({ isMyTurn: false }));

vi.mock('@/lib/hooks/battle', () => ({
    useBattleScene: () => ({ intents: { requestSpellBook }, turn }),
}));

import { RecommendedSpells } from '../RecommendedSpells';

import { render } from '@/lib/i18n/test/render-uk';
import type { BookSpell } from '@/types/spells';

vi.unmock('next-intl');

const book = (...s: object[]) => s as unknown as BookSpell[];

describe('RecommendedSpells', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('is disabled off-turn and fires the intent on-turn', () => {
        const spells = book({ id: 's1', name: 'Shield', level: 1 });

        turn.isMyTurn = false;

        const { rerender } = render(
            <RecommendedSpells spells={spells} level={1} />
        );

        expect(
            screen
                .getByRole('button', { name: 'Shield' })
                .hasAttribute('disabled')
        ).toBe(true);

        turn.isMyTurn = true;

        rerender(<RecommendedSpells spells={spells} level={1} />);
        fireEvent.click(screen.getByRole('button', { name: 'Shield' }));

        expect(requestSpellBook).toHaveBeenCalledWith(1);
    });

    it('shows at most 3 spells of the level, native and stronger first', () => {
        turn.isMyTurn = true;

        const spells = book(
            {
                id: 'a',
                name: 'A manual',
                level: 1,
                executionMode: 'manual',
                dice: 9,
            },
            {
                id: 'b',
                name: 'B weak',
                level: 1,
                executionMode: 'native',
                dice: 1,
            },
            {
                id: 'c',
                name: 'C strong',
                level: 1,
                executionMode: 'native',
                dice: 3,
            },
            {
                id: 'd',
                name: 'D mid',
                level: 1,
                executionMode: 'native',
                dice: 2,
            },
            {
                id: 'e',
                name: 'E other level',
                level: 2,
                executionMode: 'native',
                dice: 9,
            }
        );

        render(<RecommendedSpells spells={spells} level={1} />);

        expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(
            ['C strong', 'D mid', 'B weak']
        );
    });

    it('without slots recommends the best spells of any level', () => {
        turn.isMyTurn = true;

        const spells = book(
            {
                id: 'a',
                name: 'Low',
                level: 0,
                executionMode: 'native',
                dice: 1,
            },
            {
                id: 'e',
                name: 'High',
                level: 2,
                executionMode: 'native',
                dice: 9,
            }
        );

        render(<RecommendedSpells spells={spells} level={null} />);

        expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(
            ['High', 'Low']
        );

        fireEvent.click(screen.getByRole('button', { name: 'High' }));

        expect(requestSpellBook).toHaveBeenCalledWith(2);
    });
});
