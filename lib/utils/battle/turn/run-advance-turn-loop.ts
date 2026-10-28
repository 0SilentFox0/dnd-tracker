import { berserkBonusOf, runBerserkTurn } from "./berserk";

import { SYSTEM_ACTOR } from "@/lib/constants/battle";
import { idleTurnIndex, isActive, sitsOutTurn, takesTurn } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { rollDyingAt } from "@/lib/utils/battle/death-saves";
import { pruneExpiredTerrain } from "@/lib/utils/battle/grid/terrain";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
import {
  processEndOfTurn,
  processStartOfRound,
  processStartOfTurn,
} from "@/lib/utils/battle/turn/start-end";
import { checkVictoryConditions } from "@/lib/utils/battle/turn/victory";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

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

export function runAdvanceTurnLoop(
  params: AdvanceTurnLoopParams,
): AdvanceTurnLoopResult {
  const {
    initiativeOrder,
    currentTurnIndex,
    currentRound,
    battleId,
    currentBattleLogLength,
    pendingSummons,
    rng = Math.random,
  } = params;

  let map = params.map ?? null;

  const reserve = reserveOf(pendingSummons);

  const verdict = (order: BattleParticipant[]) => checkVictoryConditions(order, reserve);

  let activeParticipantFound = false;

  let attempts = 0;

  const maxAttempts = initiativeOrder.length * 2;

  let updatedInitiativeOrder = [...initiativeOrder];

  let nextTurnIndex = currentTurnIndex;

  let nextRound = currentRound;

  const newLogEntries: BattleAction[] = [];

  const getStateBeforeForEntry = () => undefined;

  let clearedPendingSummons = false;

  const systemEntry = (round: number, text: string, tag: string): BattleAction => ({
    id: `${tag}-${round}-${Date.now()}-${attempts}`,
    battleId,
    round,
    actionIndex: currentBattleLogLength + newLogEntries.length,
    timestamp: new Date(),
    ...SYSTEM_ACTOR,
    actionType: "ability",
    targets: [],
    actionDetails: {},
    resultText: text,
    hpChanges: [],
    isCancelled: false,
    stateBefore: getStateBeforeForEntry(),
  });

  while (!activeParticipantFound && attempts < maxAttempts) {
    attempts++;

    const turnTransition = processEndOfTurn(
      nextTurnIndex,
      updatedInitiativeOrder,
      nextRound,
      { rules: params.rules, rng },
    );

    if (turnTransition.participants) {
      updatedInitiativeOrder = turnTransition.participants;
      newLogEntries.push(systemEntry(nextRound, turnTransition.messages?.join("; ") ?? "", "death-saves"));
    }

    const previousRound = nextRound;

    nextTurnIndex = turnTransition.nextTurnIndex;
    nextRound = turnTransition.nextRound;

    if (nextRound > previousRound) {
      const roundEnd = runAbilities(updatedInitiativeOrder, { type: "roundEnd" }, { round: previousRound, rng, map, rules: params.rules });

      updatedInitiativeOrder = roundEnd.participants;

      if (roundEnd.messages.length > 0) {
        newLogEntries.push(systemEntry(previousRound, `Кінець раунду ${previousRound}: ${roundEnd.messages.join("; ")}`, "triggers-round-end"));
      }

      clearedPendingSummons = true;

      if (map) map = pruneExpiredTerrain(map, nextRound) ?? map;

      const roundResult = processStartOfRound(
        updatedInitiativeOrder,
        nextRound,
        pendingSummons,
        rng,
        map,
        params.rules,
      );

      updatedInitiativeOrder = roundResult.updatedInitiativeOrder;

      // індекс обрано за старим порядком; після пересортування раунд починається з початку
      nextTurnIndex = 0;

      if (roundResult.triggerMessages.length > 0) {
        newLogEntries.push({
          id: `triggers-round-${nextRound}-${Date.now()}-${attempts}`,
          battleId,
          round: nextRound,
          actionIndex: currentBattleLogLength + newLogEntries.length,
          timestamp: new Date(),
          ...SYSTEM_ACTOR,
          actionType: "ability",
          targets: [],
          actionDetails: {},
          resultText: `Тригери початку раунду ${nextRound}: ${roundResult.triggerMessages.join("; ")}`,
          hpChanges: [],
          isCancelled: false,
          stateBefore: getStateBeforeForEntry(),
        });
      }
    }

    let nextParticipant = updatedInitiativeOrder[nextTurnIndex];

    if (!nextParticipant) break;

    const dyingRoll = nextRound > previousRound ? rollDyingAt(updatedInitiativeOrder, nextTurnIndex, params.rules, rng) : null;

    if (dyingRoll) {
      updatedInitiativeOrder = dyingRoll.participants;
      newLogEntries.push(systemEntry(nextRound, dyingRoll.messages.join("; "), "death-saves"));

      nextParticipant = updatedInitiativeOrder[nextTurnIndex];

      if (!isActive(nextParticipant)) continue;
    }

    if (sitsOutTurn(nextParticipant, nextRound)) {
      // ніхто з живих не ходить цього раунду: зупиняємось на його початку, ходи пропустить клієнт/ДМ
      if (!updatedInitiativeOrder.some((p) => takesTurn(p, nextRound))) {
        nextTurnIndex = idleTurnIndex(updatedInitiativeOrder);

        break;
      }

      continue;
    }

    const turnResult = processStartOfTurn(
      nextParticipant,
      nextRound,
      updatedInitiativeOrder,
      rng,
      map,
      params.rules,
    );

    updatedInitiativeOrder = turnResult.participants;

    // запис DOT закінчується до шкоди небезпеки — вона має власний запис
    const dotHpAfter = turnResult.hazard?.hpBefore ?? turnResult.participant.combatStats.currentHp;

    if (turnResult.damageMessages.length > 0) {
      newLogEntries.push({
        id: `turn-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: currentBattleLogLength + newLogEntries.length,
        timestamp: new Date(),
        actorId: turnResult.participant.basicInfo.id,
        actorName: turnResult.participant.basicInfo.name,
        actorSide: turnResult.participant.basicInfo.side,
        actionType: "end_turn",
        targets: [],
        actionDetails: {
          damageRolls: turnResult.damageMessages.map(() => ({
            dice: "DOT",
            results: [],
            total: 0,
            damageType: "dot",
          })),
        },
        resultText: turnResult.damageMessages.join("; "),
        hpChanges: [
          {
            participantId: turnResult.participant.basicInfo.id,
            participantName: turnResult.participant.basicInfo.name,
            oldHp: nextParticipant.combatStats.currentHp,
            newHp: dotHpAfter,
            change: nextParticipant.combatStats.currentHp - dotHpAfter,
          },
        ],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    const hazard = turnResult.hazard;

    // кінцеве HP: після HoT і вмінь на кшталт lethalDamage → survive
    const hazardHpAfter = turnResult.participant.combatStats.currentHp;

    if (hazard) {
      newLogEntries.push({
        id: `hazard-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: currentBattleLogLength + newLogEntries.length,
        timestamp: new Date(),
        actorId: turnResult.participant.basicInfo.id,
        actorName: turnResult.participant.basicInfo.name,
        actorSide: turnResult.participant.basicInfo.side,
        actionType: "ability",
        targets: [],
        actionDetails: {
          hazard: { label: hazard.label, damageType: hazard.damageType, damage: hazard.damage },
          damageRolls: [{ dice: "", results: [], total: hazard.damage, damageType: hazard.damageType }],
        },
        resultText: hazard.message,
        hpChanges: [
          {
            participantId: turnResult.participant.basicInfo.id,
            participantName: turnResult.participant.basicInfo.name,
            oldHp: hazard.hpBefore,
            newHp: hazardHpAfter,
            change: hazard.hpBefore - hazardHpAfter,
          },
        ],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    if (turnResult.expiredEffects.length > 0) {
      newLogEntries.push({
        id: `effects-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: currentBattleLogLength + newLogEntries.length,
        timestamp: new Date(),
        actorId: turnResult.participant.basicInfo.id,
        actorName: turnResult.participant.basicInfo.name,
        actorSide: turnResult.participant.basicInfo.side,
        actionType: "ability",
        targets: [],
        actionDetails: {
          appliedEffects: turnResult.expiredEffects.map((name) => ({
            id: name,
            name,
            duration: 0,
          })),
        },
        resultText: `Ефекти завершилися: ${turnResult.expiredEffects.join(", ")}`,
        hpChanges: [],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    if (turnResult.abilityMessages.length > 0) {
      newLogEntries.push({
        id: `triggers-turn-${nextTurnIndex}-${Date.now()}-${attempts}`,
        battleId,
        round: nextRound,
        actionIndex: currentBattleLogLength + newLogEntries.length,
        timestamp: new Date(),
        actorId: turnResult.participant.basicInfo.id,
        actorName: turnResult.participant.basicInfo.name,
        actorSide: turnResult.participant.basicInfo.side,
        actionType: "ability",
        targets: [],
        actionDetails: {},
        resultText: `Початок ходу: ${turnResult.abilityMessages.join("; ")}`,
        hpChanges: [],
        isCancelled: false,
        stateBefore: getStateBeforeForEntry(),
      });
    }

    const beforeAuto = verdict(updatedInitiativeOrder);

    if (beforeAuto.result) break;

    // у очікуванні рішення ДМ автоматичні дії не виконуються; цикл лише шукає живого поточного
    if (beforeAuto.awaiting) {
      if (!updatedInitiativeOrder.some(isActive)) break;

      if (isActive(turnResult.participant)) activeParticipantFound = true;

      continue;
    }

    const berserkBonus = berserkBonusOf(nextParticipant);

    if (berserkBonus !== undefined && isActive(turnResult.participant)) {
      const berserk = runBerserkTurn({
        participants: updatedInitiativeOrder,
        participantId: turnResult.participant.basicInfo.id,
        restrictedBy: nextParticipant,
        bonusPercent: berserkBonus,
        round: nextRound,
        battleId,
        actionIndex: currentBattleLogLength + newLogEntries.length,
        rng,
        map,
        rules: params.rules,
      });

      updatedInitiativeOrder = berserk.participants;
      newLogEntries.push(...berserk.actions.map((a, i) => ({ ...a, actionIndex: currentBattleLogLength + newLogEntries.length + i, stateBefore: getStateBeforeForEntry() })));

      if (verdict(updatedInitiativeOrder).result) break;

      continue;
    }

    if (isActive(turnResult.participant)) activeParticipantFound = true;

    if (verdict(updatedInitiativeOrder).result) break;
  }

  return {
    updatedInitiativeOrder,
    nextTurnIndex,
    nextRound,
    newLogEntries,
    clearedPendingSummons,
  };
}
