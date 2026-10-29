import { autoXpEnabled, battleXpAward } from "./battle-xp";
import { originalSide } from "./original-side";

import { CombatStatus, ParticipantSide, SYSTEM_ACTOR } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { isActive, isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { clearDeathSaves } from "@/lib/utils/battle/death-saves";
import { logFields } from "@/lib/utils/battle/log/lines";
import type { Ruleset } from "@/lib/utils/rules";
import { BattleAction, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface VictoryCheckResult {
  isVictory: boolean;
  isDefeat: boolean;
  result: "victory" | "defeat" | null;
  awaiting: "victory" | "defeat" | null;
  message: LogLine;
}

/** Перевіряє умови перемоги. */
export function checkVictoryConditions(
  initiativeOrder: BattleParticipant[],
  reserve: BattleParticipant[] = [],
): VictoryCheckResult {
  const reserveHas = (side: ParticipantSide) => reserve.some((p) => p.basicInfo.side === side);

  // слот екстра-ходу — не окремий учасник
  const real = initiativeOrder.filter((p) => !p.basicInfo.isExtraTurnSlot && !p.battleData.object);

  const allies = real.filter((p) => originalSide(p) === ParticipantSide.ALLY);

  const enemies = real.filter((p) => originalSide(p) === ParticipantSide.ENEMY);

  const allEnemiesDefeated = enemies.every(
    (enemy) => enemy.combatStats.status === CombatStatus.DEAD || enemy.combatStats.status === CombatStatus.UNCONSCIOUS
  );

  const allAlliesDefeated = allies.every(
    (ally) => ally.combatStats.status === CombatStatus.DEAD || ally.combatStats.status === CombatStatus.UNCONSCIOUS
  );

  if (allEnemiesDefeated && enemies.length > 0) {
    if (reserveHas(ParticipantSide.ENEMY)) {
      return { isVictory: false, isDefeat: false, result: null, awaiting: "victory", message: textRef("battleLog.victory.reserveEnemies") };
    }

    return {
      isVictory: true,
      isDefeat: false,
      result: "victory",
      awaiting: null,
      message: textRef("battleLog.victory.won"),
    };
  }

  // escaped ставить лише режим карти (вихід), тож окремий прапорець режиму не потрібен
  if (allies.some(isEscaped) && !allies.some((a) => isActive(a) && !isEscaped(a))) {
    return { isVictory: false, isDefeat: false, result: null, awaiting: "victory", message: textRef("battleLog.victory.escaped") };
  }

  if (allAlliesDefeated && allies.length > 0) {
    if (reserveHas(ParticipantSide.ALLY)) {
      return { isVictory: false, isDefeat: false, result: null, awaiting: "defeat", message: textRef("battleLog.victory.reserveAllies") };
    }

    return {
      isVictory: false,
      isDefeat: true,
      result: "defeat",
      awaiting: null,
      message: textRef("battleLog.victory.lost"),
    };
  }

  return {
    isVictory: false,
    isDefeat: false,
    result: null,
    awaiting: null,
    message: "",
  };
}

const revivesOnVictory = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY && p.combatStats.status === CombatStatus.UNCONSCIOUS;

/** Завершує бій: знімає чари, при перемозі відроджує непритомних союзників. */
export function completeBattle(
  initiativeOrder: BattleParticipant[],
  result: "victory" | "defeat",
  currentRound: number,
  rules?: Ruleset,
): {
  updatedParticipants: BattleParticipant[];
  battleAction: BattleAction;
} {
  const reviveHp = (p: BattleParticipant) => (rules?.outOfCombat.persistResources ? 1 : p.combatStats.maxHp);

  const restored = initiativeOrder.map(restoreCharm);

  const revived = result === "victory" ? restored.filter(revivesOnVictory) : [];

  const updatedParticipants = restored.map((p) =>
    revived.includes(p) ? { ...clearDeathSaves(p), combatStats: { ...p.combatStats, currentHp: reviveHp(p), status: CombatStatus.ACTIVE } } : p,
  );

  const award = result === "victory" && autoXpEnabled(rules) ? battleXpAward(updatedParticipants) : null;

  const baseText = textRef(result === "victory" ? "battleLog.victory.completeWon" : "battleLog.victory.completeLost");

  const battleAction: BattleAction = {
    id: `battle-complete-${Date.now()}`,
    battleId: "",
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    ...SYSTEM_ACTOR,
    actionType: "end_turn",
    targets: [],
    actionDetails: { battleResult: result },
    ...logFields(award ? textRef("battleLog.victory.withXp", { text: baseText, share: award.share }) : baseText),
    hpChanges: revived.map((p) => ({
      participantId: p.basicInfo.id,
      participantName: p.basicInfo.name,
      oldHp: p.combatStats.currentHp,
      newHp: reviveHp(p),
      change: p.combatStats.currentHp - reviveHp(p),
    })),
    isCancelled: false,
  };

  return { updatedParticipants, battleAction };
}
