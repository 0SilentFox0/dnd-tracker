import { describe, expect, it } from 'vitest';

import { applyLayerStyle } from '../marker-style';

import type { WorldMarker } from '@/types/world';

const marker = (over: Partial<WorldMarker> = {}): WorldMarker => ({
    id: 'm1',
    mapId: 'map',
    kind: 'point',
    x: 0.5,
    y: 0.5,
    polygon: null,
    name: 'M',
    icon: null,
    color: null,
    dmNote: null,
    description: null,
    alwaysVisible: false,
    sortOrder: 0,
    childMapId: null,
    layerId: 'l1',
    labelMode: null,
    fillOpacity: null,
    ...over,
});

const zone = (over: Partial<WorldMarker> = {}) =>
    marker({ kind: 'zone', ...over });

const layer = (over: Record<string, unknown> = {}) => ({
    id: 'l1',
    color: '#112233',
    icon: 'castle',
    zoneOpacity: 0.3,
    zoneLabels: 'auto' as const,
    ...over,
});

describe('applyLayerStyle', () => {
    it('inherits icon and color when the marker has none', () => {
        const [m] = applyLayerStyle([marker()], [layer()]);

        expect(m).toMatchObject({ icon: 'castle', color: '#112233' });
    });

    it('own values win over the layer', () => {
        const [m] = applyLayerStyle(
            [marker({ icon: 'city', color: '#ffffff' })],
            [layer()]
        );

        expect(m).toMatchObject({ icon: 'city', color: '#ffffff' });
    });

    it('a layer without icon or color leaves null', () => {
        const [m] = applyLayerStyle(
            [marker()],
            [layer({ icon: null, color: null })]
        );

        expect(m).toMatchObject({ icon: null, color: null });
    });

    it('a zone keeping its own color is not tinted by the layer', () => {
        const [z] = applyLayerStyle([zone({ color: '#d3b060' })], [layer()]);

        expect(z.color).toBe('#d3b060');
    });

    it('a zone inherits fillOpacity, own value wins, null stays null', () => {
        const out = applyLayerStyle(
            [zone(), zone({ id: 'z2', fillOpacity: 0.8 })],
            [layer()]
        );

        expect(out[0].fillOpacity).toBe(0.3);
        expect(out[1].fillOpacity).toBe(0.8);
        expect(
            applyLayerStyle([zone()], [layer({ zoneOpacity: null })])[0]
                .fillOpacity
        ).toBeNull();
    });

    it('a pin gets no labelMode or fillOpacity', () => {
        const [m] = applyLayerStyle(
            [marker()],
            [layer({ zoneLabels: 'hidden' })]
        );

        expect(m.labelMode).toBeNull();
        expect(m.fillOpacity).toBeNull();
    });

    it('zoneLabels hidden hides zones, a marker always wins', () => {
        const out = applyLayerStyle(
            [zone(), zone({ id: 'z2', labelMode: 'always' })],
            [layer({ zoneLabels: 'hidden' })]
        );

        expect(out[0].labelMode).toBe('hidden');
        expect(out[1].labelMode).toBe('always');
    });

    it('zoneLabels auto leaves labelMode null', () => {
        expect(applyLayerStyle([zone()], [layer()])[0].labelMode).toBeNull();
    });

    it('leaves markers without a known layer unchanged', () => {
        const a = marker({ layerId: null });

        const b = marker({ id: 'm2', layerId: 'gone' });

        const out = applyLayerStyle([a, b], [layer()]);

        expect(out[0]).toBe(a);
        expect(out[1]).toBe(b);
    });

    it('returns the same array for empty layers', () => {
        const input = [marker()];

        expect(applyLayerStyle(input, [])).toBe(input);
    });
});
