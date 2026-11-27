import { describe, expect, it } from 'vitest';

import {
    backgroundForSave,
    battleMapToLibraryInput,
    isFreshMap,
    showsBackground,
    withPlainGrid,
} from '../map-library';

import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

describe('battleMapToLibraryInput', () => {
    it('moves walls and bars out of the header and trims the name', () => {
        const map: BattleMapConfig = {
            ...DEFAULT_BATTLE_MAP,
            walls: ['a'],
            bars: ['b'],
            doors: { c: { open: false } } as BattleMapConfig['doors'],
        };

        const input = battleMapToLibraryInput(map, '  Cave ');

        expect(input.name).toBe('Cave');
        expect(input.walls).toEqual(['a']);
        expect(input.bars).toEqual(['b']);
        expect(input.map).not.toHaveProperty('walls');
        expect(input.map).not.toHaveProperty('bars');
        expect(input.map.doors).toEqual(map.doors);
    });

    it('defaults missing edges to empty lists', () => {
        const input = battleMapToLibraryInput({ ...DEFAULT_BATTLE_MAP }, 'x');

        expect(input.walls).toEqual([]);
        expect(input.bars).toEqual([]);
    });
});

describe('isFreshMap', () => {
    it('is true for the default map', () => {
        expect(isFreshMap({ ...DEFAULT_BATTLE_MAP })).toBe(true);
    });

    it.each([
        { cols: 30 },
        { background: '/battle-maps/a.png' },
        { walls: ['a'] },
        { blocked: ['1:1'] },
    ])('is false after a change %j', (patch) => {
        expect(isFreshMap({ ...DEFAULT_BATTLE_MAP, ...patch })).toBe(false);
    });
});

describe('plain grid', () => {
    it('withPlainGrid drops the image and marks the map', () => {
        const map = withPlainGrid({
            ...DEFAULT_BATTLE_MAP,
            background: '/x.webp',
        });

        expect(map.background).toBeNull();
        expect(map.plainGrid).toBe(true);
    });

    it('showsBackground falls back to the default image only for a non-plain null', () => {
        expect(showsBackground({ background: null }, true)).toBe(true);
        expect(showsBackground({ background: null }, false)).toBe(false);
        expect(
            showsBackground({ background: null, plainGrid: true }, true)
        ).toBe(false);
        expect(
            showsBackground({ background: '/a.png', plainGrid: true }, false)
        ).toBe(true);
    });

    it('backgroundForSave keeps a plain grid empty', () => {
        expect(backgroundForSave({ background: null })).toBe(
            '/battle-maps/nicolas-tomb.webp'
        );
        expect(
            backgroundForSave({ background: null, plainGrid: true })
        ).toBeNull();
        expect(backgroundForSave({ background: '/a.png' })).toBe('/a.png');
    });
});
