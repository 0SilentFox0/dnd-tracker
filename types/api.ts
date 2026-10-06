/**
 * Типи для API payloads та responses
 */

import type { GroupedSkillPayload } from "./hooks";
import type { SkillTriggers } from "./skill-triggers";

import type { SpellEnhancementType } from "@/lib/constants/spell-enhancement";

// Skills API
export type SkillPayload = GroupedSkillPayload;

export interface SkillUpdatePayload {
  basicInfo?: {
    name?: string;
    description?: string;
    icon?: string | null;
    races?: string[];
    isRacial?: boolean;
  };
  bonuses?: Record<string, number>;
  combatStats?: {
    damage?: number;
    armor?: number;
    speed?: number;
    physicalResistance?: number;
    magicalResistance?: number;
    affectsDamage?: boolean;
    damageType?: "melee" | "ranged" | "magic" | null;
  };
  spellData?: {
    spellId?: string | null;
    spellGroupId?: string | null;
  };
  spellEnhancementData?: {
    spellEnhancementTypes?: SpellEnhancementType[];
    spellEffectIncrease?: number | null;
    spellTargetChange?: { target: "enemies" | "allies" | "all" } | null;
    spellAdditionalModifier?: {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    } | null;
    spellNewSpellId?: string | null;
  };
  mainSkillData?: {
    mainSkillId?: string | null;
  };
  skillTriggers?: SkillTriggers;
}

// Battles API
import type { BattleAction,BattleParticipant, BattlePreparationParticipant } from "./battle";

export interface BattleScene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  status: "prepared" | "active" | "completed";
  participants: BattlePreparationParticipant[];
  currentRound: number;
  currentTurnIndex: number;
  initiativeOrder: BattleParticipant[];
  /** Призвані істоти (з’являться на початку наступного раунду) */
  pendingSummons?: BattleParticipant[];
  battleLog: BattleAction[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  campaign?: {
    id: string;
    friendlyFire: boolean;
  };
  userRole?: "dm" | "player";
  isDM?: boolean;
  version?: number;
  /** Журнал у цій відповіді — лише нові записи, які треба доклеїти до кешу */
  battleLogMode?: "append";
  /** Записи з actionIndex ≥ цього значення скасовано відкатом */
  battleLogCancelledFrom?: number;
  pendingMoraleCheck?: unknown;
}

export interface ClientBattleDelta {
  battleId: string;
  version: number;
  scene: {
    status: BattleScene["status"];
    round: number;
    turnIndex: number;
    pendingMoraleCheck: unknown;
    startedAt?: string;
    completedAt?: string;
  };
  upserted: BattleParticipant[];
  removed: string[];
  order?: string[];
  pending?: BattleParticipant[];
  setup?: BattlePreparationParticipant[];
  log: BattleAction[];
  cancelledFrom?: number;
}

export interface BattleRefetchSignal {
  battleId: string;
  version: number;
  refetch: true;
}

export interface BattleMutationResponse<R = Record<string, unknown>> {
  delta: ClientBattleDelta;
  response?: R;
}

export interface AttackData {
  attackerId: string;
  attackerType?: "character" | "unit";
  targetId?: string;
  targetIds?: string[];
  targetType?: "character" | "unit";
  attackRoll?: number;
  /** Один кидок на ціль (multi-target); якщо передано, використовується замість attackRoll */
  attackRolls?: number[];
  advantageRoll?: number;
  disadvantageRoll?: number;
  damageRolls: number[];
  attackId?: string;
  /** Урон відповіді цілі (контратака), для однієї цілі */
  reactionDamage?: number;
}

export interface MoraleCheckData {
  participantId: string;
  d10Roll: number;
}

export interface BonusActionData {
  participantId: string;
  abilityKey: string;
  targetParticipantId?: string;
}

export interface SpellCastData {
  casterId: string;
  casterType: string;
  spellId: string;
  targetIds: string[];
  damageRolls: number[];
  savingThrows?: Array<{ participantId: string; roll: number }>;
  additionalRollResult?: number;
  hitRoll?: number;
}

// Skill Trees API

