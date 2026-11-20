// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnemyCard } from '../EnemyCard';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { WorldEnemyPin } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const enemy: WorldEnemyPin = {
    id: 'e1',
    mapId: 'm',
    name: 'Огр',
    icon: null,
    color: null,
    dmNote: 'Спить',
    x: 0.3,
    y: 0.4,
};

const setup = () => {
    const actions = { onSave: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() };

    render(<EnemyCard enemy={enemy} actions={actions} />);

    return actions;
};

describe('EnemyCard', () => {
    it('shows the DM-only badge and the stored values', () => {
        setup();

        expect(screen.getByText('лише ДМ')).toBeTruthy();
        expect((screen.getByLabelText('Назва') as HTMLInputElement).value).toBe(
            'Огр'
        );
        expect(
            (screen.getByLabelText('Нотатка ДМ') as HTMLTextAreaElement).value
        ).toBe('Спить');
    });

    it('saves a renamed enemy on blur', () => {
        const { onSave } = setup();

        const input = screen.getByLabelText('Назва');

        fireEvent.change(input, { target: { value: 'Тролль' } });
        fireEvent.blur(input);

        expect(onSave).toHaveBeenCalledWith({ name: 'Тролль' });
    });

    it('does not save an unchanged or empty name', () => {
        const { onSave } = setup();

        const input = screen.getByLabelText('Назва');

        fireEvent.blur(input);
        fireEvent.change(input, { target: { value: '  ' } });
        fireEvent.blur(input);

        expect(onSave).not.toHaveBeenCalled();
    });

    it('saves the note on blur', () => {
        const { onSave } = setup();

        const note = screen.getByLabelText('Нотатка ДМ');

        fireEvent.change(note, { target: { value: 'Прокинувся' } });
        fireEvent.blur(note);

        expect(onSave).toHaveBeenCalledWith({ dmNote: 'Прокинувся' });
    });

    it('saves a picked icon', () => {
        const { onSave } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Замок' }));

        expect(onSave).toHaveBeenCalledWith({ icon: 'castle' });
    });

    it('deletes and closes', () => {
        const { onDelete, onClose } = setup();

        fireEvent.click(
            screen.getByRole('button', { name: 'Видалити ворога' })
        );
        fireEvent.click(screen.getByRole('button', { name: 'Закрити' }));

        expect(onDelete).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });
});
