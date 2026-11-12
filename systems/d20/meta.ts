import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const D20_META = {
  module: "d20",
  kind: "base",
  keys: ["dnd5e"],
  tokens: ["dnd5e"],
  i18n: {},
} as const satisfies SystemMeta;
