// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GrantCorruptionDialog } from '../GrantCorruptionDialog';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

const mocks = vi.hoisted(() => ({
    grant: {
        mutateOk: vi.fn(async () => true),
        isPending: false,
        data: undefined as unknown,
    },
    undo: vi.fn(async () => true),
    rules: { data: {} as unknown },
}));

vi.mock('@/lib/hooks/campaigns', async (orig) => ({
    ...(await orig<object>()),
    useCampaignRules: () => mocks.rules,
}));

vi.mock('@/systems/wfrp/hooks', async (orig) => ({
    ...(await orig<object>()),
    useGrantCorruption: () => mocks.grant,
    useUndoCorruption: () => ({ mutateOk: mocks.undo, isPending: false }),
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useConfirm: () => (o: { onConfirm: () => Promise<void> }) => o.onConfirm(),
}));

const open = () => {
    render(<GrantCorruptionDialog campaignId="c" characterId="h" />);
    fireEvent.click(screen.getByRole('button', { name: 'Нарахувати порчу' }));
};

const submitBtn = () =>
    screen.getByRole('button', { name: 'Нарахувати' }) as HTMLButtonElement;

const fill = (points: string, reason: string) => {
    fireEvent.change(screen.getByLabelText(/Пункти/), {
        target: { value: points },
    });
    fireEvent.change(screen.getByLabelText('Причина'), {
        target: { value: reason },
    });
};

const text = { message: 'wfrpCorruption.mutations.physical.3' };

describe('GrantCorruptionDialog', () => {
    beforeEach(() => {
        mocks.grant.data = undefined;
        mocks.rules.data = {};
        mocks.grant.mutateOk.mockClear();
        mocks.undo.mockClear();
    });

    afterEach(cleanup);

    it('does not submit for 0, 11, empty points or an empty reason', () => {
        open();

        for (const [p, r] of [
            ['0', 'x'],
            ['11', 'x'],
            ['', 'x'],
            ['2', '  '],
        ]) {
            fill(p, r);
            fireEvent.click(submitBtn());
        }

        expect(mocks.grant.mutateOk).not.toHaveBeenCalled();
    });

    it('shows a message on the empty reason after a submit attempt', () => {
        open();
        fill('2', '');

        expect(screen.queryByText('Вкажіть причину')).toBeNull();

        fireEvent.click(submitBtn());

        expect(screen.getByText('Вкажіть причину')).toBeTruthy();
        expect(
            screen.getByLabelText(/Причина/).getAttribute('aria-invalid')
        ).toBe('true');
    });

    it('submits points and reason', () => {
        open();
        fill('2', 'Warpstone');
        fireEvent.click(submitBtn());

        expect(mocks.grant.mutateOk).toHaveBeenCalledWith({
            points: 2,
            reason: 'Warpstone',
        });
    });

    it('shows a no-test summary', async () => {
        mocks.grant.data = {
            grantId: 'g',
            corruption: {},
            summary: { points: 2, total: 2, threshold: 6 },
        };
        open();
        fill('2', 'Warpstone');
        fireEvent.click(submitBtn());

        await waitFor(() =>
            expect(screen.getByText('Тест не потрібен')).toBeTruthy()
        );
    });

    it('shows the failed test, mutation and effects, then undoes', async () => {
        mocks.grant.data = {
            grantId: 'g1',
            corruption: {},
            summary: {
                points: 2,
                total: 8,
                threshold: 6,
                test: { roll: 80, target: 40, sl: -4, outcome: 'failure' },
                mutation: {
                    kind: 'physical',
                    typeRoll: 12,
                    roll: 3,
                    text,
                    effects: [{ type: 'move', amount: -1 }],
                },
                capped: true,
            },
        };
        open();
        fill('2', 'Warpstone');
        fireEvent.click(submitBtn());

        await waitFor(() =>
            expect(
                screen.getByText(/Тест Витривалості: 80 проти 40, SL -4/)
            ).toBeTruthy()
        );
        expect(screen.getByText(/провалено/)).toBeTruthy();
        expect(screen.getByText(/Ступні зрослися в копита/)).toBeTruthy();
        expect(screen.getByText('Рух -1')).toBeTruthy();
        expect(screen.getByText('Досягнуто ліміт мутацій')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Відкотити' }));

        await waitFor(() =>
            expect(mocks.undo).toHaveBeenCalledWith({ grantId: 'g1' })
        );
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'Відкотено' })
            ).toBeTruthy()
        );
    });

    describe('canon5e exposure', () => {
        beforeEach(() => {
            mocks.rules.data = { edition: { preset: 'canon5e' } };
        });

        it('submits the exposure form by default', () => {
            open();
            fireEvent.change(screen.getByLabelText('Причина'), {
                target: { value: 'Rift' },
            });
            fireEvent.click(submitBtn());

            expect(mocks.grant.mutateOk).toHaveBeenCalledWith({
                exposure: { degree: 'minor', skill: 'endurance' },
                reason: 'Rift',
            });
        });

        it('falls back to manual points via the toggle', () => {
            open();
            fireEvent.click(
                screen.getByRole('switch', { name: 'Ввести пункти вручну' })
            );
            fill('2', 'Warpstone');
            fireEvent.click(submitBtn());

            expect(mocks.grant.mutateOk).toHaveBeenCalledWith({
                points: 2,
                reason: 'Warpstone',
            });
        });

        it('shows the exposure result without an undo for zero points', async () => {
            mocks.grant.data = {
                corruption: {},
                summary: {
                    points: 0,
                    total: 1,
                    threshold: 5,
                    exposure: {
                        degree: 'minor',
                        skill: 'cool',
                        test: {
                            roll: 10,
                            target: 40,
                            sl: 3,
                            outcome: 'success',
                        },
                    },
                },
            };
            open();
            fireEvent.change(screen.getByLabelText('Причина'), {
                target: { value: 'Rift' },
            });
            fireEvent.click(submitBtn());

            await waitFor(() =>
                expect(
                    screen.getByText(/10 проти 40, SL 3 → 0 п\./)
                ).toBeTruthy()
            );
            expect(
                screen.queryByRole('button', { name: 'Скасувати' })
            ).toBeNull();
            expect(screen.queryByText(/тест не потрібен/i)).toBeNull();
        });
    });
});
