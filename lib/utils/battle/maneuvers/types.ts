import type { Downed, Rng } from "@/lib/utils/abilities/engine/core/types";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export interface ManeuverInput {
  actorId: string;
  name: string;
  percentOfAttack: number;
  targetIds: string[];
  targetCell?: GridPoint;
  range?: number;
  maxTargets?: number;
  map?: BattleMapConfig | null;
  round: number;
  rng: Rng;
}

export interface ManeuverResult {
  participants: BattleParticipant[];
  messages: string[];
  downed: Downed[];
}
