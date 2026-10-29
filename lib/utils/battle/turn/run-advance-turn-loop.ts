import { berserkBonusOf, runBerserkTurn } from "./berserk";

import { SYSTEM_ACTOR } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { idleTurnIndex, isActive, sitsOutTurn, takesTurn } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { rollDyingAt } from "@/lib/utils/battle/death-saves";
import { pruneExpiredTerrain } from "@/lib/utils/battle/grid/terrain";
import { lineText, logFields } from "@/lib/utils/battle/log/lines";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
import { processStartOfRound } from "@/lib/utils/battle/turn/round-start";
import { processEndOfTurn } from "@/lib/utils/battle/turn/turn-end";
import { processStartOfTurn, type StartOfTurnResult } from "@/lib/utils/battle/turn/turn-start";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface AdvanceTurnLoopParams {
  initiativeOrder: BattleParticipant[];
  currentTurnIndex: number;
  currentRound: number;
  battleId: string;
  currentBattleLogLength: number;
  pendingSummons: BattleParticipant[];
  rng?: () => number;
  map?: BattleMapConfig | null;
  rules?: Ruleset;
}

export interface AdvanceTurnLoopResult {
  updatedInitiativeOrder: BattleParticipant[];
  nextTurnIndex: number;
  nextRound: number;
  newLogEntries: BattleAction[];
  clearedPendingSummons: boolean;
}


interface LoopState {
  order: BattleParticipant[];
  index: number;
  round: number;
  map: BattleMapConfig | null;
  log: BattleAction[];
  attempts: number;
  clearedPendingSummons: boolean;
}

interface LoopEnv {
  battleId: string;
  logBase: number;
  pendingSummons: BattleParticipant[];
  rng: () => number;
  rules?: Ruleset;
}

const stateBeforeForEntry = () => undefined;

function systemEntry(st: LoopState, env: LoopEnv, round: number, text: LogLine | LogLine[], tag: string): BattleAction {
  return {
    id: `${tag}-${round}-${Date.now()}-${st.attempts}`,
    battleId: env.battleId,
    round,
    actionIndex: env.logBase + st.log.length,
    timestamp: new Date(),
    ...SYSTEM_ACTOR,
    actionType: "ability",
    targets: [],
    actionDetails: {},
    ...logFields(text),
    hpChanges: [],
    isCancelled: false,
    stateBefore: stateBeforeForEntry(),
  };
}

function roundTransition(st: LoopState, env: LoopEnv, previousRound: number): void {
  const { rng } = env;

  const roundEnd = runAbilities(st.order, { type: "roundEnd" }, { round: previousRound, rng, map: st.map, rules: env.rules });

  st.order = roundEnd.participants;

  if (roundEnd.messages.length > 0) {
    st.log.push(systemEntry(st, env, previousRound, [textRef("battleLog.triggers.roundEnd", { round: previousRound }), ...roundEnd.messages], "triggers-round-end"));
  }

  st.clearedPendingSummons = true;

  if (st.map) st.map = pruneExpiredTerrain(st.map, st.round) ?? st.map;

  const roundResult = processStartOfRound(st.order, st.round, env.pendingSummons, rng, st.map, env.rules);

  st.order = roundResult.updatedInitiativeOrder;
  st.log.push(...roundResult.lairMessages.map((text) => systemEntry(st, env, st.round, text, "lair")));

  // індекс обрано за старим порядком; після пересортування раунд починається з початку
  st.index = 0;

  if (roundResult.triggerMessages.length > 0) {
    st.log.push(systemEntry(st, env, st.round, [textRef("battleLog.triggers.roundStart", { round: st.round }), ...roundResult.triggerMessages], "triggers-round"));
  }
}

function startTurnEntries(st: LoopState, env: LoopEnv, turnResult: StartOfTurnResult, before: BattleParticipant): void {
  const { participant } = turnResult;

  const actor = { actorId: participant.basicInfo.id, actorName: participant.basicInfo.name, actorSide: participant.basicInfo.side };

  const entry = (tag: string, fields: Pick<BattleAction, "actionType" | "actionDetails" | "hpChanges"> & Partial<Pick<BattleAction, "resultText" | "log">>): BattleAction => ({
    id: `${tag}-${st.index}-${Date.now()}-${st.attempts}`,
    battleId: env.battleId,
    round: st.round,
    actionIndex: env.logBase + st.log.length,
    timestamp: new Date(),
    ...actor,
    targets: [],
    isCancelled: false,
    stateBefore: stateBeforeForEntry(),
    resultText: "",
    ...fields,
  });

  if (turnResult.rechargeMessages.length > 0) {
    st.log.push(systemEntry(st, env, st.round, lineText(turnResult.rechargeMessages, "; "), "spell-recharge"));
  }

  // запис DOT закінчується до шкоди небезпеки — вона має власний запис
  const dotHpAfter = turnResult.hazard?.hpBefore ?? participant.combatStats.currentHp;

  if (turnResult.damageMessages.length > 0) {
    st.log.push(
      entry("turn", {
        actionType: "end_turn",
        actionDetails: { damageRolls: turnResult.damageMessages.map(() => ({ dice: "DOT", results: [], total: 0, damageType: "dot" })) },
        ...logFields(lineText(turnResult.damageMessages, "; ")),
        hpChanges: [
          {
            participantId: participant.basicInfo.id,
            participantName: participant.basicInfo.name,
            oldHp: before.combatStats.currentHp,
            newHp: dotHpAfter,
            change: before.combatStats.currentHp - dotHpAfter,
          },
        ],
      }),
    );
  }

  const hazard = turnResult.hazard;

  // кінцеве HP: після HoT і вмінь на кшталт lethalDamage → survive
  const hazardHpAfter = participant.combatStats.currentHp;

  if (hazard) {
    st.log.push(
      entry("hazard", {
        actionType: "ability",
        actionDetails: {
          hazard: { label: hazard.label, damageType: hazard.damageType, damage: hazard.damage },
          damageRolls: [{ dice: "", results: [], total: hazard.damage, damageType: hazard.damageType }],
        },
        ...logFields(hazard.message),
        hpChanges: [
          {
            participantId: participant.basicInfo.id,
            participantName: participant.basicInfo.name,
            oldHp: hazard.hpBefore,
            newHp: hazardHpAfter,
            change: hazard.hpBefore - hazardHpAfter,
          },
        ],
      }),
    );
  }

  if (turnResult.expiredEffects.length > 0) {
    st.log.push(
      entry("effects", {
        actionType: "ability",
        actionDetails: { appliedEffects: turnResult.expiredEffects.map((name) => ({ id: name, name, duration: 0 })) },
        ...logFields(textRef("battleLog.turn.effectsEndedCap", { names: turnResult.expiredEffects.join(", ") })),
        hpChanges: [],
      }),
    );
  }

  if (turnResult.abilityMessages.length > 0) {
    st.log.push(entry("triggers-turn", { actionType: "ability", actionDetails: {}, ...logFields([textRef("battleLog.triggers.turnStart"), ...turnResult.abilityMessages]), hpChanges: [] }));
  }
}

