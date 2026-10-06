import { GoalAuthor, MAX_GOALS } from "@/lib/constants/characters";
import type { GoalInput } from "@/lib/schemas/character-goals";
import type { CharacterGoal } from "@/types/characters";

const uniqueById = (goals: CharacterGoal[]) => goals.filter((g, i) => goals.findIndex((x) => x.id === g.id) === i);

export function mergePlayerGoals(current: CharacterGoal[], incoming: GoalInput[]): CharacterGoal[] {
  const dmGoals = current.filter((g) => g.author === GoalAuthor.DM);

  const dmIds = new Set(dmGoals.map((g) => g.id));

  const own = incoming
    .filter((g) => !dmIds.has(g.id))
    .map((g): CharacterGoal => ({ id: g.id, text: g.text, status: g.status, author: GoalAuthor.PLAYER }));

  return uniqueById([...dmGoals, ...own]).slice(0, MAX_GOALS);
}

// A DM writing from a stale cache must not drop player goals added since: keep those the client never saw.
export function mergeDmGoals(current: CharacterGoal[], incoming: GoalInput[], seen: string[] = []): CharacterGoal[] {
  const next = incoming.map((g): CharacterGoal => ({ id: g.id, text: g.text, status: g.status, author: g.author ?? GoalAuthor.DM }));

  const known = new Set([...seen, ...next.map((g) => g.id)]);

  return uniqueById([...next, ...current.filter((g) => g.author === GoalAuthor.PLAYER && !known.has(g.id))]).slice(0, MAX_GOALS);
}
