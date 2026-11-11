import type { CreateCharacterInput } from "./create-character-schema";
import type { UpdateCharacterInput } from "./update-character-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { systemServerOf } from "@/lib/server/systems/registry";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { RuleSystemDefinition } from "@/lib/utils/rules/systems";
import type { SystemData } from "@/lib/utils/rules/systems/slot";

const FOREIGN_FIELDS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "armorClass", "archetype", "class", "subclass", "classes", "initiative", "speed", "level"] as const;

const omit = <T extends object>(data: T, keys: readonly string[]): T => Object.fromEntries(Object.entries(data).filter(([k]) => !keys.includes(k))) as T;

const classMissing = (data: CreateCharacterInput | UpdateCharacterInput, mode: "create" | "update") => !data.classes?.length && (mode === "create" ? !data.class : data.class === "");

export function parseSystemData(rules: Ruleset, value: SystemData, key: "characteristics" | "unitCharacteristics" = "characteristics"): SystemData {
  const schema = systemServerOf(rules).schemas[key];

  return schema ? parseInput(schema, value) as SystemData : value;
}

export function normalizeCharacterInput<T extends CreateCharacterInput | UpdateCharacterInput>(system: RuleSystemDefinition, data: T, rules: Ruleset, mode: "create" | "update"): T {
  if (mode === "create" && system.lineage && !(data as CreateCharacterInput).race) throw new ContentError(API_ERRORS.RACE_REQUIRED, 400);

  if (system.classes && classMissing(data, mode)) throw new ContentError(API_ERRORS.HERO_CLASS_REQUIRED, 400);

  if (!system.characteristics.persisted) return omit(data, ["characteristics"]);

  if (mode === "update") return { ...omit(data, FOREIGN_FIELDS), ...(data.characteristics && { characteristics: parseSystemData(rules, data.characteristics) }) };

  if (!data.characteristics) throw new ContentError(API_ERRORS.CHARACTERISTICS_REQUIRED, 400);

  const { downtime: _downtime, corruption: _corruption, ...characteristics } = parseSystemData(rules, data.characteristics);

  return { ...data, characteristics, level: 1, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 10, archetype: null, class: "", classes: [], initiative: rules.initiative.heroMin, speed: 30 };
}
