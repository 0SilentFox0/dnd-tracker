// @vitest-environment happy-dom
import type { ComponentProps, ReactNode } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldEditorContext } from '../WorldEditorContext';
import { WorldToolbar, WorldToolHint } from '../WorldToolbar';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { WorldEditorCtx } from '@/lib/hooks/world';
import type { useMapDrawing } from '@/lib/hooks/world';

vi.unmock('next-intl');

afterEach(cleanup);

const openMap = vi.fn();

const ctx = (parentMapId: string | null) =>
    ({
        detail: { map: { id: 'm2', parentMapId }, markers: [] },
        maps: [{ id: 'm1', name: 'Ашан' }],
        openMap,
    }) as unknown as WorldEditorCtx;

const drawing = (over: Partial<ReturnType<typeof useMapDrawing>> = {}) =>
    ({
        tool: 'select',
        setTool: vi.fn(),
        pinned: { value: false, set: vi.fn() },
        draft: [],
        finish: vi.fn(),
        undoVertex: vi.fn(),
        ...over,
    }) as unknown as ReturnType<typeof useMapDrawing>;

const renderBar = (
    d: ReturnType<typeof useMapDrawing>,
    parentMapId: string | null = null,
    onSettings?: () => void,
    extra?: ReactNode,
    readOnly = false,
    props: Partial<ComponentProps<typeof WorldToolbar>> = {}
) =>
    render(
        <WorldEditorContext.Provider value={ctx(parentMapId)}>
            <WorldToolbar
                drawing={d}
                readOnly={readOnly}
                onSettings={onSettings}
                {...props}
            >
                {extra}
            </WorldToolbar>
        </WorldEditorContext.Provider>
    );

describe('WorldToolbar', () => {
    it('shows four tools with the active one pressed and switches on click', () => {
        const d = drawing({ tool: 'zone' });

        renderBar(d);

        expect(
            screen
                .getByRole('button', { name: 'Зона' })
                .getAttribute('aria-pressed')
        ).toBe('true');
        expect(
            screen
                .getByRole('button', { name: 'Вибір' })
                .getAttribute('aria-pressed')
        ).toBe('false');

        fireEvent.click(screen.getByRole('button', { name: 'Точка входу' }));

        expect(d.setTool).toHaveBeenCalledWith('entry');
    });

    it('shows text labels next to icons and keeps aria-labels for narrow screens', () => {
        renderBar(drawing());

        const button = screen.getByRole('button', { name: 'Зона' });

        const label = button.querySelector('span') as HTMLElement;

        expect(label.textContent).toBe('Зона');
        expect(label.className).toContain('hidden');
        expect(label.className).toContain('xl:inline');
    });

    it('Shift-click pins a tool, a plain click does not', () => {
        const d = drawing();

        renderBar(d);

        fireEvent.click(screen.getByRole('button', { name: 'Точка' }), {
            shiftKey: true,
        });

        expect(d.setTool).toHaveBeenLastCalledWith('point', true);

        fireEvent.click(screen.getByRole('button', { name: 'Зона' }));

        expect(d.setTool).toHaveBeenLastCalledWith('zone', false);
    });

    it('double click pins a tool; select cannot be pinned', () => {
        const d = drawing();

        renderBar(d);

        fireEvent.doubleClick(screen.getByRole('button', { name: 'Зона' }));

        expect(d.setTool).toHaveBeenLastCalledWith('zone', true);

        fireEvent.click(screen.getByRole('button', { name: 'Вибір' }), {
            shiftKey: true,
        });

        expect(d.setTool).toHaveBeenLastCalledWith('select', false);
    });

    it('marks the active pinned tool', () => {
        renderBar(
            drawing({ tool: 'point', pinned: { value: true, set: vi.fn() } })
        );

        expect(
            screen
                .getByRole('button', { name: 'Точка' })
                .getAttribute('data-pinned')
        ).toBe('true');
    });

    it('snapping chip toggles snap.enabled', () => {
        const setEnabled = vi.fn();

        renderBar(drawing(), null, undefined, undefined, false, {
            snap: { enabled: true, setEnabled },
        });

        const chip = screen.getByRole('button', { name: 'Прилипання' });

        expect(chip.getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(chip);

        expect(setEnabled).toHaveBeenCalledWith(false);
    });

    it('play mode shows only the heroes tool and no snapping or settings', () => {
        renderBar(drawing({ tool: 'move' }), null, vi.fn(), undefined, false, {
            mode: 'play',
            snap: { enabled: true, setEnabled: vi.fn() },
        });

        expect(screen.getByRole('button', { name: 'Герої' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Зона' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Прилипання' })).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Налаштування карти' })
        ).toBeNull();
    });

    it('read-only disables every tool and settings', () => {
        const d = drawing();

        renderBar(d, null, vi.fn(), undefined, true);

        for (const name of [
            'Вибір',
            'Точка',
            'Зона',
            'Точка входу',
            'Налаштування карти',
        ])
            expect(
                (screen.getByRole('button', { name }) as HTMLButtonElement)
                    .disabled
            ).toBe(true);
    });

    it('offers finishing the zone only with three vertices', () => {
        renderBar(
            drawing({
                tool: 'zone',
                draft: [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                ],
            })
        );

        expect(
            (
                screen.getByRole('button', {
                    name: 'Замкнути зону',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Крок назад',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(false);
    });

    it('links to the parent map on a nested map', () => {
        renderBar(drawing(), 'm1');

        fireEvent.click(
            screen.getByRole('button', { name: /На батьківську карту/ })
        );

        expect(openMap).toHaveBeenCalledWith('m1');
    });

    it('has a settings button only when a handler is passed', () => {
        const onSettings = vi.fn();

        renderBar(drawing(), null, onSettings);
        fireEvent.click(
            screen.getByRole('button', { name: 'Налаштування карти' })
        );

        expect(onSettings).toHaveBeenCalled();
    });

    it('renders extra slot content', () => {
        renderBar(
            drawing(),
            null,
            undefined,
            <button type="button">Відпочинок</button>
        );

        expect(screen.getByRole('button', { name: 'Відпочинок' })).toBeTruthy();
    });
});

describe('WorldToolHint', () => {
    it('is hidden for select and explains the other tools', () => {
        const { container, rerender } = render(
            <WorldToolHint tool="select" vertices={0} />
        );

        expect(container.textContent).toBe('');

        rerender(<WorldToolHint tool="zone" vertices={2} />);

        expect(screen.getByRole('status').textContent).toContain(
            'двічі клікніть'
        );
    });

    it('puts the extras on their own full-width row below lg, inline on lg', () => {
        renderBar(drawing(), null, undefined, <span>eyes</span>);

        const row = screen.getByText('eyes').parentElement as HTMLElement;

        expect(row.getAttribute('data-slot')).toBe('toolbar-extras');
        expect(row.className).toContain('border-t');
        expect(row.className).toContain('lg:border-t-0');
        expect(row.parentElement?.className).toContain('flex-col');
        expect(row.parentElement?.className).toContain('lg:flex-row');
    });
});
