import { z } from "zod";

import { weatherKindSchema } from "@/lib/schemas";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { MapWeatherData } from "@/types/api";

export const mapWeatherSchema = z.object({ weather: weatherKindSchema.nullable() }) satisfies z.ZodType<MapWeatherData>;

export function mapWeatherMutation(ctx: BattleMutationContext, body: MapWeatherData): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", "У цьому бою немає карти");

  const { weather: _previous, ...rest } = map;

  return {
    participants: ctx.participants,
    pending: ctx.pending,
    events: [],
    scene: { map: body.weather ? { ...rest, weather: body.weather } : rest },
  };
}
