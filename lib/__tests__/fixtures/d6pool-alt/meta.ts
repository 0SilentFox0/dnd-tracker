import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

/** Claims the same slot as d6pool-plus and does not declare the conflict */
export const D6POOL_ALT_META = {
  module: "d6pool-alt",
  kind: "addon",
  keys: [],
  requires: ["d6pool"],
  claims: ["turn.order"],
  i18n: {},
  unusedMechanics: [],
} as const satisfies SystemMeta;

export const D6POOL_ALT_DECLARED_META: SystemMeta = { ...D6POOL_ALT_META, conflicts: ["d6pool-plus"] };
