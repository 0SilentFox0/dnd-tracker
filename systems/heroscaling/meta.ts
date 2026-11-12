import type { SystemMeta } from "@/lib/utils/rules/systems/meta";

export const HEROSCALING_META = {
  module: "heroscaling",
  kind: "addon",
  keys: [],
  requires: ["d20"],
  claims: ["progression.maxHp"],
  toggle: "setup",
  i18n: {},
} as const satisfies SystemMeta;
