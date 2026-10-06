/**
 * Типи для API payloads та responses
 */

import type { GroupedSkillPayload } from "./hooks";

import { type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import { type CampaignRoleValue } from "@/lib/constants/campaigns";
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
}

// Battles API
import type { BattleAction,BattleParticipant, BattlePreparationParticipant } from "./battle";

import type { BattleKnowledge } from "@/lib/utils/battle/view/knowledge";

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
  userRole?: CampaignRoleValue;
  isDM?: boolean;
  version?: number;
  /** Журнал у цій відповіді — лише нові записи, які треба доклеїти до кешу */
  battleLogMode?: "append";
  /** Записи з actionIndex ≥ цього значення скасовано відкатом */
  battleLogCancelledFrom?: number;
  pendingMoraleCheck?: unknown;
  /** Підсумок знань про ціль з усіх атак бою (не лише з останніх записів журналу); лише для гравців */
  knowledge?: BattleKnowledge;
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
  attackerType?: ParticipantSourceTypeValue;
  targetId?: string;
  targetIds?: string[];
  targetType?: ParticipantSourceTypeValue;
  attackRoll?: number;
  /** Один кидок на ціль (multi-target); якщо передано, використовується замість attackRoll */
  attackRolls?: number[];
  advantageRoll?: number;
  disadvantageRoll?: number;
  damageRolls: number[];
  attackId?: string;
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

