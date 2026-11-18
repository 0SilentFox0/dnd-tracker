// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateMapDialog } from '../CreateMapDialog';

import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';

afterEach(cleanup);

function renderDialog(overrides: Partial<Parameters<typeof CreateMapDialog>[0]> = {}) {
    const onSubmit = vi.fn();

    const onOpenChange = vi.fn();

    render(
        <CreateMapDialog
            open
            pending={false}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            {...overrides}
        />
    );

    return { onSubmit, onOpenChange };
}

describe('CreateMapDialog', () => {
    it('keeps submit disabled until a name is entered', () => {
        renderDialog();

        const submit = screen.getByRole('button', { name: 'maps.create.submit' });

        expect(submit.hasAttribute('disabled')).toBe(true);

        fireEvent.change(screen.getByLabelText('maps.create.name'), {
            target: { value: 'Crypt' },
        });

        expect(submit.hasAttribute('disabled')).toBe(false);
    });

    it('submits the trimmed name with the default size', () => {
        const { onSubmit } = renderDialog();

        fireEvent.change(screen.getByLabelText('maps.create.name'), {
            target: { value: '  Crypt  ' },
        });
        fireEvent.submit(
            screen.getByLabelText('maps.create.name').closest('form') as HTMLFormElement
        );

        expect(onSubmit).toHaveBeenCalledWith({
            name: 'Crypt',
            cols: DEFAULT_BATTLE_MAP.cols,
            rows: DEFAULT_BATTLE_MAP.rows,
        });
    });

    it('disables submit while pending and closes on cancel', () => {
        const { onOpenChange } = renderDialog({ pending: true });

        fireEvent.change(screen.getByLabelText('maps.create.name'), {
            target: { value: 'Crypt' },
        });

        expect(
            screen
                .getByRole('button', { name: 'maps.create.submit' })
                .hasAttribute('disabled')
        ).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'common.actions.cancel' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
