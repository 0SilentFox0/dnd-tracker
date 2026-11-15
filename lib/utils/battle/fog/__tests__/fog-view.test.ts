import { describe, expect, it } from 'vitest';

import { fogView } from '../fog-view';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import type { BattleMapConfig, BattleParticipant } from '@/types/battle';

const participant = (id: string, controlledBy: string, x: number): BattleParticipant =>
    ({
        basicInfo: { id, controlledBy, side: ParticipantSide.ALLY } as BattleParticipant['basicInfo'],
        combatStats: { gridSize: 1, status: CombatStatus.ACTIVE } as BattleParticipant['combatStats'],
        battleData: { position: { x, y: 2 } } as BattleParticipant['battleData'],
    }) as BattleParticipant;

const map: BattleMapConfig = {
    cols: 12,
    rows: 5,
    background: null,
    opacity: 1,
};

describe('fog view', () => {
    it('lets the DM see all and limits players to owned heroes and visible opponents', () => {
        const participants = [participant('hero', 'player-a', 2), participant('enemy', 'dm', 3), participant('far', 'dm', 10)];

        const common = { map, participants, mode: 'vision' as const, revealed: [], radius: 2 };

        expect(fogView({ ...common, viewerId: 'dm', isDM: true }).visibleIds.size).toBe(3);

        const player = fogView({ ...common, viewerId: 'player-a', isDM: false });

        expect(player.visibleIds.has('hero')).toBe(true);
        expect(player.visibleIds.has('enemy')).toBe(true);
        expect(player.visibleIds.has('far')).toBe(false);
    });

    it('bypasses fog for maze maps and respects revealed runs', () => {
        const participants = [participant('hero', 'player-a', 1), participant('far', 'dm', 10)];

        expect(
            fogView({ map: { ...map, maze: {} as never }, participants, mode: 'vision', viewerId: 'player-a', isDM: false, revealed: [], radius: 2 }).visibleIds.size
        ).toBe(2);

        const reveal = fogView({ map, participants, mode: 'reveal', viewerId: 'player-a', isDM: false, revealed: [[2, 9, 12]], radius: 2 });

        expect(reveal.visible.has('10:2')).toBe(true);
        expect(reveal.visibleIds.has('far')).toBe(true);
    });

    it('does not use reserved or fallen heroes as viewpoints and hides hidden opponents', () => {
        const hero = participant('hero', 'player-a', 1);

        const fallen = {
            ...participant('fallen', 'player-a', 8),
            combatStats: { gridSize: 1, status: CombatStatus.DEAD },
        } as BattleParticipant;

        const reserve = {
            ...participant('reserve', 'player-a', 8),
            battleData: { position: { x: 8, y: 2 }, reserved: true },
        } as BattleParticipant;

        const hiddenEnemy = {
            ...participant('hidden', 'dm', 1),
            battleData: {
                position: { x: 1, y: 2 },
                activeEffects: [{ effects: [{ type: 'hidden' }] }],
            },
        } as BattleParticipant;

        const result = fogView({
            map,
            participants: [hero, fallen, reserve, hiddenEnemy],
            mode: 'vision',
            viewerId: 'player-a',
            isDM: false,
            revealed: [],
            radius: 4,
        });

        expect(result.visible.has('8:2')).toBe(false);
        expect(result.visibleIds.has('reserve')).toBe(false);
        expect(result.visibleIds.has('fallen')).toBe(false);
        expect(result.visibleIds.has('hidden')).toBe(false);
    });
});
