// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const requestSpellBook = vi.hoisted(() => vi.fn());

const library = vi.hoisted(() => vi.fn());

vi.mock('@/lib/hooks/battle', () => ({
    useBattleScene: () => ({ intents: { requestSpellBook } }),
    useBattleSpellLibrary: library,
}));

import { RecommendedSpells } from '../RecommendedSpells';

import { render } from '@/lib/i18n/test/render-uk';
import type { BattleParticipant } from '@/types/battle';

vi.unmock('next-intl');

const hero = {} as BattleParticipant;

describe('RecommendedSpells', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('is disabled off-turn and fires the intent on-turn', () => {
        library.mockReturnValue([{ id: 's1', name: 'Shield', level: 1 }]);

        const { rerender } = render(
            <RecommendedSpells hero={hero} level={1} canCast={false} />
        );

        const button = screen.getByRole('button', { name: 'Shield' });

        expect(button.hasAttribute('disabled')).toBe(true);

        rerender(<RecommendedSpells hero={hero} level={1} canCast />);
        fireEvent.click(screen.getByRole('button', { name: 'Shield' }));

        expect(requestSpellBook).toHaveBeenCalledWith(1);
    });

    it('shows at most 3 spells, native and stronger first', () => {
        library.mockReturnValue([
            { id: 'a', name: 'A manual', level: 1, executionMode: 'manual', dice: 9 },
            { id: 'b', name: 'B weak', level: 1, executionMode: 'native', dice: 1 },
            { id: 'c', name: 'C strong', level: 1, executionMode: 'native', dice: 3 },
            { id: 'd', name: 'D mid', level: 1, executionMode: 'native', dice: 2 },
            { id: 'e', name: 'E other level', level: 2, executionMode: 'native', dice: 9 },
        ]);

        render(<RecommendedSpells hero={hero} level={1} canCast />);

        expect(
            screen.getAllByRole('button').map((b) => b.textContent)
        ).toEqual(['C strong', 'D mid', 'B weak']);
    });

    it('keeps the spell query closed until a level is chosen', () => {
        library.mockReturnValue([]);

        render(<RecommendedSpells hero={hero} level={null} canCast />);

        expect(library).toHaveBeenCalledWith(
            hero,
            expect.objectContaining({ isOpen: false })
        );
    });
});
