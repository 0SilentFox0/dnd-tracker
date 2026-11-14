import { describe, expect, it } from 'vitest';

import { mergeLibraryHeader } from '@/lib/utils/battle/map-storage/merge-header';
import type { BattleMapConfig } from '@/types/battle';

const base: BattleMapConfig = {
    cols: 10,
    rows: 10,
    background: null,
    opacity: 0.3,
};

describe('mergeLibraryHeader', () => {
    it('клітинка змінена лише в бою — лишається', () => {
        const out = mergeLibraryHeader(base, base, {
            ...base,
            terrain: { '1:1': { kind: 'hazard' } },
        });

        expect(out.terrain).toEqual({ '1:1': { kind: 'hazard' } });
    });

    it('клітинка змінена в бібліотеці — нова', () => {
        const out = mergeLibraryHeader(
            base,
            { ...base, terrain: { '1:1': { kind: 'difficult' } } },
            base
        );

        expect(out.terrain).toEqual({ '1:1': { kind: 'difficult' } });
    });

    it('змінена в обох — бібліотека', () => {
        const out = mergeLibraryHeader(
            { ...base, terrain: { '1:1': { kind: 'hazard' } } },
            { ...base, terrain: { '1:1': { kind: 'difficult' } } },
            { ...base, terrain: { '1:1': { kind: 'barrier' } } }
        );

        expect(out.terrain).toEqual({ '1:1': { kind: 'difficult' } });
    });

    it('зона заклинання лишається, навіть якщо бібліотека змінила клітинку', () => {
        const zone = { kind: 'hazard', zoneId: 'z', untilRound: 4 } as const;

        const out = mergeLibraryHeader(
            { ...base, terrain: { '1:1': { kind: 'hazard' } } },
            { ...base, terrain: { '1:1': { kind: 'difficult' } } },
            { ...base, terrain: { '1:1': zone } }
        );

        expect(out.terrain).toEqual({ '1:1': zone });
    });

    it('фон: змінений у бою і не в бібліотеці — бойовий; змінений у бібліотеці — новий', () => {
        expect(
            mergeLibraryHeader(base, base, {
                ...base,
                background: 'battle.png',
            }).background
        ).toBe('battle.png');
        expect(
            mergeLibraryHeader(base, { ...base, background: 'lib.png' }, base)
                .background
        ).toBe('lib.png');
    });

    it('weather, motion і spellZones завжди бойові', () => {
        const out = mergeLibraryHeader(
            base,
            { ...base, weather: 'snow' },
            { ...base, weather: 'rain', motion: 'wind' as never }
        );

        expect(out.weather).toBe('rain');
        expect(out.motion).toBe('wind');
    });

    it('walls/bars не потрапляють у шапку', () => {
        const out = mergeLibraryHeader(base, base, {
            ...base,
            walls: ['1:1:e'],
        });

        expect(out).not.toHaveProperty('walls');
    });
});
