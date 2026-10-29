import type { AbilityRunContext, Downed, SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { Effect, StaticEffect } from "@/lib/utils/abilities/schema";
import type { AbilityEvent, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface EffectApplyInput<E extends Effect = Effect> {
  participants: BattleParticipant[];
  ability: ResolvedAbility;
  effectIndex: number;
  ownerId: string;
  effect: E;
  targetIds: string[];
  event: AbilityEvent;
  ctx: AbilityRunContext;
}

export interface EffectApplyResult {
  participants: BattleParticipant[];
  messages: LogLine[];
  actionModifiers?: { participantId: string; effect: StaticEffect }[];
  downed?: Downed[];
  summons?: SummonRequest[];
}
