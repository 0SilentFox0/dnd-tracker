import { ParticipantSide,type ParticipantSourceTypeValue } from "@/lib/constants/battle";

export interface SetupCharacter {
  id: string;
  name: string;
  type: string;
  controlledBy: string | null;
  avatar: string | null;
}

export interface SetupUnit {
  id: string;
  name: string;
  raceId: string | null;
  raceName: string | null;
  avatar: string | null;
  level: number;
}

export interface AllyStats {
  dpr: number;
  totalHp: number;
  kpi: number;
  allyCount: number;
}

export interface SuggestedEnemy {
  unitId: string;
  name: string;
  quantity: number;
  dpr: number;
  hp: number;
  totalDpr: number;
  totalHp: number;
  hpMult?: number;
  dmgMult?: number;
}

/** Детальний розклад DPR персонажа (з balance API) */
export interface CharacterDprBreakdown {
  physicalDpr: number;
  meleeAvg: number;
  rangedAvg: number;
  spellDpr: number;
  nonMagicDpr: number;
  logLines: string[];
}

export interface EntityStats {
  dpr: number;
  hp: number;
  kpi: number;
  toHit?: number;
  ac?: number;
  weaponDpr?: number;
  damageKey?: string;
  dprBreakdown?: CharacterDprBreakdown;
}

export interface UnitEntityStats extends EntityStats {
  name: string;
  level: number;
  raceId: string | null;
  attackBonus?: number;
  resist?: Record<string, number>;
}

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
