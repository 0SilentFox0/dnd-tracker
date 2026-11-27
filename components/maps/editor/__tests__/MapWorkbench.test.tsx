// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActiveToolChip } from '../ActiveToolChip';
import { MapWorkbench } from '../MapWorkbench';

vi.mock('next-intl', () => ({
    useTranslations: (ns?: string) => (key: string) => `${ns}.${key}`,
}));

afterEach(cleanup);

function setup(over: { value?: boolean; onEscape?: () => boolean } = {}) {
    const set = vi.fn();

    render(
        <MapWorkbench
            canvas={<button type="button">canvas</button>}
            sidebar={<p>sidebar</p>}
            notice="Saved"
            fullscreen={{ value: over.value ?? false, set, label: 'Full' }}
            onEscape={over.onEscape}
        />
    );

    return set;
}

describe('MapWorkbench', () => {
    it('puts the sidebar on the right by default and on the left on request', () => {
        const props = {
            canvas: <p>canvas</p>,
            sidebar: <p>sidebar</p>,
            fullscreen: { value: false, set: vi.fn(), label: 'Full' },
        };

        const { container, rerender } = render(<MapWorkbench {...props} />);

        const aside = () => container.querySelector('aside') as HTMLElement;

        expect(aside().className).not.toContain('lg:order-first');

        rerender(<MapWorkbench {...props} layout={{ sidebarSide: 'left' }} />);

        expect(aside().className).toContain('lg:order-first');
    });

    it('enters fullscreen from the canvas button', () => {
        const set = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Full' }));

        expect(set).toHaveBeenCalledWith(true);
    });

    it('shows the dialog and Done in fullscreen', () => {
        const set = setup({ value: true });

        expect(screen.getByRole('dialog', { name: 'Full' })).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'maps.editor.workbench.done' })
        );

        expect(set).toHaveBeenCalledWith(false);
    });

    it('Escape clears the tool before leaving fullscreen', () => {
        const onEscape = vi.fn(() => true);

        const set = setup({ value: true, onEscape });

        fireEvent.keyDown(screen.getByText('canvas'), { key: 'Escape' });

        expect(onEscape).toHaveBeenCalled();
        expect(set).not.toHaveBeenCalled();
    });

    it('Escape without a tool leaves fullscreen', () => {
        const set = setup({ value: true, onEscape: () => false });

        fireEvent.keyDown(screen.getByText('canvas'), { key: 'Escape' });

        expect(set).toHaveBeenCalledWith(false);
    });

    it('Escape outside fullscreen without a tool does nothing', () => {
        const set = setup({ onEscape: () => false });

        fireEvent.keyDown(screen.getByText('canvas'), { key: 'Escape' });

        expect(set).not.toHaveBeenCalled();
    });

    it('announces the notice in a status region', () => {
        setup();

        expect(screen.getByRole('status').textContent).toBe('Saved');
    });
});

describe('ActiveToolChip', () => {
    it('renders nothing without a tool', () => {
        const { container } = render(
            <ActiveToolChip tool={null} onClear={vi.fn()} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('shows the label with detail and clears', () => {
        const onClear = vi.fn();

        render(
            <ActiveToolChip
                tool={{ label: 'Hazard', detail: '1d6 fire' }}
                onClear={onClear}
            />
        );

        expect(screen.getByText('Hazard · 1d6 fire')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'maps.editor.workbench.clearTool',
            })
        );

        expect(onClear).toHaveBeenCalled();
    });
});
