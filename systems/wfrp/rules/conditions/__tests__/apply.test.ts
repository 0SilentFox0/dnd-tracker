import { describe, expect, it } from 'vitest';

import { applyWfrpConditionTo, reduceWfrpCondition } from '../apply';

import { CombatStatus } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { withWfrpState } from '@/systems/wfrp/rules/state';

const src = textRef('battleWfrp.log.removed', { target: 'x', condition: 'y' });

describe('applyWfrpConditionTo unconscious', () => {
    it('second application is a no-op', () => {
        const first = applyWfrpConditionTo(
            makeParticipant({ id: 'a', hp: 7, maxHp: 20 }),
            { key: 'unconscious', round: 1, sourceName: src }
        );

        const second = applyWfrpConditionTo(first.participant, {
            key: 'unconscious',
            round: 2,
            sourceName: src,
        });

        expect(second.participant).toBe(first.participant);
        expect(second.messages).toEqual([]);
    });

    it('keeps HP and sets status', () => {
        const r = applyWfrpConditionTo(
            makeParticipant({ id: 'a', hp: 7, maxHp: 20 }),
            { key: 'unconscious', round: 1, sourceName: src }
        );

        expect(r.participant.combatStats.currentHp).toBe(7);
        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(r.messages).toHaveLength(1);
    });
});

describe('applyWfrpConditionTo unconscious repair', () => {
    it('condition present but status ACTIVE restores UNCONSCIOUS', () => {
        const first = applyWfrpConditionTo(
            makeParticipant({ id: 'a', hp: 7, maxHp: 20 }),
            { key: 'unconscious', round: 1, sourceName: src }
        ).participant;

        const woken = {
            ...first,
            combatStats: { ...first.combatStats, status: CombatStatus.ACTIVE },
        };

        const r = applyWfrpConditionTo(woken, {
            key: 'unconscious',
            round: 2,
            sourceName: src,
        });

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
        expect(r.messages).toHaveLength(1);
    });
});

describe('reduceWfrpCondition unconscious', () => {
    const downed = (outOfFight: boolean) => {
        const p = applyWfrpConditionTo(
            makeParticipant({ id: 'a', hp: 7, maxHp: 20 }),
            { key: 'unconscious', round: 1, sourceName: src }
        ).participant;

        return outOfFight ? withWfrpState(p, { outOfFight: true }) : p;
    };

    it('removing it wakes an ordinary fighter', () => {
        const r = reduceWfrpCondition(downed(false), 'unconscious', 'all');

        expect(r.participant.combatStats.status).toBe(CombatStatus.ACTIVE);
    });

    it('does not reactivate an out-of-fight participant', () => {
        const r = reduceWfrpCondition(downed(true), 'unconscious', 'all');

        expect(r.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    });
});
