export interface Character {
  id: string;
  name: string;
  type: string;
  controlledBy: string | null;
  avatar: string | null;
}

export interface Unit {
  id: string;
  name: string;
  groupId: string | null;
  avatar: string | null;
  race: string | null;
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
}

export interface Participant {
  id: string;
  type: "character" | "unit";
  side: "ally" | "enemy";
  quantity?: number;
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
  dprBreakdown?: CharacterDprBreakdown;
}

export type Difficulty = "easy" | "medium" | "hard";
