import { describe, expect, it } from 'vitest';

import {
    battleMapSections,
    sectionOfTool,
} from '@/lib/utils/battle/grid/map-sections';

const base = {
    touch: false,
    hidesTerrain: false,
    hasModes: false,
    hasMotion: false,
};

const find = (f: typeof base, id: string) =>
    battleMapSections(f).find((s) => s.id === id);

describe('battleMapSections', () => {
    it('enables core sections and hides mode/motion by default', () => {
        const list = battleMapSections(base);

        expect(find(base, 'mode')?.status).toBe('hidden');
        expect(find(base, 'motion')?.status).toBe('hidden');
        expect(
            list
                .filter((s) => s.id !== 'mode' && s.id !== 'motion')
                .every((s) => s.status === 'enabled')
        ).toBe(true);
    });

    it('disables edges on touch but keeps cells', () => {
        const f = { ...base, touch: true };

        expect(find(f, 'edges')).toMatchObject({
            status: 'disabled',
            reason: 'edgesDesktopOnly',
        });
        expect(find(f, 'cells')?.status).toBe('enabled');
    });

    it('disables cells and edges when the mode hides terrain, ahead of touch', () => {
        const f = { ...base, touch: true, hidesTerrain: true };

        expect(find(f, 'cells')).toMatchObject({
            status: 'disabled',
            reason: 'edgesDisabledMode',
        });
        expect(find(f, 'edges')).toMatchObject({
            status: 'disabled',
            reason: 'edgesDisabledMode',
        });
    });

    it('enables mode and motion when available', () => {
        const f = { ...base, hasModes: true, hasMotion: true };

        expect(find(f, 'mode')?.status).toBe('enabled');
        expect(find(f, 'motion')?.status).toBe('enabled');
    });
});

describe('sectionOfTool', () => {
    it('maps tools to their section', () => {
        expect(sectionOfTool('edge-door')).toBe('edges');
        expect(sectionOfTool('hazard')).toBe('cells');
    });
});
