// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HudFormPage } from '@/components/hud/form';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';

beforeEach(() => mockMatchMedia(false));
afterEach(cleanup);

describe('HudFormPage', () => {
    it('narrow is the default, caps width and ignores side', () => {
        const { container } = render(
            <HudFormPage header={{ title: 'T' }} side={<p>preview</p>}>
                body
            </HudFormPage>
        );

        expect(container.firstElementChild?.className).toContain('max-w-3xl');
        expect(screen.queryByText('preview')).toBeNull();
        expect(screen.getByRole('heading', { name: 'T' })).toBeTruthy();
    });

    it('wide renders the aside and exactly one actions node', () => {
        render(
            <HudFormPage
                width="wide"
                header={{ title: 'T' }}
                side={<p>preview</p>}
                actions={<button type="submit">save</button>}
            >
                body
            </HudFormPage>
        );

        const aside = screen.getByRole('complementary', {
            name: 'common.ui.preview',
        });

        expect(aside.textContent).toBe('preview');
        expect(screen.getAllByRole('button', { name: 'save' })).toHaveLength(1);
    });

    it('submits a form from actions rendered outside it', () => {
        const onSubmit = vi.fn((e) => e.preventDefault());

        render(
            <HudFormPage
                width="wide"
                header={{ title: 'T' }}
                actions={
                    <button type="submit" form="f">
                        save
                    </button>
                }
            >
                <form id="f" onSubmit={onSubmit}>
                    <input aria-label="x" />
                </form>
            </HudFormPage>
        );

        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('renders the back link', () => {
        render(
            <HudFormPage
                width="wide"
                header={{
                    title: 'T',
                    back: { href: '/lib', label: 'Library' },
                }}
            >
                body
            </HudFormPage>
        );

        expect(
            screen.getByRole('link', { name: 'Library' }).getAttribute('href')
        ).toBe('/lib');
    });

    it('opens the preview dialog from the header button', async () => {
        render(
            <HudFormPage
                width="wide"
                header={{ title: 'T' }}
                side={<p>preview</p>}
            >
                body
            </HudFormPage>
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'common.ui.preview' })
        );

        expect(await screen.findByRole('dialog')).toBeTruthy();
        expect(screen.getAllByText('preview').length).toBe(2);
    });

    it('sidePreview={false} keeps the aside but drops the preview button', () => {
        render(
            <HudFormPage
                width="wide"
                header={{ title: 'T' }}
                side={<p>preview</p>}
                sidePreview={false}
            >
                body
            </HudFormPage>
        );

        expect(document.querySelector('.hud-form-side')).not.toBeNull();
        expect(
            screen.queryByRole('button', { name: 'common.ui.preview' })
        ).toBeNull();
    });

    it('css gives every wide template a notice row and a header bar without side', () => {
        const css = readFileSync('components/hud/hud.css', 'utf8');

        const areas = css.match(/grid-template-areas: [^;]+;/g) ?? [];

        expect(areas.length).toBeGreaterThan(0);
        expect(areas.every((a) => a.includes('notice'))).toBe(true);
        expect(css).toMatch(
            /:not\(:has\(> \.hud-form-side\)\)\) > \.hud-form-actions \{ grid-row: 1; position: static/
        );
    });

    it('css gives the wide form a 16px phone gutter and an opaque lg+ actions bar', () => {
        const css = readFileSync('components/hud/hud.css', 'utf8');

        expect(css).toMatch(
            /@media \(max-width: 639px\) \{\s*\.hud-form-wide \{ padding-inline: 16px; \}/
        );
        expect(css).toMatch(
            /\.hud-form-wide > \.hud-form-actions \{ grid-row: 1 \/ -1; grid-column: 2;[^}]*backdrop-filter: blur\(6px\)/
        );
    });
});
