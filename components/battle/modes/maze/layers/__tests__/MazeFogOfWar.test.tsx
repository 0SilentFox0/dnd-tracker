// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleMap } from '@/components/battle/map';
import { mockCanvas } from '@/components/battle/map/fog/__tests__/fog-canvas-mock';
import {
    hero,
    mazeMap,
    RO,
    viewOf,
} from '@/components/battle/modes/maze/__tests__/maze-fixtures';

const quality = vi.hoisted(() => ({
    value: 'live' as 'live' | 'still' | 'flat',
}));

vi.mock('@/lib/hooks/common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/hooks/common')>()),
    useFogQuality: () => quality.value,
}));

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    quality.value = 'live';
});

vi.stubGlobal('ResizeObserver', RO);

const map = mazeMap({
    walls: ['2:0:e', '2:1:e', '2:2:e', '2:3:e', '2:4:e', '2:5:e'],
});

const people = [hero('me', { x: 1, y: 2 }, 'e')];

describe('туман війни гравця', () => {
    it('чорна маска закриває все, крім клітинок поля зору', () => {
        const view = viewOf(map, people, 'player')!;

        const { container } = render(
            <BattleMap map={map} participants={people} view={{ mode: view }} />
        );

        const cover = container.querySelector(
            '[data-maze-fow]'
        ) as SVGRectElement;

        const id = cover.getAttribute('data-maze-fow')!;

        expect(cover.getAttribute('mask')).toBe(`url(#${id})`);
        expect(cover.getAttribute('fill')).toBe('#000');

        const mask = container.querySelector(
            `mask[id="${id}"]`
        ) as SVGMaskElement;

        const holes = [...mask.querySelectorAll('[data-maze-visible]')].map(
            (el) => el.getAttribute('data-maze-visible')
        );

        expect(new Set(holes)).toEqual(new Set(view.cells));
        expect(holes).toContain('1:2');
        expect(holes).not.toContain('4:2');
        expect(container.querySelector('[data-grid-hit]')).not.toBeNull();
    });

    it('покрив лежить над клітинками й під стінами, не перехоплює кліки', () => {
        const { container } = render(
            <BattleMap
                map={map}
                participants={people}
                view={{ mode: viewOf(map, people, 'player') }}
            />
        );

        const svg = container.querySelector('svg')!;

        const order = [
            ...svg.querySelectorAll(
                '[data-grid-hit], [data-maze-fow-layer], [data-maze-walls]'
            ),
        ];

        const fow = order.findIndex((el) =>
            el.hasAttribute('data-maze-fow-layer')
        );

        expect(
            order.findIndex((el) => el.hasAttribute('data-grid-hit'))
        ).toBeLessThan(fow);
        expect(
            order.findIndex((el) => el.hasAttribute('data-maze-walls'))
        ).toBeGreaterThan(fow);
        expect(
            container
                .querySelector('[data-maze-fow-layer]')
                ?.getAttribute('pointer-events')
        ).toBe('none');
    });

    it('ДМ і глядач — без туману війни', () => {
        const dm = render(
            <BattleMap
                map={map}
                participants={people}
                view={{ mode: viewOf(map, people, 'dm') }}
            />
        );

        expect(dm.container.querySelector('[data-maze-fow]')).toBeNull();
        dm.unmount();

        const spectator = render(
            <BattleMap
                map={map}
                participants={people}
                view={{ mode: viewOf(map, [], 'player') }}
            />
        );

        expect(spectator.container.querySelector('[data-maze-fow]')).toBeNull();
    });

    describe('хмарна текстура під маскою', () => {
        const renderFog = () => {
            mockCanvas();
            vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
                'data:image/png;base64,AA=='
            );

            return render(
                <BattleMap
                    map={map}
                    participants={people}
                    view={{ mode: viewOf(map, people, 'player') }}
                />
            );
        };

        it('live: зображення під тією самою маскою і повільний дрейф', () => {
            const { container } = renderFog();

            const cloud = container.querySelector('[data-maze-fow-cloud]')!;

            const cover = container.querySelector('[data-maze-fow]')!;

            expect(cloud.getAttribute('mask')).toBe(cover.getAttribute('mask'));
            expect(
                cloud.querySelector('image')?.getAttribute('href')
            ).toContain('data:image/png');
            expect(cloud.querySelector('animateTransform')).not.toBeNull();
        });

        it('still: статична хмара без анімації', () => {
            quality.value = 'still';

            const { container } = renderFog();

            expect(
                container.querySelector('[data-maze-fow-cloud]')
            ).not.toBeNull();
            expect(container.querySelector('animateTransform')).toBeNull();
        });

        it('flat: лише чорна маска, видимість не змінюється', () => {
            quality.value = 'flat';

            const { container } = renderFog();

            expect(container.querySelector('[data-maze-fow-cloud]')).toBeNull();
            expect(
                container.querySelectorAll('[data-maze-visible]').length
            ).toBeGreaterThan(0);
        });
    });
});
