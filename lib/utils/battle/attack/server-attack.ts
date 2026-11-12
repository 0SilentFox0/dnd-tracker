import { buildOffTurnAction, type BuildOffTurnParams } from './process/actions';
import { resolveHit } from './process/hit';
import { spendRidersOnMiss } from './process/hit-rider';
import { activeEffectIds, consumeAttackEffects } from './consume-effects';
import { critDamageRolls, critDoublesDice } from './crit-dice';
import { applyCriticalEffect, critFlavorOf } from './critical';

import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import {
    type ActionFlow,
    appendHpChanges,
    getP,
    put,
} from '@/lib/utils/battle/common/action-flow';
import { heroAttackDamageParts } from '@/lib/utils/battle/damage/hero-damage';
import type { AttackRollResult } from '@/lib/utils/battle/types/attack';
import { parseDiceLenient, rollGroups } from '@/lib/utils/common/dice';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { BattleAction, BattleAttack } from '@/types/battle';
import type { TextRef } from '@/types/text';

export type ServerAttackLabel =
    | 'retaliation'
    | 'opportunity'
    | 'readied'
    | 'legendary';

const LABELS: Record<ServerAttackLabel, { title: TextRef; noun: TextRef }> = {
    retaliation: {
        title: textRef('battleLog.offTurn.titles.retaliation'),
        noun: textRef('battleLog.offTurn.nouns.retaliation'),
    },
    opportunity: {
        title: textRef('battleLog.offTurn.titles.opportunity'),
        noun: textRef('battleLog.offTurn.nouns.opportunity'),
    },
    readied: {
        title: textRef('battleLog.offTurn.titles.readied'),
        noun: textRef('battleLog.offTurn.nouns.readied'),
    },
    legendary: {
        title: textRef('battleLog.offTurn.titles.legendary'),
        noun: textRef('battleLog.offTurn.nouns.legendary'),
    },
};

export interface ServerAttackInput {
    flow: ActionFlow;
    attackerId: string;
    targetId: string;
    attack: BattleAttack;
    currentRound: number;
    battleId: string;
    rng: () => number;
    bonusPercent?: number;
    label: ServerAttackLabel;
}

function judgeServer(
    flow: ActionFlow,
    input: Pick<
        ServerAttackInput,
        'attackerId' | 'targetId' | 'attack' | 'rng' | 'label' | 'currentRound'
    >
): { roll: AttackRollResult; targetAC: number; isHit: boolean } {
    const { attackerId, targetId } = input;

    const r = ruleSystemOf(flow.ctx.rules).combat.resolveAttack({
        attacker: getP(flow, attackerId),
        target: getP(flow, targetId),
        attack: input.attack,
        participants: flow.ps,
        rules: flow.ctx.rules,
        rng: input.rng,
        sceneState: flow.sceneState,
        map: flow.ctx.map,
        crit: flow.ctx.crit,
        offTurn: { noun: LABELS[input.label].noun },
    });

    if (r.scene) flow.sceneState = r.scene;

    flow.messages.push(...r.lines);

    if (r.attackRoll.isCriticalFail && r.attackRoll.criticalEffect)
        put(
            flow,
            applyCriticalEffect(
                getP(flow, attackerId),
                r.attackRoll.criticalEffect,
                input.currentRound,
                { offTurn: true }
            )
        );

    return {
        roll: r.attackRoll,
        targetAC: r.defenseValue ?? 0,
        isHit: r.isHit,
    };
}

/** Мутує `flow.ps`; без дії та тригерів «перед/після атаки». */
export function resolveServerAttack(input: ServerAttackInput): {
    battleAction: BattleAction;
    hit: boolean;
    downed: boolean;
} {
    const {
        flow,
        attackerId,
        targetId,
        attack,
        currentRound: round,
        battleId,
        rng,
        label,
    } = input;

    const before = flow.ps;

    const existedBefore = activeEffectIds(before);

    const { roll, targetAC, isHit } = judgeServer(flow, input);

    let hit: BuildOffTurnParams['hit'] = null;

    if (isHit) {
        const formula = heroAttackDamageParts(
            getP(flow, attackerId),
            attack
        ).formula;

        const single = attack.noLevelDice
            ? []
            : rollGroups(parseDiceLenient(formula).groups, rng);

        const damageRolls = critDoublesDice(flow.ctx.rules, roll.isCritical)
            ? critDamageRolls({ formula, rolls: single, rng }).rolls
            : single;

        const { hitDamage } = resolveHit({
            flow,
            attackerId,
            targetId,
            attack,
            damageRolls,
            attackRoll: roll,
            currentRound: round,
            battleId,
            bonusPercent: input.bonusPercent,
            offTurn: true,
        });

        hit = { damageRolls, hitDamage };
    } else spendRidersOnMiss(flow, { attackerId, attack });

    const crit = roll.isCriticalFail
        ? roll.criticalEffect
        : hit?.hitDamage.criticalEffectApplied;

    const critFlavor = crit
        ? critFlavorOf(
              crit,
              getP(flow, attackerId).basicInfo.name,
              getP(flow, targetId).basicInfo.name,
              { battleId, round, attackerId, targetId, suffix: 'r' }
          )
        : undefined;

    const battleAction = buildOffTurnAction({
        retaliator: getP(flow, attackerId),
        target: getP(flow, targetId),
        attack,
        attackRoll: roll,
        targetAC,
        hit,
        messages: flow.messages,
        battleId,
        currentRound: round,
        critFlavor,
        title: LABELS[label].title,
        rules: flow.ctx.rules,
    });

    appendHpChanges(battleAction, before, flow.ps);

    flow.ps = consumeAttackEffects(flow.ps, {
        attackerId,
        targetId,
        hit: isHit,
        existedBefore,
    });

    return {
        battleAction,
        hit: isHit,
        downed: !isActive(getP(flow, targetId)),
    };
}
