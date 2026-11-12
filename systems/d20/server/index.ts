import { D20_BALANCE } from "./balance";

import type { SystemServer } from "@/lib/server/systems/types";

export const D20_MODULE_SERVER: SystemServer = {
  schemas: {},
  balance: D20_BALANCE,
  battle: {
    "crit-choice": {
      load: async () => {
        const { critChoiceSchema } = await import("@/lib/schemas");

        const { critChoiceMutation } = await import("./battle/crit-choice-mutation");

        return { schema: critChoiceSchema, mutate: critChoiceMutation };
      },
    },
  },
};
