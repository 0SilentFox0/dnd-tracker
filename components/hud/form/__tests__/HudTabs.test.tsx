// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HudTabs } from '@/components/hud/form';

function Harness({ keepMounted }: { keepMounted?: boolean }) {
    const [v, setV] = useState<'a' | 'b'>('a');

    return (
        <HudTabs
            value={v}
            onValueChange={setV}
            keepMounted={keepMounted}
            tabs={[
                {
                    id: 'a',
                    label: 'Перший',
                    content: <input aria-label="поле А" />,
                },
                {
                    id: 'b',
                    label: 'Другий',
                    content: <input aria-label="поле Б" />,
                    invalid: true,
                },
            ]}
        />
    );
}

afterEach(cleanup);

describe('HudTabs', () => {
    it('marks invalid tabs', () => {
        render(<Harness />);

        expect(
            screen
                .getByRole('tab', { name: /Другий/ })
                .querySelector('[data-invalid-dot]')
        ).not.toBeNull();
        expect(
            screen
                .getByRole('tab', { name: /Перший/ })
                .querySelector('[data-invalid-dot]')
        ).toBeNull();
    });

    it('keeps inactive panels mounted but hidden when keepMounted', () => {
        render(<Harness keepMounted />);

        const hidden = screen.getByLabelText('поле Б', {
            selector: 'input',
        }) as HTMLInputElement;

        expect(
            hidden.closest('[data-tab-id]')?.getAttribute('data-tab-id')
        ).toBe('b');
        expect(hidden.closest('[data-tab-id]')?.className).toContain(
            'data-[state=inactive]:hidden'
        );
    });

    it('sheet variant: outlined strip, raised active cell and a sliding indicator', () => {
        render(
            <HudTabs
                value="a"
                onValueChange={() => undefined}
                styles={{ variant: 'sheet' }}
                tabs={[
                    {
                        id: 'a',
                        label: 'Перший',
                        icon: <i data-testid="icon-a" />,
                        content: null,
                    },
                    { id: 'b', label: 'Другий', content: null },
                ]}
            />
        );

        const inactive = screen.getByRole('tab', { name: 'Другий' });

        const active = screen.getByRole('tab', { name: 'Перший' });

        expect(inactive.className).toContain('text-hud-text');
        expect(inactive.className).not.toMatch(/(^|\s)text-hud-muted/);
        expect(active.className).toContain('data-[state=active]:font-bold');
        expect(active.className).toContain(
            'data-[state=active]:bg-hud-raised!'
        );
        expect(screen.getByRole('tablist').className).toContain(
            'border-hud-line'
        );
        expect(active.getAttribute('data-tab')).toBe('a');
        expect(active.querySelector('[data-testid="icon-a"]')).not.toBeNull();
        expect(screen.getByTestId('tab-indicator').className).toContain(
            'motion-indicator'
        );
    });

    it('sheet variant: tablist semantics with a roving tabindex', () => {
        render(
            <HudTabs
                value="b"
                onValueChange={() => undefined}
                styles={{ variant: 'sheet' }}
                tabs={[
                    { id: 'a', label: 'Перший', content: null },
                    { id: 'b', label: 'Другий', content: 'панель Б' },
                ]}
            />
        );

        expect(screen.getByRole('tablist')).toBeTruthy();
        expect(screen.getByRole('tab', { name: 'Другий' })).toHaveAttribute(
            'aria-selected',
            'true'
        );
        expect(screen.getByRole('tab', { name: 'Перший' })).toHaveAttribute(
            'aria-selected',
            'false'
        );
        expect(screen.getByRole('tab', { name: 'Перший' }).tabIndex).toBe(-1);
        expect(screen.getByRole('tabpanel')).toHaveTextContent('панель Б');
    });

    it('sheet variant: the entering panel carries the direction of the move', () => {
        const Sheet = () => {
            const [v, setV] = useState<'a' | 'b'>('a');

            return (
                <HudTabs
                    value={v}
                    onValueChange={setV}
                    styles={{ variant: 'sheet' }}
                    tabs={[
                        { id: 'a', label: 'Перший', content: 'А' },
                        { id: 'b', label: 'Другий', content: 'Б' },
                    ]}
                />
            );
        };

        render(<Sheet />);
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Другий' }));

        expect(screen.getByRole('tabpanel')).toHaveAttribute('data-dir', '1');
        expect(screen.getByRole('tabpanel').className).toContain(
            'motion-panel'
        );
    });

    it('unmounts inactive panels by default and switches on click', () => {
        render(<Harness />);

        expect(screen.queryByLabelText('поле Б')).toBeNull();
        fireEvent.mouseDown(screen.getByRole('tab', { name: /Другий/ }));
        expect(screen.getByLabelText('поле Б')).toBeTruthy();
    });
});
