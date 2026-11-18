// @vitest-environment happy-dom
import { useEffect } from 'react';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleFormMap } from '@/components/battle/setup/BattleFormMap';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { useBattleMapEditor } from '@/lib/hooks/battles/setup/useBattleMapEditor';
import { MAX_SIDE, UNIT } from '@/lib/utils/battle/grid';

vi.mock('next/image', () => ({
    default: ({ src }: { src: string }) => <i data-bg={src} />,
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useImageSize: (src: string | null) =>
        src ? { width: 1980, height: 1200 } : null,
}));
vi.mock('@/components/onboarding/OnboardingHint', () => ({
    OnboardingHint: () => null,
}));
vi.stubGlobal(
    'ResizeObserver',
    class {
        constructor(
            private cb: (
                e: { contentRect: { width: number; height: number } }[]
            ) => void
        ) {}
        observe() {
            this.cb([{ contentRect: { width: 800, height: 600 } }]);
        }
        disconnect() {}
        unobserve() {}
    }
);

const seen = vi.hoisted(() => ({
    editor: null as unknown as ReturnType<
        typeof import('@/lib/hooks/battles/setup/useBattleMapEditor').useBattleMapEditor
    >,
}));

function Harness() {
    const editor = useBattleMapEditor(null);

    useEffect(() => {
        seen.editor = editor;
    });

    return (
        <ConfirmProvider>
            <BattleFormMap editor={editor} />
        </ConfirmProvider>
    );
}

const hit = (c: HTMLElement) =>
    c.querySelector('[data-grid-hit]') as SVGRectElement;

const CELL_PX = 10;

function press(c: HTMLElement, key: string) {
    const svg = hit(c).ownerSVGElement as SVGSVGElement;

    svg.getScreenCTM = () =>
        ({
            a: CELL_PX / UNIT,
            b: 0,
            c: 0,
            d: CELL_PX / UNIT,
            e: 0,
            f: 0,
        }) as DOMMatrix;

    const [x, y] = key.split(':').map(Number);

    fireEvent.pointerDown(hit(c), {
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX: x * CELL_PX + 5,
        clientY: y * CELL_PX + 5,
    });
}

function dragTo(key: string) {
    const [x, y] = key.split(':').map(Number);

    fireEvent.pointerMove(window, {
        pointerId: 1,
        clientX: x * CELL_PX + 5,
        clientY: y * CELL_PX + 5,
    });
}

const release = () => fireEvent.pointerUp(window, { pointerId: 1 });

const blockedCount = (c: HTMLElement) =>
    [
        ...(
            c.querySelector('path[data-blocked]')?.getAttribute('d') ?? ''
        ).matchAll(/h(\d+)v/g),
    ].reduce((n, m) => n + Number(m[1]) / UNIT, 0);

const enable = () =>
    fireEvent.click(
        screen.getByRole('switch', { name: 'battleSetup.map.enabled' })
    );

const typeIn = (label: string, value: string) => {
    const input = screen.getByLabelText(label);

    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
};

afterEach(cleanup);

