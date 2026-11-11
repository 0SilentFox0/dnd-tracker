import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const SKILLTREES_META = {
  module: "skilltrees",
  kind: "addon",
  keys: [],
  requires: ["d20"],
  toggle: "setup",
  i18n: {},
  unusedMechanics: [],
} as const satisfies SystemMeta;
