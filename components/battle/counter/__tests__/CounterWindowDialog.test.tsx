// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CounterWindowDialog } from '../CounterWindowDialog';

const view = vi.hoisted(() => ({
    value: undefined as unknown,
}));

vi.mock('@/components/ui/responsive-dialog', () => ({
    ResponsiveDialog: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
}));
vi.mock('@/lib/hooks/battle', () => ({
    useCounterWindow: () => view.value,
    useCounterNudge: () => undefined,
}));
vi.mock('@/lib/i18n/use-text', () => ({
    useText: () => (line: { message: string }) => `text:${line.message}`,
}));

const make = (offer: object, over: object = {}) => ({
    window: { windowId: 'w', spell: { name: 'Bolt' } },
    isDM: false,
    caster: 'Mage',
    secondsLeft: 7,
    isPending: false,
    counter: vi.fn(),
    react: vi.fn(),
    pass: vi.fn(),
    closeAll: vi.fn(),
    offers: [
        {
            offer,
            name: 'Hero',
            canCounter: true,
            passForPlayer: false,
            ...over,
        },
    ],
});

afterEach(cleanup);

describe('CounterWindowDialog', () => {
    const systemOffer = {
        reactorId: 'h',
        dm: false,
        slotLevels: [],
        system: { label: 'wfrpMagic.dispel.react' },
    };

    it('a system offer shows its own label and reacts instead of countering', () => {
        const v = make(systemOffer);

        view.value = v;

        render(<CounterWindowDialog />);

        fireEvent.click(screen.getByText('text:wfrpMagic.dispel.react'));

        expect(v.react).toHaveBeenCalledWith(systemOffer);
        expect(v.counter).not.toHaveBeenCalled();
    });

    it('a system offer has no granted-use hint and no slot picker', () => {
        view.value = make(systemOffer);

        render(<CounterWindowDialog />);

        expect(document.body.textContent).not.toContain('grant');
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('a spell offer still counters', () => {
        const spellOffer = { reactorId: 'h', dm: false, slotLevels: [] };

        const v = make(spellOffer);

        view.value = v;

        render(<CounterWindowDialog />);

        fireEvent.click(screen.getByText(/counter$/));

        expect(v.counter).toHaveBeenCalledWith(spellOffer, undefined);
        expect(v.react).not.toHaveBeenCalled();
    });

    it('a viewer who cannot answer for the offer sees only Pass', () => {
        view.value = make(systemOffer, { canCounter: false });

        render(<CounterWindowDialog />);

        expect(screen.queryByText('text:wfrpMagic.dispel.react')).toBeNull();
    });
});
