import { describe, expect, it } from 'vitest';

import {
    canAttackFromPool,
    canAttackWithBound,
    grantBoundAttacks,
} from '../attacks-left';
import { spendAttack as spend } from '../off-hand';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { validateAttackRequest } from '@/lib/utils/battle/attack-phase/request';
import { resetTurnState } from '@/lib/utils/battle/turn/turn-state';
import {
    PLAYER_VIEWER,
    redactParticipantsForViewer,
} from '@/lib/utils/battle/view';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const scimitar: BattleAttack = {
    id: 'item-1',
    name: 'Scimitar',
    type: AttackType.MELEE,
    attackBonus: 5,
    damageDice: '1d6',
    damageType: 'slashing',
};

const dagger: BattleAttack = { ...scimitar, id: 'item-2', name: 'Dagger' };

const grant = resolved(
    {
        trigger: { event: 'bonusAction' },
        effects: [{ kind: 'grantAction', itemAttacks: 1, target: 'self' }],
    },
    { type: 'artifact', id: 'item-1' }
);

const hero = (): BattleParticipant => {
    const p = makeParticipant({ id: 'h', abilities: [grant] });

    return {
        ...p,
        battleData: { ...p.battleData, attacks: [scimitar, dagger] },
    };
};

const spendAttack = (p: BattleParticipant, attack: BattleAttack) =>
    spend(p, [p], attack, DEFAULT_RULES);

const granted = (): BattleParticipant => {
    const p = hero();

    const r = runAbilities(
        [p],
        { type: 'bonusAction', actorId: 'h', abilityKey: grant.key },
        { rules: DEFAULT_RULES, round: 1, rng: seq(0.5) }
    );

    return r.participants[0];
};

const validate = (p: BattleParticipant, attackId: string): string => {
    const target = makeParticipant({ id: 't', side: ParticipantSide.ENEMY });

    try {
        validateAttackRequest(
            {
                userId: 'u',
                isDM: true,
                participants: [p, target],
                scene: { turnIndex: 0 },
            },
            {
                attackerId: 'h',
                targetId: 't',
                attackId,
                d20Roll: 10,
                damageRolls: [1],
            },
            DEFAULT_RULES
        );

        return 'ok';
    } catch (e) {
        return (e as { code?: string; message?: string }).message ?? String(e);
    }
};

const used = (p: BattleParticipant): BattleParticipant => ({
    ...p,
    actionFlags: { ...p.actionFlags, hasUsedAction: true },
});

describe('bound attacks', () => {
    it('grantAction itemAttacks records the source item', () => {
        expect(granted().battleData.boundAttacks).toEqual([
            { sourceId: 'item-1', left: 1 },
        ]);
    });

    it('is a no-op without an item source', () => {
        const generic = resolved(
            {
                trigger: { event: 'bonusAction' },
                effects: [
                    { kind: 'grantAction', itemAttacks: 1, target: 'self' },
                ],
            },
            { id: '' }
        );

        const p = makeParticipant({ id: 'h', abilities: [generic] });

        const r = runAbilities(
            [p],
            { type: 'bonusAction', actorId: 'h', abilityKey: generic.key },
            { rules: DEFAULT_RULES, round: 1, rng: seq(0.5) }
        );

        expect(r.participants[0].battleData.boundAttacks).toBeUndefined();
    });

    it('item attack after the main action spends the bound entry only', () => {
        const p = used(granted());

        expect(validate(p, 'item-1')).toBe('ok');

        const next = spendAttack(p, scimitar);

        expect(next.battleData.boundAttacks).toBeUndefined();
        expect(next.battleData.attacksLeft).toBeUndefined();
        expect(next.actionFlags.hasUsedAction).toBe(true);
    });

    it('another weapon is rejected when only bound attacks are left', () => {
        expect(validate(used(granted()), 'item-2')).toBe(
            'errors.boundAttackWeapon'
        );
    });

    it('without any bound attack the main action stays used', () => {
        expect(validate(used(hero()), 'item-1')).toBe('errors.actionUsed');
    });

    it('item attack before the main action keeps the action unspent', () => {
        const next = spendAttack(granted(), scimitar);

        expect(next.actionFlags.hasUsedAction).toBe(false);
        expect(next.battleData.boundAttacks).toBeUndefined();
    });

    it('is cleared at turn reset', () => {
        const p = granted();

        expect(
            resetTurnState(p, { rules: DEFAULT_RULES }).boundAttacks
        ).toBeUndefined();
    });

    it('counts as an attack left for the UI', () => {
        const p = used(granted());

        expect(canAttackFromPool(p)).toBe(true);
        expect(canAttackWithBound(p, scimitar)).toBe(true);
        expect(canAttackWithBound(p, dagger)).toBe(false);
    });

    it('stacks on an existing entry', () => {
        const p = grantBoundAttacks(
            grantBoundAttacks(hero(), 'item-1', 1),
            'item-1',
            1
        );

        expect(p.battleData.boundAttacks).toEqual([
            { sourceId: 'item-1', left: 2 },
        ]);
    });

    it('is hidden from other viewers of an enemy', () => {
        const enemy = {
            ...granted(),
            basicInfo: {
                ...granted().basicInfo,
                side: ParticipantSide.ENEMY,
                controlledBy: 'dm',
            },
        };

        const [p] = redactParticipantsForViewer(
            { ...PLAYER_VIEWER, userId: 'u1' },
            [enemy],
            DEFAULT_RULES
        );

        expect(p.battleData.boundAttacks).toBeUndefined();
    });
});
