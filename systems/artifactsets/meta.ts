import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const ARTIFACTSETS_META = {
  module: "artifactsets",
  kind: "addon",
  keys: [],
  requires: ["d20"],
  i18n: {},
} as const satisfies SystemMeta;
