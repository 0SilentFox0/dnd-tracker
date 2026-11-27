import { describe, expect, it } from 'vitest';

import { edgeSegment, edgesOfCell } from '../edge-keys';
import { connectedEdgePath } from '../edge-path';

describe('connectedEdgePath', () => {
    it('drops a perpendicular edge sampled at a vertex of a straight run', () => {
        expect(
            connectedEdgePath('square', ['0:1:s', '0:1:e', '1:1:s'])
        ).toEqual(['0:1:s', '1:1:s']);
    });

    it('drops several strays at the same vertex', () => {
        expect(
            connectedEdgePath('square', ['0:1:s', '0:1:e', '0:2:e', '1:1:s'])
        ).toEqual(['0:1:s', '1:1:s']);
    });

    it('keeps a real corner turn', () => {
        expect(
            connectedEdgePath('square', ['0:1:s', '0:1:e', '0:0:e'])
        ).toEqual(['0:1:s', '0:1:e', '0:0:e']);
    });

    it('ignores repeated edges', () => {
        expect(
            connectedEdgePath('square', ['0:1:s', '0:1:s', '1:1:s'])
        ).toEqual(['0:1:s', '1:1:s']);
    });

    it('keeps a hex chain', () => {
        const edges = edgesOfCell('hex', { x: 2, y: 2 });

        const verts = (e: string) =>
            edgeSegment('hex', e).map((p) => `${Math.round(p.x)},${Math.round(p.y)}`);

        const touch = (a: string, b: string) =>
            verts(a).some((v) => verts(b).includes(v));

        const [e1, e2] = edges.filter((e, i) => i === 0 || touch(edges[0], e));

        const e3 = edges.find((e) => e !== e1 && e !== e2 && touch(e2, e) && !touch(e1, e));

        expect(e3).toBeDefined();
        expect(connectedEdgePath('hex', [e1, e2, e3 as string])).toEqual([
            e1,
            e2,
            e3,
        ]);
    });
});