describe('BattleFormMap', () => {
    it('off: no preview and value is null', () => {
        const { container } = render(<Harness />);

        expect(container.querySelector('svg[data-fx-grid]')).toBeNull();
        expect(seen.editor.state.value).toBeNull();
    });

    it('on: preview with 240 cells; top margin 2 blocks 40', () => {
        const { container } = render(<Harness />);

        enable();

        const grid = container.querySelector('svg[data-fx-grid]') as Element;

        expect(
            Number(grid.getAttribute('data-cols')) *
                Number(grid.getAttribute('data-rows'))
        ).toBe(240);

        typeIn('battleSetup.map.margins.top', '2');
        expect(blockedCount(container)).toBe(40);
    });

    it('palette: drag-paints blocked cells, erase clears them', () => {
        const { container } = render(<Harness />);

        enable();
        press(container, '3:3');
        dragTo('4:3');
        release();
        expect(blockedCount(container)).toBe(0);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.tools.blocked',
            })
        );
        press(container, '3:3');
        dragTo('4:3');
        release();
        expect(blockedCount(container)).toBe(2);

        fireEvent.click(
            screen.getByRole('button', { name: 'battleSetup.map.tools.erase' })
        );
        press(container, '3:3');
        release();
        expect(blockedCount(container)).toBe(1);
    });

    it('palette: wall and hazard with label and damage; no barrier option', () => {
        const { container } = render(<Harness />);

        enable();
        expect(screen.queryByRole('button', { name: /barrier/i })).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'battleSetup.map.tools.wall' })
        );
        press(container, '1:1');
        release();

        fireEvent.click(
            screen.getByRole('button', { name: 'battleSetup.map.tools.hazard' })
        );
        fireEvent.change(screen.getByLabelText('battleSetup.map.hazardLabel'), {
            target: { value: 'Лава' },
        });
        press(container, '2:1');
        release();

        fireEvent.change(screen.getByLabelText('battleSetup.map.hazardDice'), {
            target: { value: '' },
        });
        press(container, '3:1');
        release();

        expect(seen.editor.state.map.terrain).toEqual({
            '1:1': { kind: 'wall' },
            '2:1': {
                kind: 'hazard',
                label: 'Лава',
                damage: { dice: '1d6', type: 'fire' },
            },
            '3:1': { kind: 'hazard', label: 'Лава' },
        });
        expect(container.querySelector('[data-terrain="wall"]')).not.toBeNull();
        expect(
            container.querySelector('[data-terrain="hazard"]')
        ).not.toBeNull();
    });

    it('edge tools: wall, bars and erase paint map edges', () => {
        const { container } = render(<Harness />);

        enable();

        const edge = (key: string) => {
            const surface = container.querySelector(
                '[data-edge-surface]'
            ) as SVGRectElement;

            (surface.ownerSVGElement as SVGSVGElement).getScreenCTM = () =>
                ({
                    a: CELL_PX / UNIT,
                    b: 0,
                    c: 0,
                    d: CELL_PX / UNIT,
                    e: 0,
                    f: 0,
                }) as DOMMatrix;

            const [x, y] = key.split(':').map(Number);

            const init = {
                pointerId: 1,
                isPrimary: true,
                button: 0,
                clientX: (x + 1) * CELL_PX,
                clientY: y * CELL_PX + CELL_PX / 2,
            };

            fireEvent.pointerDown(surface, init);
            fireEvent.pointerUp(surface, init);
        };

        const pick = (name: string) =>
            fireEvent.click(
                screen.getByRole('button', {
                    name: `battleSetup.map.tools.${name}`,
                })
            );

        expect(container.querySelector('[data-edge-surface]')).toBeNull();

        pick('edge-wall');
        edge('1:2');
        expect(seen.editor.state.map.walls).toEqual(['1:2:e']);

        pick('edge-bars');
        edge('1:2');
        expect(seen.editor.state.map.walls).toBeUndefined();
        expect(seen.editor.state.map.bars).toEqual(['1:2:e']);

        pick('edge-erase');
        edge('1:2');
        expect(seen.editor.state.map.bars).toBeUndefined();
    });

    it('margins keep a 2x2 playable area; equal copies the first within limits', () => {
        render(<Harness />);
        enable();
        typeIn('battleSetup.map.margins.top', '99');
        expect(seen.editor.state.margins.top).toBe(10);

        typeIn('battleSetup.map.margins.bottom', '5');
        expect(seen.editor.state.margins.bottom).toBe(0);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.margins.equal',
            })
        );
        expect(seen.editor.state.margins).toEqual({
            top: 5,
            right: 5,
            bottom: 5,
            left: 5,
        });
    });

    it('колонки: стерти й набрати 24 — 24 після blur; стерти й blur — попереднє значення; Enter теж записує', () => {
        render(<Harness />);
        enable();

        const cols = screen.getByLabelText(
            'battleSetup.map.cols'
        ) as HTMLInputElement;

        fireEvent.change(cols, { target: { value: '' } });
        expect(cols.value).toBe('');
        expect(seen.editor.state.map.cols).toBe(20);

        fireEvent.change(cols, { target: { value: '2' } });
        fireEvent.change(cols, { target: { value: '24' } });
        expect(seen.editor.state.map.cols).toBe(20);
        fireEvent.blur(cols);
        expect(seen.editor.state.map.cols).toBe(24);

        fireEvent.change(cols, { target: { value: '' } });
        fireEvent.blur(cols);
        expect(seen.editor.state.map.cols).toBe(24);
        expect(cols.value).toBe('24');

        fireEvent.change(cols, { target: { value: '999' } });
        fireEvent.keyDown(cols, { key: 'Enter' });
        expect(seen.editor.state.map.cols).toBe(MAX_SIDE);
        expect(cols.value).toBe(String(MAX_SIDE));
    });

    it('«Розмір клітинки»: повзунок задає cols/rows за фоном і зберігає ширину фону в клітинках; ручні колонки скидають масштаб', () => {
        render(<Harness />);
        enable();

        const slider = screen.getByLabelText(
            /battleSetup\.map\.cellSize/
        ) as HTMLInputElement;

        expect(slider.value).toBe('100');

        fireEvent.change(slider, { target: { value: '50' } });
        expect(seen.editor.state.map).toMatchObject({
            cols: 40,
            rows: 24,
            backgroundCols: 39.6,
        });
        expect(
            screen.getByLabelText(/battleSetup\.map\.cellSize/).closest('div')
                ?.textContent
        ).toContain('"size":"50 px","cols":40,"rows":24');

        typeIn('battleSetup.map.cols', '20');
        expect(seen.editor.state.map.backgroundCols).toBeUndefined();
        expect(
            (
                screen.getByLabelText(
                    /battleSetup\.map\.cellSize/
                ) as HTMLInputElement
            ).value
        ).toBe('99');
    });

    it('«Зсув сітки»: зберігається частками клітинки, фон зсувається на −зсув клітинки', () => {
        const { container } = render(<Harness />);

        enable();
        fireEvent.change(screen.getByLabelText(/battleSetup\.map\.offsetX/), {
            target: { value: '0.5' },
        });
        fireEvent.change(screen.getByLabelText(/battleSetup\.map\.offsetY/), {
            target: { value: '0.25' },
        });
        expect(seen.editor.state.map.gridOffset).toEqual({ x: 0.5, y: 0.25 });

        const box = container.querySelector(
            '[data-map-background] > div'
        ) as HTMLElement;

        const cellPx = parseFloat(box.style.width) / 20;

        expect(parseFloat(box.style.left)).toBeCloseTo(-0.5 * cellPx);
        expect(parseFloat(box.style.top)).toBeCloseTo(-0.25 * cellPx);

        act(() =>
            seen.editor.actions.setBackground('data:image/webp;base64,AAAA')
        );
        expect(seen.editor.state.map.gridOffset).toBeUndefined();
    });

    it('default background button resets to null', () => {
        render(<Harness />);
        enable();
        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.defaultBackground',
            })
        );
        expect(seen.editor.state.map.background).toBeNull();
    });

    it('typed foreign url does not reach next/image; default background shown until saved', () => {
        const { container } = render(<Harness />);

        enable();
        act(() => seen.editor.actions.setBackground('h'));
        expect(
            container
                .querySelector('[data-background-layer=current] [data-bg]')
                ?.getAttribute('data-bg')
        ).toBe('/battle-maps/nicolas-tomb.webp');

        act(() =>
            seen.editor.actions.setBackground('https://evil.example/a.png')
        );
        expect(
            container
                .querySelector('[data-background-layer=current] [data-bg]')
                ?.getAttribute('data-bg')
        ).toBe('/battle-maps/nicolas-tomb.webp');

        act(() =>
            seen.editor.actions.setBackground('data:image/webp;base64,AAAA')
        );
        expect(
            container
                .querySelector('[data-background-layer=current] [data-bg]')
                ?.getAttribute('data-bg')
        ).toBe('data:image/webp;base64,AAAA');
    });

    it('blocked cells are tinted in the editor preview', () => {
        const { container } = render(<Harness />);

        enable();
        typeIn('battleSetup.map.margins.top', '1');
        expect(
            container.querySelector('path[data-blocked]')?.getAttribute('fill')
        ).not.toBe('transparent');
    });

    it('motion panel sets and clears map.motion', () => {
        render(<Harness />);

        expect(
            screen.queryByRole('group', { name: 'battle.map.tools.motion' })
        ).toBeNull();
        enable();
        fireEvent.click(
            screen.getByRole('button', { name: 'battle.map.motion.axisY' })
        );
        expect(seen.editor.state.value?.motion).toEqual({
            axis: 'y',
            speed: 2.5,
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'battle.map.motion.fast' })
        );
        expect(seen.editor.state.value?.motion).toEqual({
            axis: 'y',
            speed: 5,
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'battle.map.motion.off' })
        );
        expect(seen.editor.state.value?.motion).toBeNull();
    });

    it('калібрування: обведення клітинки на зображенні задає сітку, нуджинг зсуває зсув', () => {
        render(<Harness />);
        enable();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.calibration.start',
            })
        );

        const surface = screen.getByTestId('calibration-surface');

        surface.getBoundingClientRect = () =>
            ({ left: 0, top: 0, width: 990, height: 600 }) as DOMRect;

        fireEvent.pointerDown(surface, {
            pointerId: 1,
            clientX: 100,
            clientY: 50,
        });
        fireEvent.pointerMove(surface, {
            pointerId: 1,
            buttons: 1,
            clientX: 200,
            clientY: 150,
        });
        expect(screen.getByTestId('calibration-draft')).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.calibration.apply',
            })
        );

        expect(screen.queryByTestId('calibration-surface')).toBeNull();
        expect(seen.editor.state.map).toMatchObject({
            cols: 10,
            rows: 6,
            backgroundCols: 9.9,
            backgroundRows: 6,
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.calibration.nudgeCell: battleSetup.map.calibration.right',
            })
        );
        expect(seen.editor.state.map.gridOffset?.x).toBeCloseTo(0.01 + 0);
    });
});
