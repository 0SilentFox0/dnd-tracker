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
}

export interface AttackData {
  attackerId: string;
  attackerType?: "character" | "unit";
  targetId: string;
  targetType?: "character" | "unit";
  attackRoll: number;
  advantageRoll?: number;
  damageRolls: number[];
  attackId?: string;
}

export interface MoraleCheckData {
  participantId: string;
  d10Roll: number;
}

export interface SpellCastData {
  casterId: string;
  casterType: string;
  spellId: string;
  targetIds: string[];
  damageRolls: number[];
  savingThrows?: Array<{ participantId: string; roll: number }>;
  additionalRollResult?: number;
}

// Skill Trees API
import type { SkillTree } from "./skill-tree";

export interface UpdateSkillTreeParams {
  campaignId: string;
  treeId: string;
  skills: SkillTree;
}

export interface UpdateSkillTreeResponse {
  id: string;
  campaignId: string;
  race: string;
  skills: SkillTree | { mainSkills?: SkillTree["mainSkills"] };
  createdAt: string;
}
