import { describe, expect, it } from 'vitest';

import { wfrpAbilitiesOf } from '../../combat/participant';
import { applyWfrpConditionTo } from '../../conditions/apply';
import { trait } from '../../traits/__tests__/fixtures';
import { WFRP_TURN } from '..';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { runTurnHooks } from '@/lib/utils/battle/turn/hooks';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { BattleParticipant } from '@/types/battle';

const base = (id: string, side = ParticipantSide.ALLY): BattleParticipant => {
    const p = makeParticipant({ id, side, hp: 10, maxHp: 20 });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, {
                ap: { head: 0, arm: 0, body: 1, leg: 0 },
            }),
        },
    };
};

const bleeding = (p: BattleParticipant, levels: number) =>
    applyWfrpConditionTo(p, {
        key: 'bleeding',
        levels,
        round: 1,
        sourceName: textRef('battleWfrp.log.removed', {
            target: 'x',
            condition: 'y',
        }),
    }).participant;

const ctx = (
    participants: BattleParticipant[],
    id: string,
    rng: () => number
) => ({
    participants,
    id,
    round: 2,
    rng,
    rules: WFRP_RULES,
    applyDamage: applyDamageConsequences,
});

describe('WFRP_TURN', () => {
    it('onTurnStart ticks bleeding', () => {
        const p = bleeding(base('a'), 2);

        const r = runTurnHooks(
            WFRP_TURN.onTurnStart ?? [],
            ctx([p], 'a', () => 0.99)
        );

        expect(r.participants[0].combatStats.currentHp).toBe(8);
        expect(r.messages.length).toBeGreaterThan(0);
    });

    it('onSkippedTurn: unconscious skips with a line; bleeding out can kill', () => {
        const p = {
            ...bleeding(base('a'), 3),
            combatStats: {
                ...base('a').combatStats,
                currentHp: 0,
                status: CombatStatus.UNCONSCIOUS,
            },
        };

        const r = runTurnHooks(
            WFRP_TURN.onSkippedTurn ?? [],
            ctx([p], 'a', () => 0.1)
        );

        expect(r.skipTurn).toBe(true);
        expect(r.messages[0]).toMatchObject({
            message: 'battleLog.turn.skipUnconscious',
        });
        expect(r.participants[0].combatStats.status).toBe(CombatStatus.DEAD);
    });

    it('onSkippedTurn: an active participant is left alone', () => {
        const r = runTurnHooks(
            WFRP_TURN.onSkippedTurn ?? [],
            ctx([base('a')], 'a', () => 0)
        );

        expect(r.skipTurn).toBeUndefined();
        expect(r.messages).toEqual([]);
    });

    it('onJoin tests a newcomer against a frightening foe', () => {
        const fear = makeParticipant({
            id: 'm',
            side: ParticipantSide.ENEMY,
            abilities: [
                trait(
                    [{ kind: 'wfrpPsychology', psychology: 'fear', value: 1 }],
                    { key: 't-m' }
                ),
            ],
        });

        const r = runTurnHooks(WFRP_TURN.onJoin ?? [], {
            ...ctx([base('h'), fear], 'h', () => 0.9),
            newcomerIds: ['h', 'm'],
        });

        expect(r.testerIds).toEqual(['h']);
        expect(r.messages.length).toBeGreaterThan(0);
    });
});
