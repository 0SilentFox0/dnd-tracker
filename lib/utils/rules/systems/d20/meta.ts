import type { SystemMeta } from "../meta";

export const D20_META = {
  module: "d20",
  kind: "base",
  keys: ["homm", "dnd5e"],
  i18n: {},
  unusedMechanics: ["advancement", "tables"],
} as const satisfies SystemMeta;
