// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DowntimePeriodPanel } from '../DowntimePeriodPanel';

import { render } from '@/lib/i18n/test/render-uk';
import type { CharacterListItem } from '@/types/characters';

vi.unmock('next-intl');

const mocks = vi.hoisted(() => ({
    period: {
        mutateOk: vi.fn(async () => true),
        isPending: false,
        data: undefined as unknown,
    },
    undo: vi.fn(async () => true),
}));

vi.mock('@/systems/wfrp/hooks', async (orig) => ({
    ...(await orig<object>()),
    useDowntimePeriod: () => mocks.period,
    useDowntimePeriodUndo: () => ({ mutateOk: mocks.undo, isPending: false }),
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useConfirm: () => (o: { onConfirm: () => Promise<void> }) => o.onConfirm(),
}));

const hero = (id: string, name: string) => ({ id, name }) as CharacterListItem;

const mount = () =>
    render(
        <DowntimePeriodPanel
            campaignId="c"
            characters={[hero('a', 'Арвен'), hero('b', 'Борин')]}
        />
    );

const open = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Минув період' }));

describe('DowntimePeriodPanel', () => {
    beforeEach(() => {
        mocks.period.data = undefined;
        mocks.period.mutateOk.mockClear();
        mocks.undo.mockClear();
    });

    afterEach(cleanup);

    it('opens a dialog with every hero checked', () => {
        mount();
        open();

        expect(
            (
                screen.getByRole('checkbox', {
                    name: 'Арвен',
                }) as HTMLInputElement
            ).getAttribute('aria-checked')
        ).toBe('true');
        expect(
            (
                screen.getByRole('checkbox', {
                    name: 'Борин',
                }) as HTMLInputElement
            ).getAttribute('aria-checked')
        ).toBe('true');
    });

    it('blocks submit for days outside 1..30', () => {
        mount();
        open();

        for (const bad of ['0', '31', '1.5']) {
            fireEvent.change(screen.getByLabelText(/Днів/), {
                target: { value: bad },
            });

            expect(
                (
                    screen.getByRole('button', {
                        name: 'Провести період',
                    }) as HTMLButtonElement
                ).disabled
            ).toBe(true);
        }
    });

    it('submits days and character ids', () => {
        mount();
        open();
        fireEvent.change(screen.getByLabelText(/Днів/), {
            target: { value: '10' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Провести період' })
        );

        expect(mocks.period.mutateOk).toHaveBeenCalledWith({
            days: 10,
            characterIds: ['a', 'b'],
        });
    });

    it('shows the per-hero summary and undoes the period', async () => {
        mocks.period.data = {
            periodId: 'p1',
            characters: [
                {
                    id: 'a',
                    resources: {},
                    downtime: {
                        ailments: [],
                        lastPeriod: {
                            id: 'p1',
                            at: 'x',
                            days: 7,
                            before: { ailments: [] },
                            after: { ailmentIds: [] },
                            summary: { healed: 4, ailments: [] },
                        },
                    },
                },
            ],
        };
        mount();
        open();
        fireEvent.click(
            screen.getByRole('button', { name: 'Провести період' })
        );

        await waitFor(() =>
            expect(screen.getByText('Вилікувано Ран: 4')).toBeTruthy()
        );
        expect(screen.getByText('Арвен')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Відкотити період' })
        );

        await waitFor(() =>
            expect(mocks.undo).toHaveBeenCalledWith({
                periodId: 'p1',
                characterIds: ['a'],
            })
        );
    });
});
