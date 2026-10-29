import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules";
import type { AnchoredZoneState, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export type { Rng };

export interface AbilityRunContext {
  round: number;
  rng: Rng;
  depth?: number;
  map?: BattleMapConfig | null;
  rules?: Ruleset;
  crit?: CritPicker;
}

/** Учасник без рядка в БД: статы з визначення заклинання. */
export interface InlineSummon {
  name: string;
  size: "tiny" | "small" | "medium" | "large";
  ac: number;
  hp: number | null;
  attacks?: Array<{ name: string; attackBonus: number; damageDice: string; damageType: string; range?: string }>;
  zone?: AnchoredZoneState;
  zoneRounds?: number;
}

export interface SummonRequest {
  ownerId: string;
  group?: string;
  tier?: number;
  unitId?: string;
  count: number;
  casterLevel?: number;
  /** закляття, яким прикликано (для extraSummons) */
  spellId?: string;
  inline?: InlineSummon;
  atCell?: GridPoint;
  expiresRound?: number;
  concentrationOf?: { casterId: string; castId: string };
  castId?: string;
}

export interface AbilityRunResult {
  participants: BattleParticipant[];
  messages: string[];
  actionModifiers: Record<string, StaticEffect[]>;
  fired: string[];
  summons: SummonRequest[];
}

export interface Downed {
  victimId: string;
  actorId: string | null;
}
