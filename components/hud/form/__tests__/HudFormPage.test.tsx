// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HudFormPage } from '@/components/hud/form';
import { Button } from '@/components/ui/button';

afterEach(cleanup);

describe('HudFormPage', () => {
    it('keeps the narrow markup by default', () => {
        const { container } = render(
            <HudFormPage title="T">
                <p>body</p>
            </HudFormPage>
        );

        const root = container.firstElementChild as HTMLElement;

        expect(root.className).toContain('max-w-3xl');
        expect(root.className).toContain('ornate');
        expect(root.querySelector('aside')).toBeNull();
    });

    it('renders actions once and they submit the form in children', () => {
        const onSubmit = vi.fn((e) => e.preventDefault());

        render(
            <HudFormPage
                title="T"
                width="wide"
                actions={
                    <Button type="submit" form="f">
                        Зберегти
                    </Button>
                }
            >
                <form id="f" onSubmit={onSubmit} />
            </HudFormPage>
        );

        const buttons = screen.getAllByRole('button', { name: 'Зберегти' });

        expect(buttons).toHaveLength(1);
        fireEvent.click(buttons[0]);
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('wide with side renders a labelled aside; page has none', () => {
        const { container, rerender } = render(
            <HudFormPage title="T" width="wide" side={<p>preview</p>}>
                <p>body</p>
            </HudFormPage>
        );

        expect(
            screen.getByRole('complementary', {
                name: 'common.form.previewTitle',
            })
        ).toBeTruthy();

        rerender(
            <HudFormPage title="T" width="page" side={<p>preview</p>}>
                <p>body</p>
            </HudFormPage>
        );
        expect(screen.queryByRole('complementary')).toBeNull();
        expect(
            (container.firstElementChild as HTMLElement).className
        ).toContain('max-w-page');
    });

    it('opens the preview dialog with the side content', () => {
        render(
            <HudFormPage title="T" width="wide" side={<p>preview-node</p>}>
                <p>body</p>
            </HudFormPage>
        );

        expect(screen.getAllByText('preview-node')).toHaveLength(1);
        fireEvent.click(
            screen.getByRole('button', { name: 'common.form.preview' })
        );
        expect(screen.getAllByText('preview-node').length).toBeGreaterThan(1);
    });
});
