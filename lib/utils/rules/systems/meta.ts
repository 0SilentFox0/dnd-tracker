import { D20_META } from "./d20/meta";

// <systems:generated>
import { WFRP_META } from "@/systems/wfrp/meta";
// </systems:generated>

export type SystemPageScope = "character" | "dmCharacters" | "dmCharacter" | "dmRules";

export interface SystemI18n {
  battle?: readonly string[];
  campaign?: readonly string[];
  member?: readonly string[];
  dm?: readonly string[];
  pages?: Partial<Record<SystemPageScope, readonly string[]>>;
  budgetKb?: { member?: number; dm?: number; pages?: Partial<Record<SystemPageScope, number>> };
}

export interface SystemMeta {
  module: string;
  keys: readonly string[];
  i18n: SystemI18n;
  unusedMechanics: readonly string[];
  dmSections?: readonly string[];
}

export const SYSTEM_META: readonly SystemMeta[] = [
  D20_META,
  // <systems:generated>
  WFRP_META,
  // </systems:generated>
];

export const RULE_SYSTEM_KEYS: readonly string[] = SYSTEM_META.flatMap((m) => m.keys);

export const isRuleSystemKey = (k: unknown): k is string => typeof k === "string" && RULE_SYSTEM_KEYS.includes(k);

export const metaOf = (key: string): SystemMeta | undefined => SYSTEM_META.find((m) => m.keys.includes(key));

export const systemNamespaces = (): readonly string[] =>
  [...new Set(SYSTEM_META.flatMap(({ i18n: { battle, campaign, member, dm, pages } }) => [...(battle ?? []), ...(campaign ?? []), ...(member ?? []), ...(dm ?? []), ...Object.values(pages ?? {}).flat()]))];
