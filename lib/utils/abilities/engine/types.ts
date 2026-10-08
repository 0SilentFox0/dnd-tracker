import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export type Rng = () => number;

export interface AbilityRunContext {
  round: number;
  rng: Rng;
  depth?: number;
}

export interface SummonRequest {
  ownerId: string;
  group?: string;
  tier?: number;
  unitId?: string;
  count: number;
  casterLevel?: number;
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
