import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const RETALIATION_META = {
  module: "retaliation",
  kind: "addon",
  keys: [],
  requires: ["d20"],
  i18n: {},
} as const satisfies SystemMeta;
