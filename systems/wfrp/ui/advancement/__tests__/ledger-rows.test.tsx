// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdvanceLedger } from '../AdvanceLedger';
import { AdvanceRow } from '../AdvanceRow';
import { TalentRows } from '../TalentRows';

import { render } from '@/lib/i18n/test/render-uk';
import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement';
import type { LedgerEntry } from '@/systems/wfrp/rules/characteristics/keys';
import type { FeatData } from '@/types/choices';

vi.unmock('next-intl');

const entry = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
    id: 'e1',
    at: '2026-05-01T10:00:00.000Z',
    kind: 'characteristic',
    key: 'ws',
    from: 30,
    to: 31,
    cost: 25,
    ...over,
});

const feat = (over: Partial<FeatData> = {}): FeatData => ({
    id: 'f1',
    name: 'Hardy',
    icon: null,
    type: 'general',
    prerequisite: {},
    repeatable: false,
    xpCost: 100,
    maxRank: 3,
    description: null,
    abilities: [],
    choices: [],
    ...over,
});

describe('AdvanceRow', () => {
    afterEach(cleanup);

    const base = {
        label: 'WS',
        value: 31,
        price: { cost: 25 },
        available: 100,
        pending: false,
        onBuy: vi.fn(),
    };

    it('buys when affordable', () => {
        const onBuy = vi.fn();

        render(<AdvanceRow {...base} onBuy={onBuy} />);
        fireEvent.click(screen.getByRole('button', { name: 'Купити · 25' }));
        expect(onBuy).toHaveBeenCalledTimes(1);
    });

    it('disables with a hint when the cost exceeds the balance', () => {
        render(<AdvanceRow {...base} available={10} />);

        const btn = screen.getByRole('button', { name: 'Купити · 25' });

        expect(btn).toBeDisabled();
        expect(btn).toHaveAttribute('title', 'Недостатньо досвіду');
    });

    it('disables while pending', () => {
        render(<AdvanceRow {...base} pending />);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows the limit label when there is no price', () => {
        render(<AdvanceRow {...base} price={{ cost: null }} />);
        expect(screen.getByRole('button', { name: 'Ліміт' })).toBeDisabled();
    });

    it('prefers a custom limit label and shows the out-of-career multiplier', () => {
        render(
            <AdvanceRow
                {...base}
                price={{ cost: null, limitLabel: 'Макс', outOfCareer: 2 }}
                hint="Підказка"
            />
        );
        expect(screen.getByRole('button', { name: 'Макс' })).toBeDisabled();
        expect(screen.getByText("Поза кар'єрою ×2")).toBeInTheDocument();
        expect(screen.getByText('Підказка')).toBeInTheDocument();
    });
});

describe('AdvanceLedger', () => {
    afterEach(cleanup);

    it('shows an empty message', () => {
        render(
            <AdvanceLedger
                ledger={[]}
                featsById={new Map()}
                isDM
                pending={false}
                onUndo={vi.fn()}
            />
        );
        expect(screen.getByText('Покупок ще не було.')).toBeInTheDocument();
    });

    it('lists newest first and offers undo only on the latest entry to the DM', () => {
        const onUndo = vi.fn();

        render(
            <AdvanceLedger
                ledger={[
                    entry({ id: 'a', cost: 25 }),
                    entry({ id: 'b', kind: 'talent', key: 'f1', cost: 100 }),
                ]}
                featsById={new Map([['f1', feat()]])}
                isDM
                pending={false}
                onUndo={onUndo}
            />
        );

        const items = screen.getAllByRole('listitem');

        expect(items[0]).toHaveTextContent('Hardy');
        expect(items[0]).toHaveTextContent('100 досвіду');
        expect(items[1]).toHaveTextContent('25 досвіду');
        expect(items[1]).toHaveTextContent('30 → 31');
        expect(items[1]).toHaveTextContent('2026-05-01');

        const undo = screen.getAllByRole('button', { name: 'Відкотити' });

        expect(undo).toHaveLength(1);
        fireEvent.click(undo[0]);
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('hides undo for players and labels unknown talents', () => {
        render(
            <AdvanceLedger
                ledger={[entry({ kind: 'talent', key: 'gone' })]}
                featsById={new Map()}
                isDM={false}
                pending={false}
                onUndo={vi.fn()}
            />
        );
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByText('Невідомий талант')).toBeInTheDocument();
    });

    it('disables undo while pending and caps the list at 20 entries', () => {
        const ledger = Array.from({ length: 25 }, (_, i) =>
            entry({ id: `e${i}` })
        );

        render(
            <AdvanceLedger
                ledger={ledger}
                featsById={new Map()}
                isDM
                pending
                onUndo={vi.fn()}
            />
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(20);
        expect(
            screen.getByRole('button', { name: 'Відкотити' })
        ).toBeDisabled();
    });
});

describe('TalentRows', () => {
    afterEach(cleanup);

    const props = {
        rules: DEFAULT_ADVANCEMENT_RULES,
        available: 1000,
        pending: false,
        price: (_id: string, base: number) => ({
            cost: base,
            outOfCareer: null,
        }),
        onBuy: vi.fn(),
    };

    it('shows the empty message when nothing is purchasable', () => {
        render(
            <TalentRows
                {...props}
                feats={[feat({ xpCost: null })]}
                talents={{}}
            />
        );
        expect(
            screen.getByText('У каталозі немає талантів із ціною в досвіді.')
        ).toBeInTheDocument();
    });

    it('prices the next rank and buys by feat id', () => {
        const onBuy = vi.fn();

        render(
            <TalentRows
                {...props}
                onBuy={onBuy}
                feats={[feat()]}
                talents={{ f1: 1 }}
            />
        );
        expect(screen.getByText('Ранг 1/3')).toBeInTheDocument();

        const expected = Math.round(
            100 * 2 * DEFAULT_ADVANCEMENT_RULES.talentCostMultiplier
        );

        fireEvent.click(
            screen.getByRole('button', { name: `Купити · ${expected}` })
        );
        expect(onBuy).toHaveBeenCalledWith('f1');
    });

    it('shows the max-rank limit and lists orphan talents', () => {
        render(
            <TalentRows
                {...props}
                feats={[feat({ maxRank: 1 })]}
                talents={{ f1: 1, ghost: 2 }}
            />
        );
        expect(
            screen.getByRole('button', { name: 'Макс. ранг' })
        ).toBeDisabled();
        expect(screen.getByText('Невідомий талант')).toBeInTheDocument();
        expect(screen.getByText('Ранг 2')).toBeInTheDocument();
    });
});
