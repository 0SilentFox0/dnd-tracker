// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const media = vi.hoisted(() => ({ xl: true }));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useMediaQuery: () => media.xl,
}));

import { HudTabs } from '@/components/hud/form';

function Harness() {
    const [v, setV] = useState<'a' | 'b'>('a');

    return (
        <HudTabs
            value={v}
            onValueChange={setV}
            styles={{ variant: 'rail' }}
            tabs={[
                { id: 'a', label: 'Перший', content: <p>А</p>, badge: 3 },
                {
                    id: 'b',
                    label: 'Другий',
                    content: <p>Б</p>,
                    wide: true,
                    invalid: true,
                },
            ]}
        />
    );
}

afterEach(() => {
    cleanup();
    media.xl = true;
});

describe('HudTabs rail', () => {
    it('is vertical at xl and horizontal below', () => {
        const { rerender } = render(<Harness />);

        expect(
            screen.getByRole('tablist').getAttribute('aria-orientation')
        ).toBe('vertical');

        media.xl = false;
        rerender(<Harness />);
        expect(
            screen.getByRole('tablist').getAttribute('aria-orientation')
        ).toBe('horizontal');
    });

    it('moves focus to the next tab with ArrowDown', () => {
        render(<Harness />);

        const first = screen.getByRole('tab', { name: /Перший/ });

        first.focus();
        fireEvent.keyDown(first, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(
            screen.getByRole('tab', { name: /Другий/ })
        );
    });

    it('renders badge, invalid dot and data-active-wide', () => {
        const { container } = render(<Harness />);

        expect(screen.getByText('3')).toBeTruthy();
        expect(container.querySelector('[data-invalid-dot]')).toBeTruthy();

        const root = container.querySelector('[data-hud-tabs-root]');

        expect(root?.getAttribute('data-active-wide')).toBeNull();
        fireEvent.mouseDown(screen.getByRole('tab', { name: /Другий/ }));
        expect(root?.getAttribute('data-active-wide')).toBe('true');
    });
});
