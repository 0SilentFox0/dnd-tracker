import { describe, expect, it } from 'vitest';

import { pickCard } from '../pick-card';

const trail = { node: { x: 0.1, y: 0.2 }, content: 'trail' };

const marker = { point: { x: 0.3, y: 0.4 }, content: 'marker' };

describe('pickCard', () => {
    it('prefers the trail card over the marker card', () => {
        expect(pickCard({ trail, marker, isDesktop: true })).toEqual({
            point: trail.node,
            content: 'trail',
        });
    });

    it('falls back to the marker card', () => {
        expect(pickCard({ trail: null, marker, isDesktop: true })).toEqual({
            point: marker.point,
            content: 'marker',
        });
    });

    it('is undefined on mobile', () => {
        expect(pickCard({ trail, marker, isDesktop: false })).toBeUndefined();
    });

    it('is undefined without a marker point or any content', () => {
        expect(
            pickCard({
                marker: { point: null, content: 'x' },
                isDesktop: true,
            })
        ).toBeUndefined();
        expect(pickCard({ isDesktop: true })).toBeUndefined();
    });
});
