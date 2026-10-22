import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import type { draftSchema } from "./draft-schema";

import { GoalAuthor, GoalStatus } from "@/lib/constants/characters";
import type { CharacterGoal } from "@/types/characters";

type DraftData = z.infer<typeof draftSchema>;

const buildDraftGoals = (goals: DraftData["goals"]) =>
  (goals ?? []).map((g) => ({ id: randomUUID(), text: g.text, kind: g.kind, status: GoalStatus.ACTIVE, author: GoalAuthor.PLAYER }));

/** Keeps ids of unchanged player goals and every DM-authored goal; only new texts get fresh ids. */
function mergeDraftGoals(stored: unknown, incoming: DraftData["goals"]): CharacterGoal[] {
  const existing = Array.isArray(stored) ? (stored as CharacterGoal[]) : [];

  const dmGoals = existing.filter((g) => g.author === GoalAuthor.DM);

  const pool = existing.filter((g) => g.author !== GoalAuthor.DM);

  const playerGoals = buildDraftGoals(incoming).map((fresh) => {
    const i = pool.findIndex((g) => g.text === fresh.text && g.kind === fresh.kind);

    return i < 0 ? fresh : pool.splice(i, 1)[0];
  });

  return [...playerGoals, ...dmGoals];
}

export const draftFields = (data: DraftData, storedGoals?: unknown) => ({
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
  goals: mergeDraftGoals(storedGoals, data.goals) as unknown as Prisma.InputJsonValue,
});
