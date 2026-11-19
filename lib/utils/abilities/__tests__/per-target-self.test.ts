import { describe, expect, it } from 'vitest';

import { makeParticipant, resolved, seq } from './fixtures';

import { ParticipantSide } from '@/lib/constants/battle';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { AbilityEvent } from '@/types/abilities';
import type { BattleParticipant } from '@/types/battle';

const smite = resolved({
    trigger: { event: 'attack', phase: 'before', role: 'attacker' },
    condition: { type: 'targetCreatureType', types: ['construct'] },
    effects: [{ kind: 'modifyStat', stat: 'attackBonus', flat: 2, target: 'self' }],
});

const withType = (
    p: BattleParticipant,
    creatureType: string
): BattleParticipant => ({
    ...p,
    abilities: { ...p.abilities, creatureType },
});

const before: AbilityEvent = {
    type: 'attack',
    phase: 'before',
    actorId: 'a',
    targetId: 't',
    attackKind: 'melee',
};

const bonusFor = (attackerType: string, targetType: string) => {
    const r = runAbilities(
        [
            withType(
                makeParticipant({ id: 'a', abilities: [smite] }),
                attackerType
            ),
            withType(
                makeParticipant({ id: 't', side: ParticipantSide.ENEMY }),
                targetType
            ),
        ],
        before,
        { rules: DEFAULT_RULES, round: 1, rng: seq(0.5) }
    );

    return r.actionModifiers.a ?? [];
};

describe('per-target condition on a self-targeted effect', () => {
    it('applies against a matching target', () => {
        expect(bonusFor('humanoid', 'construct')).toHaveLength(1);
    });

    it('does not apply against another type', () => {
        expect(bonusFor('humanoid', 'humanoid')).toHaveLength(0);
    });

    it('ignores the attacker own type', () => {
        expect(bonusFor('construct', 'humanoid')).toHaveLength(0);
    });
});
