import type { CoreActionBody } from "./schema";

import type { ServerAttackInput } from "@/lib/utils/battle/attack/server-attack";
import type { NewBattleEvent } from "@/lib/utils/battle/store";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import type { BattleAction, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { LogLine } from "@/types/text";

/** Core's server-rolled strike, handed to the system so it does not import core back (`resolveServerAttack`) */
export type ServerStrike = (input: ServerAttackInput) => { battleAction: BattleAction };

export interface CoreActionAvailability {
  ok: boolean;
  reason?: LogLine;
}

export interface RunCoreActionInput {
  participants: BattleParticipant[];
  body: CoreActionBody;
  strike: ServerStrike;
  map: BattleMapConfig | null;
  rules: Ruleset;
  round: number;
  rng: () => number;
  battleId: string;
  sceneState?: SystemSlot;
}

export interface RunCoreActionResult {
  participants: BattleParticipant[];
  messages: LogLine[];
  actions?: BattleAction[];
  sceneState?: SystemSlot;
}

export interface LegendaryAttackInput {
  participants: BattleParticipant[];
  actorId: string;
  attackIndex: number;
  strike: ServerStrike;
  targetId: string;
  map: BattleMapConfig | null;
  rules: Ruleset;
  round: number;
  rng: () => number;
  battleId: string;
  sceneState?: SystemSlot;
}

export interface LegendaryAttackResult {
  participants: BattleParticipant[];
  action: BattleAction;
  attackName: string;
  sceneState?: SystemSlot;
}

export interface MovementInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  mover: BattleParticipant;
  to: GridPoint;
  path: GridPoint[] | null;
  budget: number;
  strike: ServerStrike;
  cost: number;
  round: number;
  battleId: string;
  rules: Ruleset;
  rng: () => number;
  sceneState?: SystemSlot;
}

export interface MovementResult {
  participants: BattleParticipant[];
  moved: BattleParticipant;
  destination: GridPoint;
  spent: number;
  messages: LogLine[];
  events: NewBattleEvent[];
  sceneState?: SystemSlot;
}
