// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HudFormMenu } from '@/components/hud/form';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

afterEach(cleanup);

const open = () =>
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ще дії' }), {
        button: 0,
        ctrlKey: false,
    });

const setup = (items: Parameters<typeof HudFormMenu>[0]['items']) =>
    render(
        <ConfirmProvider>
            <HudFormMenu label="Ще дії" items={items} />
        </ConfirmProvider>
    );

describe('HudFormMenu', () => {
    it('calls onSelect for an item without confirm', () => {
        const onSelect = vi.fn();

        setup([{ label: 'Дублювати', onSelect }]);
        open();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Дублювати' }));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('asks first and runs onSelect only after confirming', async () => {
        const onSelect = vi.fn();

        setup([
            {
                label: 'Видалити',
                onSelect,
                tone: 'danger',
                confirm: 'Видалити?',
            },
        ]);
        open();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Видалити' }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'common.actions.cancel' })
        );
        expect(onSelect).not.toHaveBeenCalled();

        open();
        fireEvent.click(screen.getByRole('menuitem', { name: 'Видалити' }));
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'common.confirm.confirm',
            })
        );
        await vi.waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    });

    it('renders nothing for empty items', () => {
        const { container } = setup([]);

        expect(container.firstChild).toBeNull();
    });
});
