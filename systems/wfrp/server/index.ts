import type { SystemServer } from "@/lib/server/systems/types";
import { hitModelHeroStats, hitModelUnitStats } from "@/lib/utils/battle/balance";
import { CharacteristicsSchema, UnitCharacteristicsSchema } from "@/systems/wfrp/rules/characteristics/schema";
import { wfrpHitModel } from "@/systems/wfrp/rules/combat/hit-model";
import { WfrpItemStatsSchema } from "@/systems/wfrp/rules/equipment/stats";
import { WFRP_AI } from "@/systems/wfrp/server/ai";
import { WfrpFortuneInputSchema } from "@/systems/wfrp/server/attack-input";
import { WFRP_OPERATIONS } from "@/systems/wfrp/server/operations";

export const WFRP_MODULE_SERVER: SystemServer = {
  schemas: { characteristics: CharacteristicsSchema, unitCharacteristics: UnitCharacteristicsSchema, systemStats: WfrpItemStatsSchema, attackInput: WfrpFortuneInputSchema, castInput: WfrpFortuneInputSchema },
  balance: { heroPower: ({ built }) => ({ levels: {}, stats: hitModelHeroStats(built, wfrpHitModel) }), unitStats: (base, built) => hitModelUnitStats(base, built, wfrpHitModel), readsBuiltRules: true },
  operations: WFRP_OPERATIONS,
  battle: {
    channel: {
      load: async () => {
        const { channelMutation, channelSchema } = await import("./battle/channel-mutation");

        return { schema: channelSchema, mutate: channelMutation };
      },
    },
  },
  ai: WFRP_AI,
};
