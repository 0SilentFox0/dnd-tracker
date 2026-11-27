import { describe, expect, it } from 'vitest';

import {
    buildDefs,
    parseBlocks,
    parseStampsCsv,
    renderStampsData,
    rowToDef,
} from '../csv';

const HEADER =
    'file,name,biome,category,layer,cols,rows,shadow,blocks,sight,prompt,priority';

const row = (over: Partial<Record<string, string>> = {}) => {
    const v = {
        file: 'tiles_altar.png',
        name: 'Altar',
        biome: 'dungeon',
        category: 'altar',
        layer: 'object',
        cols: '1',
        rows: '1',
        shadow: 'soft',
        blocks: 'rect:1x1',
        sight: '1',
        prompt: 'a stone altar',
        priority: '1',
        ...over,
    };

    return Object.values(v).join(',');
};

describe('parseStampsCsv', () => {
    it('handles quotes, commas and escaped quotes in prompt', () => {
        const [r] = parseStampsCsv(
            `${HEADER}\n${row({ prompt: '"a ""big"", old altar"' })}\n`
        );

        expect(r.prompt).toBe('a "big", old altar');
        expect(r.blocks).toEqual({ shape: 'rect', w: 1, h: 1 });
        expect(r.sight).toBe(true);
    });

    it('reports the line number for unknown biome and layer', () => {
        expect(() =>
            parseStampsCsv(`${HEADER}\n${row()}\n${row({ biome: 'moon' })}\n`)
        ).toThrow(/Line 3: Unknown biome/);
        expect(() =>
            parseStampsCsv(`${HEADER}\n${row({ layer: 'sky' })}\n`)
        ).toThrow(/Line 2: Unknown layer/);
    });
});

describe('sight without blocks', () => {
    it('is a row error', () => {
        expect(() =>
            parseStampsCsv(`${HEADER}\n${row({ blocks: '', sight: '1' })}\n`)
        ).toThrow(/Line 2: sight requires blocks/);
    });
});

describe('parseBlocks', () => {
    it('parses valid values', () => {
        expect(parseBlocks('')).toBeNull();
        expect(parseBlocks('rect:2x1')).toEqual({
            shape: 'rect',
            w: 2,
            h: 1,
        });
        expect(parseBlocks('ellipse:1.6x1.6')).toEqual({
            shape: 'ellipse',
            w: 1.6,
            h: 1.6,
        });
    });

    it('rejects invalid values', () => {
        for (const v of ['rect', 'box:1x1', 'rect:0x1', 'rect:2'])
            expect(() => parseBlocks(v)).toThrow();
    });
});

describe('rowToDef', () => {
    it('maps legacy tile files', () => {
        const [r] = parseStampsCsv(`${HEADER}\n${row()}\n`);

        expect(rowToDef(r)).toMatchObject({
            id: 'altar',
            file: '/assets/battle-tiles/objects/tiles_altar.png',
            nameKey: 'tileLabels.altar',
            sight: true,
        });
    });

    it('maps new webp files', () => {
        const [r] = parseStampsCsv(
            `${HEADER}\n${row({ file: 'mossy-altar.webp', blocks: '', sight: '' })}\n`
        );

        const def = rowToDef(r);

        expect(def).toMatchObject({
            id: 'mossy-altar',
            file: '/assets/map-stamps/dungeon/mossy-altar.webp',
            nameKey: 'mapStamps.name.mossy-altar',
        });
        expect(def.blocks).toBeUndefined();
        expect(def.sight).toBeUndefined();
    });
});

describe('buildDefs / renderStampsData', () => {
    it('drops rows without a file and renders deterministically', () => {
        const rows = parseStampsCsv(`${HEADER}\n${row()}\n`);

        expect(buildDefs(rows, () => false)).toEqual([]);

        const defs = buildDefs(rows, () => true);

        expect(renderStampsData(defs)).toBe(renderStampsData(defs));
        expect(renderStampsData(defs)).toContain("id: 'altar',");
    });
});
