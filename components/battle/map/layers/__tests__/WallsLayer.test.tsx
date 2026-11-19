// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WallsLayer } from '../WallsLayer';

afterEach(cleanup);

const renderLayer = (map: Parameters<typeof WallsLayer>[0]['map']) =>
    render(
        <svg>
            <WallsLayer map={map} />
        </svg>
    );

describe('WallsLayer', () => {
    it('нічого не малює без стін і ґрат', () => {
        const { container } = renderLayer({});

        expect(container.querySelector('[data-map-edges]')).toBeNull();
    });

    it('стіни — прямокутники на ребрах, ґрати — лінії', () => {
        const { container } = renderLayer({
            walls: ['1:1:e', '2:0:s'],
            bars: ['3:3:e'],
        });

        expect(container.querySelectorAll('rect[data-map-wall]')).toHaveLength(
            2
        );

        const line = container.querySelector('line[data-map-bars="3:3:e"]');

        expect(line?.getAttribute('x1')).toBe('400');
        expect(line?.getAttribute('y1')).toBe('300');
        expect(line?.getAttribute('y2')).toBe('400');
    });
});
