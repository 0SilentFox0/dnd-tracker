// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UndoableResultDialog } from '../UndoableResultDialog';

vi.mock('@/lib/hooks/common', () => ({
    useConfirm: () => (o: { onConfirm: () => Promise<void> }) => o.onConfirm(),
}));

const labels = {
    button: 'Open',
    title: 'Title',
    submit: 'Go',
    result: 'Result',
    undo: 'Undo',
    undone: 'Undone',
    undoConfirm: 'Sure?',
};

const setup = (result: string | null, onClosed = vi.fn()) => {
    const onConfirm = vi.fn(async () => {});

    const onClick = vi.fn();

    render(
        <UndoableResultDialog
            labels={labels}
            result={result}
            submit={{ onClick, disabled: false }}
            undo={{ onConfirm, pending: false, done: false }}
            onClosed={onClosed}
        >
            <p>form</p>
        </UndoableResultDialog>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    return { onConfirm, onClick };
};

describe('UndoableResultDialog', () => {
    afterEach(cleanup);

    it('shows the form and submit without a result', () => {
        const { onClick } = setup(null);

        expect(screen.getByText('form')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(onClick).toHaveBeenCalled();
    });

    it('shows the result and runs undo after confirm', () => {
        const { onConfirm } = setup('done!');

        expect(screen.getByText('done!')).toBeTruthy();
        expect(screen.queryByText('form')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(onConfirm).toHaveBeenCalled();
    });
});
