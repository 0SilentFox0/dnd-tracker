import { z } from "zod";

import { WEATHER_KINDS } from "@/lib/constants/battle-weather";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";

export const mapWeatherSchema = z.object({ weather: z.enum(WEATHER_KINDS).nullable() });

export type MapWeatherBody = z.infer<typeof mapWeatherSchema>;

export function mapWeatherMutation(ctx: BattleMutationContext, body: MapWeatherBody): MutationResult {
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
