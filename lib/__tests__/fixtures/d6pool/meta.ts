import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const D6POOL_META = {
  module: "d6pool",
  keys: ["d6pool"],
  i18n: { battle: ["battleD6pool"], pages: { draft: ["d6poolCreation"] } },
} as const satisfies SystemMeta;
