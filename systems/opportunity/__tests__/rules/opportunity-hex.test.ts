import { describe, expect, it } from 'vitest';

import { AttackType } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { resolveServerAttack } from '@/lib/utils/battle/attack/server-attack';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { resolveOpportunityAttacks } from '@/systems/opportunity/rules/opportunity';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const square: BattleMapConfig = {
    cols: 10,
    rows: 10,
    background: null,
    opacity: 0.3,
};

const hex: BattleMapConfig = { ...square, gridType: 'hex' };

const sword: BattleAttack = {
    id: 'sw',
    name: 'Sword',
    type: AttackType.MELEE,
    attackBonus: 5,
    damageDice: '1d8',
    damageType: 'slashing',
};

const mk = (
    id: string,
    side: 'ally' | 'enemy',
    x: number,
    y: number,
    attacks: BattleAttack[] = []
): BattleParticipant => {
    const base = createMockParticipant();

    return {
        ...base,
        basicInfo: {
            ...base.basicInfo,
            id,
            name: id,
            side: side as never,
            controlledBy: side === 'ally' ? 'user-1' : 'dm',
        },
        abilities: { ...base.abilities, damageModel: '5e' as const },
        combatStats: {
            ...base.combatStats,
            speed: 30,
            currentHp: 50,
            maxHp: 50,
        },
        battleData: { ...base.battleData, position: { x, y }, attacks },
    };
};

const rules = {
    ...DEFAULT_RULES,
    actions: { ...DEFAULT_RULES.actions, enabled: true },
};

// (1,0) -> (1,1): still adjacent to (0,0) on a square grid, two cells away on a hex grid
const provoked = (map: BattleMapConfig) =>
    resolveOpportunityAttacks({
        strike: resolveServerAttack,
        participants: [mk('m', 'ally', 1, 0), mk('e', 'enemy', 0, 0, [sword])],
        moverId: 'm',
        path: [{ x: 1, y: 1 }],
        start: { x: 1, y: 0 },
        map,
        round: 1,
        battleId: 'b1',
        rules,
        rng: () => 0.99,
    }).actions.length > 0;

describe('opportunity attacks on a hex grid', () => {
    it('leaving reach is measured in hex distance', () => {
        expect(provoked(square)).toBe(false);
        expect(provoked(hex)).toBe(true);
    });
});
