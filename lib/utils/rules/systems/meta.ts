// <systems:generated>
import { ARTIFACTSETS_META } from "@/systems/artifactsets/meta";
import { D20_META } from "@/systems/d20/meta";
import { HEROSCALING_META } from "@/systems/heroscaling/meta";
import { HOMM_META } from "@/systems/homm/meta";
import { MORALE_META } from "@/systems/morale/meta";
import { RETALIATION_META } from "@/systems/retaliation/meta";
import { SKILLTREES_META } from "@/systems/skilltrees/meta";
import { UNITSTACKS_META } from "@/systems/unitstacks/meta";
import { WFRP_META } from "@/systems/wfrp/meta";
// </systems:generated>

export type SystemPageScope = "character" | "dmCharacters" | "dmCharacter" | "dmRules" | "draft";

export interface SystemI18n {
  battle?: readonly string[];
  campaign?: readonly string[];
  member?: readonly string[];
  dm?: readonly string[];
  pages?: Partial<Record<SystemPageScope, readonly string[]>>;
  budgetKb?: { battle?: number; member?: number; dm?: number; pages?: Partial<Record<SystemPageScope, number>> };
}

export type SystemKind = "base" | "addon" | "preset";

export interface SystemMeta {
  module: string;
  /** Absent means "base" until every folder declares it */
  kind?: SystemKind;
  keys: readonly string[];
  preset?: { base: string; modules: readonly string[] };
  requires?: readonly string[];
  conflicts?: readonly string[];
  claims?: readonly string[];
  after?: readonly string[];
  toggle?: "free" | "setup";
  /** Cell scale of a base; read by `cellFeetOf` without touching the registry */
  distance?: { unit: "ft" | "yd"; perCell: number };
  tokens?: readonly string[];
  i18n: SystemI18n;
  dmSections?: readonly string[];
}

export const SYSTEM_META = [
  // <systems:generated>
  ARTIFACTSETS_META,
  D20_META,
  HEROSCALING_META,
  HOMM_META,
  MORALE_META,
  RETALIATION_META,
  SKILLTREES_META,
  UNITSTACKS_META,
  WFRP_META,
  // </systems:generated>
] as const satisfies readonly SystemMeta[];

type NamespacesIn<T> = T extends readonly (infer U)[] ? U : T extends object ? NamespacesIn<T[keyof T]> : never;

export type SystemNamespace = NamespacesIn<(typeof SYSTEM_META)[number]["i18n"]>;

export const RULE_SYSTEM_KEYS: readonly string[] = (SYSTEM_META as readonly SystemMeta[]).flatMap((m) => m.keys);

export const isRuleSystemKey = (k: unknown): k is string => typeof k === "string" && RULE_SYSTEM_KEYS.includes(k);

export const metaOf = (key: string): SystemMeta | undefined => (SYSTEM_META as readonly SystemMeta[]).find((m) => m.keys.includes(key));

export const systemNamespaces = (): readonly string[] =>
  [...new Set((SYSTEM_META as readonly SystemMeta[]).flatMap(({ i18n: { battle, campaign, member, dm, pages } }) => [...(battle ?? []), ...(campaign ?? []), ...(member ?? []), ...(dm ?? []), ...Object.values(pages ?? {}).flat()]))];
