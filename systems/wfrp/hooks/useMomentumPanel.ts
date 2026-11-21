'use client';

import { AttackType } from '@/lib/constants/battle';
import { isSystemActionPending, useBattleScene } from '@/lib/hooks/battle';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import {
    aimOp,
    defensiveOp,
    disengageOp,
    fleeOp,
    grappleOp,
    momentumOp,
    movementOp,
} from '@/systems/wfrp/api/battle';
import type { DefensiveSkill } from '@/systems/wfrp/rules/combat/defensive';
import {
    engagedFoes,
    engagementJournal,
    isSurrounded,
} from '@/systems/wfrp/rules/combat/engagement';
import {
    hasMomentum,
    type SecondAttackBlocker,
    secondAttackBlocker,
} from '@/systems/wfrp/rules/combat/momentum';
import { editionOf } from '@/systems/wfrp/rules/edition';
import { wfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

export interface MomentumPanel {
    holds: boolean;
    canDisengage: boolean;
    disengage(roll?: number): void;
    blocker: SecondAttackBlocker | null;
    allies: { id: string; name: string }[];
    canRun: boolean;
    canSprint: boolean;
    canCharge: boolean;
    chargeTargets: { id: string; name: string }[];
    canAim: boolean;
    aimTargets: { id: string; name: string }[];
    aim(targetId: string): void;
    canDefend: boolean;
    defend(skill: DefensiveSkill): void;
    canFlee: boolean;
    flee(): void;
    canGrapple: boolean;
    grapple(choice: 'damage' | 'entangle' | 'free', roll?: number): void;
    run(): void;
    sprint(roll?: number): void;
    charge(targetId: string): void;
    secondAttack(): void;
    leadership(allyId: string, roll?: number): void;
    isPending: boolean;
}

/** Null unless it is the hero's turn in an edition that keeps Momentum per participant and something is available. */
export function useMomentumPanel(
    hero: BattleParticipant
): MomentumPanel | null {
    const { battle, turn, actions } = useBattleScene();

    if (
        editionOf(battle.rules).momentumModel !== 'participant' ||
        turn.current?.basicInfo.id !== hero.basicInfo.id
    )
        return null;

    const participantId = hero.basicInfo.id;

    const holds = hasMomentum(hero);

    const foes = engagedFoes(
        hero,
        battle.initiativeOrder,
        battle.map,
        engagementJournal(battle.rules)
    );

    const canDisengage =
        foes.length > 0 &&
        !isSurrounded(foes) &&
        (holds || !hero.actionFlags.hasUsedAction);

    const freeMove = !wfrpState(hero).moveMode;

    const canSprint = freeMove && !hero.actionFlags.hasUsedAction;

    const canCharge =
        freeMove &&
        foes.length === 0 &&
        !hero.battleData.movementUsed &&
        !hero.actionFlags.hasUsedAction;

    const canAim =
        editionOf(battle.rules).actionsModel === 'canon' &&
        !hero.actionFlags.hasUsedAction &&
        (hero.battleData.attacks ?? []).some(
            (a) => attackKindOf(a.type) === AttackType.RANGED
        );

    const canon = editionOf(battle.rules).actionsModel === 'canon';

    const canDefend = canon && !hero.actionFlags.hasUsedAction;

    const canFlee = canon && freeMove && foes.length > 0;

    const canGrapple =
        canon &&
        !hero.actionFlags.hasUsedAction &&
        wfrpState(hero).grapple !== undefined;

    if (
        !holds &&
        !canDisengage &&
        !freeMove &&
        !canAim &&
        !canDefend &&
        !canGrapple
    )
        return null;

    return {
        holds,
        canDisengage,
        disengage: (roll) =>
            actions.system.mutate(
                disengageOp({
                    participantId,
                    ...(roll === undefined ? { serverRoll: true } : { roll }),
                })
            ),
        blocker: secondAttackBlocker(hero, battle.rules),
        allies: battle.initiativeOrder
            .filter(
                (p) =>
                    p.basicInfo.id !== participantId &&
                    p.basicInfo.side === hero.basicInfo.side &&
                    isActive(p)
            )
            .map((p) => ({ id: p.basicInfo.id, name: p.basicInfo.name })),
        canRun: freeMove,
        canSprint,
        canCharge,
        chargeTargets: canCharge
            ? battle.initiativeOrder
                  .filter(
                      (p) =>
                          p.basicInfo.side !== hero.basicInfo.side &&
                          isActive(p)
                  )
                  .map((p) => ({ id: p.basicInfo.id, name: p.basicInfo.name }))
            : [],
        canAim,
        aimTargets: canAim
            ? battle.initiativeOrder
                  .filter(
                      (p) =>
                          p.basicInfo.side !== hero.basicInfo.side &&
                          isActive(p)
                  )
                  .map((p) => ({ id: p.basicInfo.id, name: p.basicInfo.name }))
            : [],
        aim: (targetId) =>
            actions.system.mutate(aimOp({ participantId, targetId })),
        canDefend,
        defend: (skill) =>
            actions.system.mutate(defensiveOp({ participantId, skill })),
        canFlee,
        flee: () => actions.system.mutate(fleeOp(participantId)),
        canGrapple,
        grapple: (choice, roll) =>
            actions.system.mutate(
                grappleOp({
                    participantId,
                    choice,
                    ...(roll === undefined ? { serverRoll: true } : { roll }),
                })
            ),
        run: () =>
            actions.system.mutate(movementOp({ kind: 'run', participantId })),
        sprint: (roll) =>
            actions.system.mutate(
                movementOp({
                    kind: 'sprint',
                    participantId,
                    ...(roll === undefined ? { serverRoll: true } : { roll }),
                })
            ),
        charge: (targetId) =>
            actions.system.mutate(
                movementOp({ kind: 'charge', participantId, targetId })
            ),
        secondAttack: () =>
            actions.system.mutate(
                momentumOp({ mode: 'secondAttack', participantId })
            ),
        leadership: (allyId, roll) =>
            actions.system.mutate(
                momentumOp({
                    mode: 'leadership',
                    participantId,
                    allyId,
                    ...(roll === undefined ? { serverRoll: true } : { roll }),
                })
            ),
        isPending:
            isSystemActionPending(actions.system, 'momentum') ||
            isSystemActionPending(actions.system, 'disengage') ||
            isSystemActionPending(actions.system, 'aim') ||
            isSystemActionPending(actions.system, 'defensive') ||
            isSystemActionPending(actions.system, 'flee') ||
            isSystemActionPending(actions.system, 'grapple') ||
            isSystemActionPending(actions.system, 'movement'),
    };
}
