// @vitest-environment happy-dom
import { renderToString } from 'react-dom/server';
import { act, cleanup, render } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { it, vi } from 'vitest';

import {
    DM_ID,
    ms,
    SIDES,
    stats,
    syntheticMap,
    syntheticParticipants,
} from './scenario';

import { BattleMap } from '@/components/battle/map';
import { TooltipProvider } from '@/components/ui/tooltip';
import { moveZoneMarks } from '@/lib/utils/battle/grid';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { BattleMapView } from '@/types/battle';

const RUNS = Number(process.env.SPIKE_RENDER_RUNS ?? 3);

// one side per process keeps happy-dom heap in check: SPIKE_SIDES=60,100
const SIDES_RUN = process.env.SPIKE_SIDES
    ? process.env.SPIKE_SIDES.split(',').map(Number)
    : SIDES;

class RO {
    constructor(private cb: (e: { contentRect: { width: number; height: number } }[]) => void) {}
    observe() {
        this.cb([{ contentRect: { width: 1280, height: 800 } }]);
    }
    disconnect() {}
    unobserve() {}
}

vi.stubGlobal('ResizeObserver', RO);

it('BattleMap render cost on synthetic maps', () => {
    const rows: Record<string, unknown>[] = [];

    for (const n of SIDES_RUN) {
        const map = syntheticMap(n);

        const participants = syntheticParticipants(map);

        const marks = moveZoneMarks(map, participants, participants[8], {
            rules: DEFAULT_RULES,
            dmUserId: DM_ID,
        });

        const actions = { onCellClick: () => {}, onCellHover: () => {} };

        const ui = (view?: BattleMapView) => (
            <TooltipProvider>
                <BattleMap map={map} participants={participants} view={view} actions={actions} />
            </TooltipProvider>
        );

        const mount: number[] = [];

        const remark: number[] = [];

        const hover: number[] = [];

        let dom = { elements: 0, polygons: 0, cellPolygons: 0, htmlKb: 0 };

        let domMarked = { elements: 0, polygons: 0 };

        for (let i = 0; i < RUNS; i++) {
            let t0 = performance.now();

            const r = render(ui({ currentId: 'p8' }));

            mount.push(performance.now() - t0);

            const c = r.container;

            dom = {
                elements: c.querySelectorAll('*').length,
                polygons: c.querySelectorAll('polygon').length,
                cellPolygons: c.querySelectorAll('[data-mark-cell]').length,
                htmlKb: Math.round(c.innerHTML.length / 1024),
            };

            t0 = performance.now();
            act(() => r.rerender(ui({ currentId: 'p8', marks })));
            remark.push(performance.now() - t0);

            domMarked = {
                elements: c.querySelectorAll('*').length,
                polygons: c.querySelectorAll('polygon').length,
            };

            // hover: the scene derives a fresh Map with the same content
            t0 = performance.now();
            act(() => r.rerender(ui({ currentId: 'p8', marks: new Map(marks) })));
            hover.push(performance.now() - t0);

            cleanup();
        }

        const ssr: number[] = [];

        let ssrKb = 0;

        for (let i = 0; i < RUNS; i++) {
            const t0 = performance.now();

            const html = renderToString(ui({ currentId: 'p8', marks }));

            ssr.push(performance.now() - t0);
            ssrKb = Math.round(html.length / 1024);
        }

        const row = {
            side: n,
            'DOM elements': dom.elements,
            polygons: dom.polygons,
            'cell polygons': dom.cellPolygons,
            'HTML KB': dom.htmlKb,
            'DOM with DM move zone': domMarked.elements,
            'polygons with zone': domMarked.polygons,
            'mount (ms)': ms(stats(mount).median),
            'move zone rerender (ms)': ms(stats(remark).median),
            'hover rerender (ms)': ms(stats(hover).median),
            'SSR (ms)': ms(stats(ssr).median),
            'SSR KB': ssrKb,
        };

        console.log(JSON.stringify(row));
        rows.push(row);
    }

    console.table(rows);

    if (process.env.SPIKE_OUT)
        writeFileSync(`${process.env.SPIKE_OUT}/render-${SIDES_RUN.join('-')}.json`, JSON.stringify(rows, null, 2));
}, 900_000);
