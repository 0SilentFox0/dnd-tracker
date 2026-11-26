// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BattleMapThumb } from '@/components/battle/list/BattleMapThumb';

afterEach(cleanup);

const map = {
    background: null,
    cols: 20,
    rows: 15,
    gridType: 'square' as const,
};

describe('BattleMapThumb', () => {
    it('no map: swords placeholder', () => {
        const { container } = render(<BattleMapThumb map={null} size="card" />);

        expect(container.querySelector('[data-empty="map"]')).toBeTruthy();
    });

    it('map without background: grid placeholder', () => {
        const { container } = render(<BattleMapThumb map={map} size="card" />);

        expect(
            container.querySelector('[data-empty="background"]')
        ).toBeTruthy();
    });

    it('background renders an image with the grid overlay', () => {
        const { container } = render(
            <BattleMapThumb
                map={{ ...map, background: '/battle-maps/a.webp' }}
                size="tile"
            />
        );

        expect(container.querySelector('img')).toBeTruthy();
        expect(
            container.querySelector('[style*="background-size"]')
        ).toBeTruthy();
    });

    it('hex map draws an svg pattern, row size draws no grid', () => {
        const hex = {
            ...map,
            background: '/battle-maps/a.webp',
            gridType: 'hex' as const,
        };

        expect(
            render(
                <BattleMapThumb map={hex} size="card" />
            ).container.querySelector('svg pattern')
        ).toBeTruthy();

        cleanup();

        expect(
            render(
                <BattleMapThumb map={hex} size="row" />
            ).container.querySelector('svg')
        ).toBeNull();
    });
});
