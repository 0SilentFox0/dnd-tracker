import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const D6POOL_PLUS_META = {
  module: "d6pool-plus",
  kind: "addon",
  keys: [],
  requires: ["d6pool"],
  claims: ["turn.order"],
  i18n: {},
} as const satisfies SystemMeta;
