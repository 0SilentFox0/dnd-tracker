import { describe, expect, it } from 'vitest';

import type { StampRow } from '../csv';
import { sheetPrompt, sheetsOf, STAMP_STYLE_CORE } from '../prompts';

const mk = (
    i: number,
    biome: StampRow['biome'],
    priority: 1 | 2
): StampRow => ({
    file: `item-${i}.webp`,
    name: `Item ${i}`,
    biome,
    category: 'decor',
    layer: 'object',
    cols: 1,
    rows: 1,
    shadow: 'soft',
    blocks: null,
    sight: false,
    prompt: `a thing number ${i}.`,
    priority,
});

describe('sheetsOf', () => {
    const rows = [
        ...Array.from({ length: 11 }, (_, i) => mk(i, 'dungeon', 1)),
        mk(20, 'dungeon', 2),
        mk(30, 'nature', 1),
    ];

    it('groups by 9 within biome and priority keeping CSV order', () => {
        const sheets = sheetsOf(rows);

        expect(sheets.map((s) => [s.biome, s.priority, s.rows.length])).toEqual(
            [
                ['dungeon', 1, 9],
                ['dungeon', 1, 2],
                ['dungeon', 2, 1],
                ['nature', 1, 1],
            ]
        );
        expect(sheets[0].rows.map((r) => r.file)).toEqual(
            rows.slice(0, 9).map((r) => r.file)
        );
    });
});

describe('sheetPrompt', () => {
    const prompt = sheetPrompt(sheetsOf([mk(1, 'dungeon', 1)])[0]);

    it('carries the style rules', () => {
        expect(prompt).toContain('#FF00FF');
        expect(prompt).toContain('8%');
        expect(prompt).not.toContain('cast shadow');
        expect(STAMP_STYLE_CORE).not.toContain('cast shadow');
    });

    it('describes every object with its size', () => {
        expect(prompt).toContain('1. Item 1 (1x1 cells): a thing number 1.');
    });
});
