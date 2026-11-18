import { describe, expect, it } from 'vitest';

import {
    fogHiddenIds,
    fogModeOf,
    withoutPosition,
} from '../participant-visibility';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const unit = (id: string, controlledBy: string, x: number): BattleParticipant =>
    ({
        basicInfo: {
            id,
            controlledBy,
            side: ParticipantSide.ALLY,
        } as BattleParticipant['basicInfo'],
        combatStats: {
            gridSize: 1,
            status: CombatStatus.ACTIVE,
        } as BattleParticipant['combatStats'],
        battleData: {
            position: { x, y: 2 },
            facing: 'n',
            turnStartPosition: { x, y: 2 },
            activeEffects: [],
        } as unknown as BattleParticipant['battleData'],
    }) as BattleParticipant;

const map: BattleMapConfig = {
    cols: 20,
    rows: 5,
    background: null,
    opacity: 1,
};

const vision = { mode: 'vision' as const, revealed: [], visionRadius: 3 };

describe('fogHiddenIds', () => {
    const all = [unit('hero', 'a', 1), unit('near', 'dm', 3), unit('far', 'dm', 15)];

    it('is empty when fog is off or there is no map', () => {
        expect(fogHiddenIds({ map }, all, ['a']).size).toBe(0);
        expect(fogHiddenIds({ map: null, fog: vision }, all, ['a']).size).toBe(0);
    });

    it('hides placed participants outside the viewer vision', () => {
        expect([...fogHiddenIds({ map, fog: vision }, all, ['a'])]).toEqual(['far']);
    });

    it('a participant is hidden only if no viewer sees it', () => {
        const both = [...all, unit('hero2', 'b', 15)];

        expect(fogHiddenIds({ map, fog: vision }, both, ['a', 'b']).size).toBe(0);
        expect([...fogHiddenIds({ map, fog: vision }, both, ['a'])]).toEqual(['far', 'hero2']);
    });

    it('a viewer with no units sees nothing but unplaced participants are not hidden', () => {
        const unplaced = unit('u', 'dm', 0);

        delete unplaced.battleData.position;

        expect([...fogHiddenIds({ map, fog: vision }, [unplaced, ...all], [null])].sort()).toEqual([
            'far',
            'hero',
            'near',
        ]);
    });

    it('maze maps ignore fog', () => {
        expect(fogModeOf({ map: { ...map, maze: {} } as BattleMapConfig, fog: vision })).toBe('off');
    });
});

describe('withoutPosition', () => {
    it('drops position, turn start and facing, keeping the rest', () => {
        const out = withoutPosition(unit('x', 'dm', 4));

        expect(out.battleData).toEqual({ activeEffects: [] });
    });

    it('returns the same object when nothing to drop', () => {
        const patch = { id: 'x', battleData: { dying: true as const } };

        expect(withoutPosition(patch)).toBe(patch);
    });
});
