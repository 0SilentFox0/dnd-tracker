/**
 * Типи для API битв (request/response)
 */

import type { BattleScene } from "@/types/api";

export interface CreateBattleData {
  name: string;
  description?: string;
  participants: Array<{
    id: string;
    type: "character" | "unit";
    side: "ally" | "enemy";
    quantity?: number;
  }>;
}

export interface BattleBalanceBody {
  allyParticipants?: {
    characterIds?: string[];
    units?: Array<{ id: string; quantity: number }>;
  };
  difficulty?: "easy" | "medium" | "hard";
  minTier?: number;
  maxTier?: number;
  groupId?: string;
  race?: string;
}

export interface BattleBalanceResponse {
  allyStats?: unknown;
  suggestedEnemies?: unknown[];
  characterStats?: Record<string, { dpr: number; hp: number; kpi: number }>;
  unitStats?: Record<string, { dpr: number; hp: number; kpi: number }>;
  _debug?: { mainSkills?: unknown; characterSkillProgress?: unknown };
}

export interface DamageBreakdownRequestBody {
  attackerId: string;
  targetId?: string;
  targetIds?: string[];
  attackId?: string;
  damageRolls: number[];
  isCritical?: boolean;
}

export interface DamageBreakdownTargetResult {
  targetId: string;
  targetName: string;
  targetBreakdown: string[];
  finalDamage: number;
}

export interface DamageBreakdownResponse {
  breakdown: string[];
  totalDamage: number;
  targetBreakdown?: string[];
  finalDamage?: number;
  targets?: DamageBreakdownTargetResult[];
}

export interface SpellPreviewResponse {
  preview?: boolean;
  battleAction?: unknown;
  battle?: BattleScene;
}

export type AddParticipantData = {
  sourceId: string;
  type: "character" | "unit";
  side: "ally" | "enemy";
  quantity?: number;
};