export function runAdvanceTurnLoop(
  params: AdvanceTurnLoopParams,
): AdvanceTurnLoopResult {
  const { initiativeOrder, currentTurnIndex, currentRound, battleId, currentBattleLogLength, pendingSummons, rng = Math.random } = params;

  const st: LoopState = { order: [...initiativeOrder], index: currentTurnIndex, round: currentRound, map: params.map ?? null, log: [], attempts: 0, clearedPendingSummons: false };

  const env: LoopEnv = { battleId, logBase: currentBattleLogLength, pendingSummons, rng, rules: params.rules };

  const reserve = reserveOf(pendingSummons);

  const verdict = (order: BattleParticipant[]) => checkVictoryConditions(order, reserve);

  let activeParticipantFound = false;

  const maxAttempts = initiativeOrder.length * 2;

  while (!activeParticipantFound && st.attempts < maxAttempts) {
    st.attempts++;

    const turnTransition = processEndOfTurn(st.index, st.order, st.round, { rules: params.rules, rng });

    if (turnTransition.participants) {
      st.order = turnTransition.participants;
      st.log.push(systemEntry(st, env, st.round, lineText(turnTransition.messages ?? [], "; "), "death-saves"));
    }

    const previousRound = st.round;

    st.index = turnTransition.nextTurnIndex;
    st.round = turnTransition.nextRound;

    if (st.round > previousRound) roundTransition(st, env, previousRound);

    let nextParticipant = st.order[st.index];

    if (!nextParticipant) break;

    const dyingRoll = st.round > previousRound ? rollDyingAt(st.order, st.index, params.rules, rng) : null;

    if (dyingRoll) {
      st.order = dyingRoll.participants;
      st.log.push(systemEntry(st, env, st.round, lineText(dyingRoll.messages, "; "), "death-saves"));

      nextParticipant = st.order[st.index];

      if (!isActive(nextParticipant)) continue;
    }

    if (sitsOutTurn(nextParticipant, st.round)) {
      // ніхто з живих не ходить цього раунду: зупиняємось на його початку, ходи пропустить клієнт/ДМ
      if (!st.order.some((p) => takesTurn(p, st.round))) {
        st.index = idleTurnIndex(st.order);

        break;
      }

      continue;
    }

    const turnResult = processStartOfTurn(nextParticipant, st.round, st.order, rng, st.map, params.rules);

    st.order = turnResult.participants;

    startTurnEntries(st, env, turnResult, nextParticipant);

    const beforeAuto = verdict(st.order);

    if (beforeAuto.result) break;

    // у очікуванні рішення ДМ автоматичні дії не виконуються; цикл лише шукає живого поточного
    if (beforeAuto.awaiting) {
      if (!st.order.some(isActive)) break;

      if (isActive(turnResult.participant)) activeParticipantFound = true;

      continue;
    }

    const berserkBonus = berserkBonusOf(nextParticipant);

    if (berserkBonus !== undefined && isActive(turnResult.participant)) {
      const berserk = runBerserkTurn({
        participants: st.order,
        participantId: turnResult.participant.basicInfo.id,
        restrictedBy: nextParticipant,
        bonusPercent: berserkBonus,
        round: st.round,
        battleId,
        actionIndex: currentBattleLogLength + st.log.length,
        rng,
        map: st.map,
        rules: params.rules,
      });

      st.order = berserk.participants;
      st.log.push(...berserk.actions.map((a, i) => ({ ...a, actionIndex: currentBattleLogLength + st.log.length + i, stateBefore: stateBeforeForEntry() })));

      if (verdict(st.order).result) break;

      continue;
    }

    if (isActive(turnResult.participant)) activeParticipantFound = true;

    if (verdict(st.order).result) break;
  }

  return {
    updatedInitiativeOrder: st.order,
    nextTurnIndex: st.index,
    nextRound: st.round,
    newLogEntries: st.log,
    clearedPendingSummons: st.clearedPendingSummons,
  };
}
