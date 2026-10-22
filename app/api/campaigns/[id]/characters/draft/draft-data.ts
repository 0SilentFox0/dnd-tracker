import { randomUUID } from "node:crypto";
import type { z } from "zod";

import type { draftSchema } from "./draft-schema";

import { GoalAuthor, GoalStatus } from "@/lib/constants/characters";

type DraftData = z.infer<typeof draftSchema>;

export const buildDraftGoals = (goals: DraftData["goals"]) =>
  (goals ?? []).map((g) => ({ id: randomUUID(), text: g.text, kind: g.kind, status: GoalStatus.ACTIVE, author: GoalAuthor.PLAYER }));

export const draftFields = (data: DraftData) => ({
  name: data.name,
  race: data.race,
  class: data.class,
  archetype: data.archetype,
  alignment: data.alignment ?? null,
  background: data.background ?? null,
  strength: data.strength,
  dexterity: data.dexterity,
  constitution: data.constitution,
  intelligence: data.intelligence,
  wisdom: data.wisdom,
  charisma: data.charisma,
  primaryAbility: data.primaryAbility ?? null,
  goals: buildDraftGoals(data.goals),
});
