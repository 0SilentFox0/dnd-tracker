import type { AbilityKey } from "@/lib/constants/abilities";
import { ParticipantSide,type ParticipantSourceTypeValue } from "@/lib/constants/battle";
import type { XpDifficulty } from "@/lib/utils/battle/balance/xp-budget";
import type { BattleMapConfig } from "@/types/battle";
import type { LogLine } from "@/types/text";

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
  xp?: number;
}

/** Детальний розклад DPR персонажа (з balance API) */
export interface CharacterDprBreakdown {
  physicalDpr: number;
  meleeAvg: number;
  rangedAvg: number;
  spellDpr: number;
  nonMagicDpr: number;
  logLines: LogLine[];
}

export interface EntityStats {
  dpr: number;
  hp: number;
  kpi: number;
  level?: number;
  toHit?: number;
  ac?: number;
  weaponDpr?: number;
  damageKey?: string;
  saves?: Partial<Record<string, number>>;
  spellResist?: Record<string, number>;
  dprBreakdown?: CharacterDprBreakdown;
}

/** Найкраще закляття юніта, коли воно сильніше за зброю (баланс зважує рятунки, опір партії і слоти). */
export interface UnitSpellPower {
  dpr: number;
  damageType: string;
  save?: { ability: AbilityKey; dc: number; half: boolean };
  weaponDpr: number;
  weaponToHit?: number;
}

export interface UnitEntityStats extends EntityStats {
  name: string;
  level: number;
  raceId: string | null;
  attackBonus?: number;
  resist?: Record<string, number>;
  spell?: UnitSpellPower;
  summon?: boolean;
  cr?: number;
  xp?: number;
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
  map?: BattleMapConfig | null;
}

export interface BattleBalanceBody {
  allyParticipants?: {
    characterIds?: string[];
    units?: Array<{ id: string; quantity: number }>;
  };
  suggest?: boolean;
  raceId?: string;
  xpDifficulty?: XpDifficulty;
}

export interface BattleBalanceResponse {
  allyStats?: unknown;
  suggestedEnemies?: unknown[];
  characterStats?: Record<string, EntityStats>;
  unitStats?: Record<string, UnitEntityStats>;
  _debug?: { mainSkills?: unknown; characterSkillProgress?: unknown };
}

export type { AddParticipantData } from "@/types/battle";
