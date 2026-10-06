import { type GoalInput, MAX_GOALS } from "@/lib/schemas/character-goals";
import type { CharacterGoal } from "@/types/characters";

export function mergePlayerGoals(current: CharacterGoal[], incoming: GoalInput[]): CharacterGoal[] {
  const dmGoals = current.filter((g) => g.author === "dm");

  const dmIds = new Set(dmGoals.map((g) => g.id));

  const own = incoming
    .filter((g) => !dmIds.has(g.id))
    .map((g): CharacterGoal => ({ id: g.id, text: g.text, status: g.status, author: "player" }));

  return [...dmGoals, ...own].slice(0, MAX_GOALS);
}

// A DM writing from a stale cache must not drop player goals added since: keep those the client never saw.
export function mergeDmGoals(current: CharacterGoal[], incoming: GoalInput[], seen: string[] = []): CharacterGoal[] {
  const next = incoming.map((g): CharacterGoal => ({ id: g.id, text: g.text, status: g.status, author: g.author ?? "dm" }));

  const known = new Set([...seen, ...next.map((g) => g.id)]);

  return [...next, ...current.filter((g) => g.author === "player" && !known.has(g.id))].slice(0, MAX_GOALS);
}
