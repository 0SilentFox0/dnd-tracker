import type { Prisma } from "@prisma/client";

import type { CreateCharacterInput } from "./create-character-schema";
import type { UpdateCharacterInput } from "./update-character-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { Characteristics, RuleSystemDefinition } from "@/lib/utils/rules/systems";

const FOREIGN_FIELDS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "armorClass", "archetype", "classes", "initiative", "speed", "level"] as const;

const omit = <T extends object>(data: T, keys: readonly string[]): T => Object.fromEntries(Object.entries(data).filter(([k]) => !keys.includes(k))) as T;

export function normalizeCharacterInput<T extends CreateCharacterInput | UpdateCharacterInput>(system: RuleSystemDefinition, data: T, rules: Ruleset, mode: "create" | "update"): T {
  if (system.characteristics.kind !== "wfrp") return omit(data, ["characteristics"]);

  if (mode === "update") return omit(data, FOREIGN_FIELDS);

  if (!data.characteristics) throw new ContentError(API_ERRORS.CHARACTERISTICS_REQUIRED, 400);

  return { ...data, level: 1, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 10, archetype: null, classes: [], initiative: rules.initiative.heroMin, speed: 30 };
}

export const characteristicsJson = (c: Characteristics) => c as Prisma.InputJsonObject;
