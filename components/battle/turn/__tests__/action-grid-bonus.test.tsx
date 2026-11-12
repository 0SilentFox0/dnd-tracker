// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionGrid } from '@/components/battle/turn/ActionGrid';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

const turn = {
    phase: 'acting',
    status: { actionUsed: false, bonusAvailable: true, skipped: false },
    strikeAndReturn: { available: false, run: vi.fn() },
    actions: { endTurn: vi.fn() },
} as never;

const actions = { attack: vi.fn(), magic: vi.fn(), bonus: vi.fn() };

describe('ActionGrid: плитка бонусної дії', () => {
    afterEach(cleanup);

    it.each([
        [true, true],
        [undefined, true],
        [false, false],
    ])('bonusTile=%s -> видима=%s', (bonusTile, shown) => {
        render(
            <ActionGrid
                turn={turn}
                pending={false}
                available={{ magic: true, bonus: true, bonusTile }}
                actions={actions}
            />
        );
        expect(!!screen.queryByRole('button', { name: /Бонус/ })).toBe(shown);
    });

    it.each([
        [true, true],
        [undefined, true],
        [false, false],
    ])('magicTile=%s -> видима=%s', (magicTile, shown) => {
        render(
            <ActionGrid
                turn={turn}
                pending={false}
                available={{ magic: true, magicTile, bonus: true }}
                actions={actions}
            />
        );
        expect(!!screen.queryByRole('button', { name: /Магія/ })).toBe(shown);
    });
});
