import type { Prisma } from "@prisma/client";

import type { DraftData } from "./draft-schema";

import { mergeDraftGoals } from "@/lib/server/characters/draft-goals";

export const draftFields = (data: DraftData, storedGoals?: unknown) => ({
  name: data.name,
  race: data.race,
  class: "class" in data ? data.class : "",
  archetype: "archetype" in data ? data.archetype : null,
  alignment: data.alignment ?? null,
  background: data.background ?? null,
  strength: data.strength,
  dexterity: data.dexterity,
  constitution: data.constitution,
  intelligence: data.intelligence,
  wisdom: data.wisdom,
  charisma: data.charisma,
  primaryAbility: data.primaryAbility ?? null,
  goals: mergeDraftGoals(storedGoals, data.goals) as unknown as Prisma.InputJsonValue,
});
