import { composeSystem } from "./compose";
import { d20System } from "./d20";
import { RULE_SYSTEM_KEYS } from "./meta";
import { type ModuleEntry, resolveSystem } from "./resolve";
import type { RuleSystemDefinition } from "./types";

import { type Coin, COIN_VALUE } from "@/lib/constants/inventory";
import type { Ruleset } from "@/lib/utils/rules/schema";
// <systems:generated>
import { ARTIFACTSETS_MODULE } from "@/systems/artifactsets";
import { HEROSCALING_MODULE } from "@/systems/heroscaling";
import { HOMM_MODULE } from "@/systems/homm";
import { MORALE_MODULE } from "@/systems/morale";
import { RETALIATION_MODULE } from "@/systems/retaliation";
import { SKILLTREES_MODULE } from "@/systems/skilltrees";
import { UNITSTACKS_MODULE } from "@/systems/unitstacks";
import { WFRP_MODULE } from "@/systems/wfrp";
// </systems:generated>

export const MODULES: Record<string, ModuleEntry<RuleSystemDefinition>> = {
  // <systems:generated>
  artifactsets: ARTIFACTSETS_MODULE,
  heroscaling: HEROSCALING_MODULE,
  homm: HOMM_MODULE,
  morale: MORALE_MODULE,
  retaliation: RETALIATION_MODULE,
  skilltrees: SKILLTREES_MODULE,
  unitstacks: UNITSTACKS_MODULE,
  wfrp: WFRP_MODULE,
  // </systems:generated>
};

const D20_BASES: Record<string, RuleSystemDefinition> = { homm: d20System("homm"), dnd5e: d20System("dnd5e") };

const systemCache = new Map<string, RuleSystemDefinition>();

const resolve = (system: Pick<Ruleset, "system">["system"]): RuleSystemDefinition =>
  resolveSystem(system, systemCache, { entries: MODULES, fallbackBase: (key) => D20_BASES[key], compose: composeSystem });

export const RULE_SYSTEM_REGISTRY: Record<string, RuleSystemDefinition> = Object.fromEntries(RULE_SYSTEM_KEYS.map((key) => [key, resolve({ key })]));

export const isEmptySystemData = (value: unknown): boolean => Object.values(RULE_SYSTEM_REGISTRY).some((system) => system.characteristics.isEmpty(value));

export const ruleSystemOf = (rules: Pick<Ruleset, "system">): RuleSystemDefinition => {
  const { key, modules } = rules.system;

  if (!modules && Object.hasOwn(RULE_SYSTEM_REGISTRY, key)) return RULE_SYSTEM_REGISTRY[key];

  return resolve(rules.system);
};

export const systemKeyOf = (rules: Pick<Ruleset, "system">): string => rules.system.key;

export const currencyValueOf = (rules: Pick<Ruleset, "system">): Record<Coin, number> => ruleSystemOf(rules).currency?.value ?? COIN_VALUE;

export const ruleSystemByKey = (key: string): RuleSystemDefinition | undefined => (Object.hasOwn(RULE_SYSTEM_REGISTRY, key) ? RULE_SYSTEM_REGISTRY[key] : undefined);
