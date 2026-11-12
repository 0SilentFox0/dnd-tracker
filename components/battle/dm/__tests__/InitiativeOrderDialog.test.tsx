// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({
    hudFontClassName: '',
    HUD_SURFACE: 'hud-surface',
}));

import { InitiativeOrderDialog } from '@/components/battle/dm/dialogs/InitiativeOrderDialog';
import { render } from '@/lib/i18n/test/render-uk';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';

vi.unmock('next-intl');

afterEach(cleanup);

const mk = (id: string, name: string) => {
    const b = createMockParticipant();

    return { ...b, basicInfo: { ...b.basicInfo, id, name } };
};

const people = [mk('a', 'Аня'), mk('b', 'Борис'), mk('c', 'Віра')];

describe('InitiativeOrderDialog', () => {
    it('lists participants in the current order; unchanged order cannot be applied', () => {
        render(
            <InitiativeOrderDialog
                participants={people}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        );

        expect(
            screen.getAllByRole('listitem').map((li) => li.textContent)
        ).toEqual(['1Аня', '2Борис', '3Віра']);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Застосувати',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
    });

    it('moving an item changes the draft and commit submits the ids', () => {
        const onSubmit = vi.fn();

        render(
            <InitiativeOrderDialog
                participants={people}
                onClose={vi.fn()}
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Вище: Борис' }));

        expect(
            screen.getAllByRole('listitem').map((li) => li.textContent)
        ).toEqual(['1Борис', '2Аня', '3Віра']);

        fireEvent.click(screen.getByRole('button', { name: 'Застосувати' }));

        expect(onSubmit).toHaveBeenCalledWith(['b', 'a', 'c']);
    });

    it('reseeds the draft when the participant set changes while open', () => {
        const { rerender } = render(
            <InitiativeOrderDialog
                participants={people}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Вище: Борис' }));

        rerender(
            <InitiativeOrderDialog
                participants={[...people, mk('d', 'Грім')]}
                onClose={vi.fn()}
                onSubmit={vi.fn()}
            />
        );

        expect(
            screen.getAllByRole('listitem').map((li) => li.textContent)
        ).toEqual(['1Аня', '2Борис', '3Віра', '4Грім']);
    });
});
