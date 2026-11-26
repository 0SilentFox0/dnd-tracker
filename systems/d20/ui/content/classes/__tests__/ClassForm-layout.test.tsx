// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeClass } from '@/lib/utils/characters/classes/__tests__/class-fixtures';
import { ClassForm } from '@/systems/d20/ui/content/classes/ClassForm';

vi.mock('@/lib/hooks/classes', async () => {
    const { useState } = await import('react');

    return {
        useClassForm: (_c: string, _id: string, initial: unknown) => {
            const [data, set] = useState(initial);

            return {
                form: { data, set },
                abilities: { setErrors: () => {}, valid: true, errors: [] },
                actions: { submit: () => {}, cancel: () => {} },
                status: { isSaving: false },
            };
        },
    };
});

vi.mock('@/systems/d20/ui/content/classes/ClassBasicsTab', () => ({
    ClassBasicsTab: () => <div>basics</div>,
}));

describe('ClassForm layout', () => {
    afterEach(cleanup);

    it('renders one save button outside the form that targets it', () => {
        render(<ClassForm campaignId="c" gameClass={makeClass({ id: 'f' })} />);

        const save = screen.getAllByRole('button', {
            name: 'common.actions.save',
        });

        expect(save).toHaveLength(1);
        expect(save[0].getAttribute('form')).toBe('class-form');
        expect(save[0].closest('form')).toBeNull();
    });

    it('marks the map and table tabs wide and the others not', () => {
        const { container } = render(
            <ClassForm campaignId="c" gameClass={makeClass({ id: 'f' })} />
        );

        const root = () =>
            container.querySelector('[data-hud-tabs-root]') as HTMLElement;

        expect(root().dataset.activeWide).toBe('true');

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'common.tabs.basic' }),
            { button: 0 }
        );
        fireEvent.click(screen.getByRole('tab', { name: 'common.tabs.basic' }));
        expect(root().dataset.activeWide).toBeUndefined();

        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'classes.form.tabs.table' }),
            { button: 0 }
        );
        fireEvent.click(
            screen.getByRole('tab', { name: 'classes.form.tabs.table' })
        );
        expect(root().dataset.activeWide).toBe('true');
    });
});
