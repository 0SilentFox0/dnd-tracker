import { runAfterAttack } from './after-attack';
import { holdBackNewEffects, restoreHeldBack } from './hold-back';
import {
    type AttackRequest,
    requestedTargetIds,
    validateAttackRequest,
} from './request';
import { damageDiceCursor, damageFractions, strikeRoll } from './strike-rolls';
import { resolveAttackTargets } from './targets';

import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { findFlagsMany } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    findParticipant,
    isActive,
    mergeParticipants,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import type {
    Rng,
    SummonRequest,
} from '@/lib/utils/abilities/engine/core/types';
import { processAttack } from '@/lib/utils/battle/attack';
import { activeEffectIds } from '@/lib/utils/battle/attack/consume-effects';
import { counterStrike } from '@/lib/utils/battle/attack/counter-strike';
import { critDoublesDice } from '@/lib/utils/battle/attack/crit-dice';
import { nextChainTarget } from '@/lib/utils/battle/attack/process/chain';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type { CritPicker } from '@/lib/utils/battle/crit-choice/types';
import {
    damageDiceSlots,
    heroAttackDamageParts,
} from '@/lib/utils/battle/damage/hero-damage';
import { lineOfFire } from '@/lib/utils/battle/grid';
import { withLines } from '@/lib/utils/battle/log/lines';
import type { ProcessAttackResult } from '@/lib/utils/battle/types/attack-process';
import type { CastableSpell } from '@/lib/utils/battle/types/spell-process';
import { rollDie } from '@/lib/utils/common/dice';
import { rngOf } from '@/lib/utils/common/rng';
import { type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type {
    AfterAttackCtx,
    AfterAttackResult,
} from '@/lib/utils/rules/systems/types';
import type {
    ActiveEffect,
    BattleAction,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';

export type AttackPhaseInput = {
    battle: {
        initiativeOrder: BattleParticipant[];
        currentRound: number;
        currentTurnIndex: number;
    };
    data: AttackRequest;
    battleId: string;
    userId: string;
    isDM: boolean;
    rng?: Rng;
    serverRolls?: boolean;
    crit?: CritPicker;
    map?: BattleMapConfig | null;
    rules: Ruleset;
    hitSpells?: ReadonlyMap<string, CastableSpell>;
    sceneState?: SystemSlot;
};

export type AttackPhaseResult = {
    finalInitiativeOrder: BattleParticipant[];
    allBattleActions: BattleAction[];
    summons: SummonRequest[];
    sceneState?: SystemSlot;
};

interface PhaseCtx {
    input: AttackPhaseInput;
    request: ReturnType<typeof validateAttackRequest>;
    rng: Rng;
    dice: ReturnType<typeof damageDiceCursor>;
    expanded: boolean;
    effectsBeforeVolley: ReturnType<typeof activeEffectIds>;
}

interface PhaseState {
    order: BattleParticipant[];
    attacker: BattleParticipant;
    actions: BattleAction[];
    summons: SummonRequest[];
    heldBack: ActiveEffect[];
    sceneState?: SystemSlot;
}

interface StrikeOpts {
    serverRolled: boolean;
    multiplier?: number;
    cover: boolean;
}

const liveOf = (st: PhaseState, p: BattleParticipant) =>
    findParticipant(st.order, p.basicInfo.id) ?? p;

// d100: сервер сам вирішує влучання, а клієнт шле кубики на кожну ціль; пул, як у d20, — лише за влучання.
// Пробний прогін записує rng, повторний програє запис, тож влучання збігаються.
export function runAttackPhase(input: AttackPhaseInput): AttackPhaseResult {
    const targets = requestedTargetIds(input.data).length;

    const pool = input.data.damageRolls;

    if (
        ruleSystemOf(input.rules).combat.judge === 'client' ||
        targets < 2 ||
        pool.length === 0 ||
        pool.length % targets !== 0
    )
        return runPhase(input);

    const source = rngOf(input);

    const tape: number[] = [];

    const dry = runPhase({
        ...input,
        crit: undefined,
        rng: () => tape[tape.push(source()) - 1],
    });

    const hits = dry.allBattleActions.filter(
        (a) => a.actionType === 'attack' && a.actionDetails.isHit
    ).length;

    let at = 0;

    const replay = () => (at < tape.length ? tape[at++] : source());

    return runPhase({
        ...input,
        rng: replay,
        data: {
            ...input.data,
            damageRolls: pool.slice(0, (hits * pool.length) / targets),
        },
    });
}

function runPhase(input: AttackPhaseInput): AttackPhaseResult {
    const { battle, data, isDM, userId } = input;

    const rng = rngOf(input);

    const initiativeOrder = battle.initiativeOrder;

    const request = validateAttackRequest(
        {
            participants: initiativeOrder,
            scene: { turnIndex: battle.currentTurnIndex },
            userId,
            isDM,
        },
        data,
        input.rules
    );

    const { attacker, attack, chosenTargets, targetIds } = request;

    const flags = findFlagsMany(
        withSelf(initiativeOrder, attacker),
        attacker.basicInfo.id,
        [
            'attackHitsAllEnemies',
            'piercingShot',
            'multiTargetFalloff',
            'chainShot',
        ]
    );

    const {
        targets,
        expanded,
        piercing,
        volley,
        falloff,
        serverRolledFrom,
        chain,
    } = resolveAttackTargets({
        order: initiativeOrder,
        attacker,
        attack,
        chosen: chosenTargets,
        targetIds,
        map: input.map,
        flags,
        rules: input.rules,
    });

    const fractions = damageFractions(targets, attack, { volley, falloff });

    const damageFormula =
        (volley && (targets.length > 1 || expanded)) || chain
            ? heroAttackDamageParts(attacker, attack).formula
            : null;

    const ctx: PhaseCtx = {
        input,
        request,
        rng,
        dice: damageDiceCursor(data.damageRolls, damageFormula, rng),
        expanded,
        effectsBeforeVolley: activeEffectIds([attacker]),
    };

    const st: PhaseState = {
        order: initiativeOrder,
        attacker: { ...attacker },
        actions: [],
        summons: [],
        heldBack: [],
        sceneState: input.sceneState,
    };

    const isRanged = attackKindOf(attack.type) === AttackType.RANGED;

    let firstHit = false;

    for (let i = 0; i < targets.length; i++) {
        // пробивний летить крізь цілі: штраф лише на першу
        const result = strikeAt(ctx, st, targets[i], i, {
            serverRolled: i >= serverRolledFrom,
            multiplier: targets.length > 1 ? fractions[i] : undefined,
            cover: isRanged && !(piercing && i > 0),
        });

        if (i === 0) firstHit = result.success;

        if (!isActive(st.attacker)) break;
    }

    if (chain && firstHit) runChain(ctx, st, targets[0], chain);

    return {
        finalInitiativeOrder: restoreHeldBack(
            st.order,
            attacker.basicInfo.id,
            st.heldBack
        ),
        allBattleActions: st.actions,
        summons: st.summons,
        sceneState: st.sceneState,
    };
}

function runChain(
    ctx: PhaseCtx,
    st: PhaseState,
    first: BattleParticipant,
    chain: { jumps: number; percent: number }
): void {
    const { attack } = ctx.request;

    const hit = new Set([first.basicInfo.id]);

    let from = liveOf(st, first);

    for (let jump = 1; jump <= chain.jumps && isActive(st.attacker); jump++) {
        const next = nextChainTarget({
            map: ctx.input.map,
            order: st.order,
            attacker: st.attacker,
            attack,
            from,
            hit,
            rules: ctx.input.rules,
        });

        if (!next) break;

        const result = strikeAt(ctx, st, next, jump, {
            serverRolled: true,
            multiplier: chain.percent ** jump,
            cover: false,
        });

        result.battleAction.actionDetails.chainFromId = from.basicInfo.id;
        hit.add(next.basicInfo.id);

        if (!result.success) break;

        from = liveOf(st, next);
    }
}

function rollStrike(
    ctx: PhaseCtx,
    target: BattleParticipant,
    i: number,
    opts: StrikeOpts
) {
    const { input, request, rng } = ctx;

    const { data } = input;

    const { attacker, attack, chosenTargets } = request;

    const chosenAt = ctx.expanded
        ? chosenTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id)
        : i;

    const sides = ruleSystemOf(input.rules).combat.dice;

    const serverD20 = input.serverRolls || opts.serverRolled || data.serverRoll;

    const strike = serverD20
        ? { value: rollDie(sides, rng), serverRolled: true }
        : strikeRoll(
              data,
              request,
              { index: i, chosenAt, expanded: ctx.expanded },
              rng,
              sides
          );

    const serverDamage = input.serverRolls
        ? damageDiceSlots(attacker, attack).map((sides) => rollDie(sides, rng))
        : null;

    const strikeDice = serverDamage
        ? { rolls: serverDamage, serverRolled: serverDamage }
        : ctx.dice.next();

    const second =
        serverD20 || sides !== 20
            ? undefined
            : (data.secondRolls?.[chosenAt] ??
              data.advantageRoll ??
              data.disadvantageRoll);

    return { strike, strikeDice, second };
}

function strikeAt(
    ctx: PhaseCtx,
    st: PhaseState,
    target: BattleParticipant,
    i: number,
    opts: StrikeOpts
): ProcessAttackResult {
    const { input, request, rng } = ctx;

    const { data, battle, battleId } = input;

    const { attack } = request;

    const { strike, strikeDice, second } = rollStrike(ctx, target, i, opts);

    const victim = liveOf(st, target);

    const obstacle =
        opts.cover &&
        lineOfFire(input.map, st.order, st.attacker, victim).blocked;

    const attackResult = processAttack({
        attacker: st.attacker,
        target: victim,
        attack,
        d20Roll: strike.value,
        advantageRoll: second,
        disadvantageRoll: second,
        rollMode: data.rollMode,
        inspiration: !!data.useInspiration && i === 0,
        actionSpent: i > 0,
        offHand: data.offHand,
        damageRolls: strikeDice.rolls,
        allParticipants: st.order,
        currentRound: battle.currentRound,
        battleId,
        damageMultiplier: opts.multiplier,
        obstacle,
        cunningStrike: i === 0 ? data.cunningStrike : undefined,
        system: i === 0 ? data.system : undefined,
        map: input.map,
        rules: input.rules,
        hitSpells: input.hitSpells,
        sceneState: st.sceneState,
        rng,
        crit: input.crit,
        recordDice: true,
        serverRolled: {
            d20: strike.serverRolled,
            ...(strikeDice.serverRolled && {
                damageFrom:
                    strikeDice.rolls.length - strikeDice.serverRolled.length,
            }),
        },
    });

    if (attackResult.success)
        ctx.dice.hit(
            critDoublesDice(input.rules, !!attackResult.attackRoll?.isCritical)
        );

    st.sceneState = attackResult.sceneState;
    st.order = mergeParticipants(
        st.order,
        attackResult.allParticipantsUpdated ?? []
    );
    st.attacker = attackResult.attackerUpdated;
    st.summons.push(...attackResult.summons);

    if (strikeDice.serverRolled && attackResult.success) {
        attackResult.battleAction = withLines(attackResult.battleAction, [
            textRef('battleLog.attack.serverDamageDice', {
                rolls: strikeDice.serverRolled.join(', '),
            }),
        ]);
    }

    st.actions.push(attackResult.battleAction);

    const strikeBack = counterStrikeOf(ctx, st, target, attackResult);

    const after = runAfterAttack(
        ruleSystemOf(input.rules).combat.afterAttack ?? [],
        {
            participants: st.order,
            attackerId: ctx.request.attacker.basicInfo.id,
            defenderId: target.basicInfo.id,
            criticalEffect: attackResult.criticalEffectApplied,
            first: i === 0,
            round: input.battle.currentRound,
            rules: input.rules,
            sceneState: st.sceneState,
            critFail: attackResult.attackRoll?.isCriticalFail,
            counterStrike: strikeBack,
        }
    );

    if (after) applyAfter(ctx, st, after);

    const held = holdBackNewEffects(
        st.order,
        st.attacker,
        ctx.effectsBeforeVolley
    );

    st.order = held.order;
    st.attacker = held.attacker;
    st.heldBack.push(...held.held);

    return attackResult;
}

function counterStrikeOf(
    ctx: PhaseCtx,
    st: PhaseState,
    target: BattleParticipant,
    attackResult: ProcessAttackResult
): AfterAttackCtx['counterStrike'] {
    const { input, request, rng } = ctx;

    return (provoked, from) => {
        const answer = counterStrike({
            participants: from?.participants ?? st.order,
            attackerId: request.attacker.basicInfo.id,
            defenderId: target.basicInfo.id,
            attack: request.attack,
            criticalEffect: attackResult.criticalEffectApplied,
            provoked,
            round: input.battle.currentRound,
            battleId: input.battleId,
            rng,
            crit: input.crit,
            map: input.map,
            rules: input.rules,
            sceneState: from ? from.sceneState : st.sceneState,
        });

        return (
            answer && {
                participants: answer.participants,
                actions: [answer.battleAction],
                sceneState: answer.sceneState,
            }
        );
    };
}

function applyAfter(
    ctx: PhaseCtx,
    st: PhaseState,
    result: AfterAttackResult
): void {
    st.sceneState = result.sceneState;
    st.order = mergeParticipants(st.order, result.participants);
    st.attacker =
        findParticipant(
            result.participants,
            ctx.request.attacker.basicInfo.id
        ) ?? st.attacker;
    st.actions.push(...result.actions);
}
