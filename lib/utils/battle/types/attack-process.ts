import type { AttackRollResult } from "./attack";
import type { CastableSpell } from "./spell-process";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface ProcessAttackParams {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  advantageRoll?: number;
  disadvantageRoll?: number;
  /** Вибір гравця; діє лише коли навички не задають перевагу/недолік */
  rollMode?: "normal" | "advantage" | "disadvantage";
  /** Натхнення дає перевагу цьому кидку */
  inspiration?: boolean;
  damageRolls: number[];
  allParticipants: BattleParticipant[];
  currentRound: number;
  battleId: string;
  damageMultiplier?: number;
  bonusPercent?: number;
  bonusLabel?: string;
  /** Наступні удари залпу: основну дію вже витратив перший удар */
  actionSpent?: boolean;
  /** Атака другою рукою: витрачає бонусну дію, а не дію/лічильник атак */
  offHand?: boolean;
  /** «Перешкода»: шкода влучання ×0.5 після всіх модифікаторів і опорів */
  obstacle?: boolean;
  rng?: () => number;
  crit?: CritPicker;
  /** Лише основна фаза атаки пише кубики в журнал (Шал та інші внутрішні удари — ні) */
  recordDice?: boolean;
  /** Що з кубиків докинув сервер: d20 і шкода від цього індексу */
  serverRolled?: { d20?: boolean; damageFrom?: number };
  map?: BattleMapConfig | null;
  rules?: Ruleset;
  /** Лише текст і зміни учасників: summons і зона закляття на влучання не застосовуються (зараз це Dark 1-3) */
  hitSpells?: ReadonlyMap<string, CastableSpell>;
}

export interface ProcessAttackResult {
  success: boolean;
  attackRoll: AttackRollResult;
  damage?: {
    totalDamage: number;
    finalDamage: number;
    breakdown: string[];
    resistanceBreakdown: string[];
    additionalDamageBreakdown: string[];
  };
  targetUpdated: BattleParticipant;
  attackerUpdated: BattleParticipant;
  allParticipantsUpdated?: BattleParticipant[];
  criticalEffectApplied?: CriticalEffect;
  battleAction: BattleAction;
  summons: SummonRequest[];
}
