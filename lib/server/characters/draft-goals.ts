import { randomUUID } from "node:crypto";

import { GoalAuthor, GoalStatus } from "@/lib/constants/characters";
import type { CharacterGoal } from "@/types/characters";

type DraftGoalsInput = { text: string; kind: CharacterGoal["kind"] }[] | undefined;

const buildDraftGoals = (goals: DraftGoalsInput) =>
  (goals ?? []).map((g) => ({ id: randomUUID(), text: g.text, kind: g.kind, status: GoalStatus.ACTIVE, author: GoalAuthor.PLAYER }));

/** Keeps ids of unchanged player goals and every DM-authored goal; only new texts get fresh ids. */
export function mergeDraftGoals(stored: unknown, incoming: DraftGoalsInput): CharacterGoal[] {
  const existing = Array.isArray(stored) ? (stored as CharacterGoal[]) : [];

  const dmGoals = existing.filter((g) => g.author === GoalAuthor.DM);

  const pool = existing.filter((g) => g.author !== GoalAuthor.DM);

  const playerGoals = buildDraftGoals(incoming).map((fresh) => {
    const i = pool.findIndex((g) => g.text === fresh.text && g.kind === fresh.kind);

    return i < 0 ? fresh : pool.splice(i, 1)[0];
  });

  return [...playerGoals, ...dmGoals];
}
