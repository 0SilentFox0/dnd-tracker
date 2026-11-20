// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldLayerImages } from '../WorldLayerImages';

import type { WorldViewLayer } from '@/types/world';

vi.mock('next/image', () => ({
    default: (p: { alt: string; src: string }) => (
        <img alt={p.alt} src={p.src} />
    ),
}));

afterEach(cleanup);

const layer = (o: Partial<WorldViewLayer>): WorldViewLayer => ({
    id: 'l1',
    name: 'Sea',
    color: null,
    imageUrl: 'https://x/sea.webp',
    rect: { x: 0.1, y: 0.2, w: 0.5, h: 0.4 },
    opacity: 0.6,
    ...o,
});

describe('WorldLayerImages', () => {
    it('positions the image by rect and passes opacity', () => {
        render(
            <WorldLayerImages
                layers={[layer({})]}
                hidden={new Set()}
                width={800}
            />
        );

        const wrap = screen.getByTestId('world-layer-l1');

        expect(wrap.style.opacity).toBe('0.6');
        expect(wrap.style.left).toBe('10%');
        expect(wrap.style.width).toBe('50%');
        expect(screen.getByAltText('Sea')).toBeTruthy();
    });

    it('skips hidden layers and layers without an image', () => {
        render(
            <WorldLayerImages
                layers={[
                    layer({ id: 'a' }),
                    layer({ id: 'b', imageUrl: null }),
                    layer({ id: 'c' }),
                ]}
                hidden={new Set(['a'])}
                width={800}
            />
        );

        expect(screen.queryByTestId('world-layer-a')).toBeNull();
        expect(screen.queryByTestId('world-layer-b')).toBeNull();
        expect(screen.getByTestId('world-layer-c')).toBeTruthy();
    });

    it('renders in items order', () => {
        render(
            <WorldLayerImages
                layers={[layer({ id: 'first' }), layer({ id: 'second' })]}
                hidden={new Set()}
                width={800}
            />
        );

        const ids = screen
            .getAllByTestId(/^world-layer-/)
            .map((n) => n.dataset.testid);

        expect(ids).toEqual(['world-layer-first', 'world-layer-second']);
    });
});
