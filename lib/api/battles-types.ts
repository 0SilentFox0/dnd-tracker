import { ParticipantSide,type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import type { EntityStats, UnitEntityStats } from "@/types/battle-setup";

/**
 * Типи для API битв (request/response)
 */


export interface CreateBattleData {
  name: string;
  description?: string;
  participants: Array<{
    id: string;
    type: ParticipantSourceTypeValue;
    side: ParticipantSide;
    quantity?: number;
  }>;
}

export interface BattleBalanceBody {
  allyParticipants?: {
    characterIds?: string[];
    units?: Array<{ id: string; quantity: number }>;
  };
  suggest?: boolean;
  raceId?: string;
}

export interface BattleBalanceResponse {
  allyStats?: unknown;
  suggestedEnemies?: unknown[];
  characterStats?: Record<string, EntityStats>;
  unitStats?: Record<string, UnitEntityStats>;
  _debug?: { mainSkills?: unknown; characterSkillProgress?: unknown };
}

export type { AddParticipantData } from "@/types/battle";
