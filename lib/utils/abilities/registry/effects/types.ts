import type { AbilityRunContext, Downed, SummonRequest } from "@/lib/utils/abilities/engine/types";
import type { Effect, StaticEffect } from "@/lib/utils/abilities/schema";
import type { AbilityEvent, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

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
  messages: string[];
  actionModifiers?: { participantId: string; effect: StaticEffect }[];
  downed?: Downed[];
  summons?: SummonRequest[];
}
