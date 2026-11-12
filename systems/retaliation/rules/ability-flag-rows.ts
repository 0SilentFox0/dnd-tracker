import { flagSeg, plain } from "@/lib/utils/abilities/registry/effects/flag-kit";
import type { SystemFlagRows } from "@/lib/utils/abilities/registry/effects/system-flag-row";

export const RETALIATION_FLAG_ROWS: SystemFlagRows<"noRetaliation" | "unlimitedRetaliation" | "extraRetaliations"> = {
  noRetaliation: plain("noRetaliation"),
  unlimitedRetaliation: plain("unlimitedRetaliation"),
  extraRetaliations: {
    fields: [{ name: "count", input: "number" }],
    defaults: { count: 1 },
    describe: (e) => [flagSeg("extraRetaliations", { count: e.count })],
  },
};
