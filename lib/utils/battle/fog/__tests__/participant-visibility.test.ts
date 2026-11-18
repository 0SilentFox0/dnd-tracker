import { describe, expect, it } from 'vitest';

import {
    fogHiddenForPlayers,
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

describe('fogHiddenForPlayers', () => {
    const foe = (id: string, x: number) => ({
        ...unit(id, 'dm', x),
        basicInfo: { ...unit(id, 'dm', x).basicInfo, side: ParticipantSide.ENEMY },
    });

    it('an enemy seen only by a teammate is visible to every player', () => {
        const all = [unit('h1', 'a', 1), unit('h2', 'b', 15), foe('e', 16)];

        expect(fogHiddenForPlayers({ map, fog: vision }, all).size).toBe(0);
    });

    it('a DM-controlled ally shares its vision with the players', () => {
        const all = [unit('h1', 'a', 1), unit('summon', 'dm', 15), foe('e', 16)];

        expect(fogHiddenForPlayers({ map, fog: vision }, all).size).toBe(0);
    });

    it('a downed hero stays known to its owner and allies; a fallen enemy is hidden', () => {
        const down = unit('h2', 'b', 15);

        down.combatStats.status = CombatStatus.DEAD;

        const dead = foe('e', 17);

        dead.combatStats.status = CombatStatus.DEAD;

        const hidden = fogHiddenForPlayers({ map, fog: vision }, [unit('h1', 'a', 1), down, dead]);

        expect([...hidden]).toEqual(['e']);
    });
});

describe('withoutPosition', () => {
    it('drops airborne.landAt but keeps the rest of the state', () => {
        const flyer = unit('f', 'dm', 4);

        flyer.battleData.airborne = {
            landAt: { x: 5, y: 5 },
            since: 1,
            percent: 50,
            name: 'x',
        };

        expect(withoutPosition(flyer).battleData.airborne).toEqual({
            since: 1,
            percent: 50,
            name: 'x',
        });
    });

    it('drops position, turn start and facing, keeping the rest', () => {
        const out = withoutPosition(unit('x', 'dm', 4));

        expect(out.battleData).toEqual({ activeEffects: [] });
    });

    it('returns the same object when nothing to drop', () => {
        const patch = { id: 'x', battleData: { dying: true as const } };

        expect(withoutPosition(patch)).toBe(patch);
    });
});
