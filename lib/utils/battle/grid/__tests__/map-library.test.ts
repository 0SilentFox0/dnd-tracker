import { describe, expect, it } from 'vitest';

import { battleMapToLibraryInput, isFreshMap } from '../map-library';

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
