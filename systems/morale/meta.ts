import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const MORALE_META = {
  module: "morale",
  kind: "addon",
  keys: [],
  requires: ["d20"],
  i18n: {},
  unusedMechanics: [],
} as const satisfies SystemMeta;
