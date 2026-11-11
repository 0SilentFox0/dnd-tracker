import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const HOMM_META = {
  module: "homm",
  kind: "preset",
  // TODO(E2 part 2, d20 move): becomes ["homm"] once D20_META.keys drops "homm"
  keys: [],
  preset: { base: "d20", modules: ["morale", "retaliation", "heroscaling", "skilltrees", "artifactsets", "unitstacks"] },
  i18n: {},
  unusedMechanics: ["advancement", "tables"],
} as const satisfies SystemMeta;
