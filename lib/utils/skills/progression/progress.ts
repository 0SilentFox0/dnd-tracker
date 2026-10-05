import type { TreeNodes } from "./types";

import type { SkillTreeProgress } from "@/lib/schemas/prisma-json";

type Entry = { level?: "basic" | "advanced" | "expert"; unlockedSkills?: string[] };

function entryOf(progress: unknown, key: string | null): Entry | undefined {
  if (!key || !progress || typeof progress !== "object") return undefined;

  const value = (progress as Record<string, unknown>)[key];

  return value && typeof value === "object" ? (value as Entry) : undefined;
}

function ids(entry: Entry | undefined): string[] {
  const list = Array.isArray(entry?.unlockedSkills) ? entry.unlockedSkills : [];

  return [...new Set(list.filter((id): id is string => typeof id === "string" && id !== ""))];
}

export function readUnlocked(tree: TreeNodes, progress: unknown): string[] {
  const own = ids(entryOf(progress, tree.treeId));

  return own.length > 0 ? own : ids(entryOf(progress, tree.jsonId));
}

export function writeUnlocked(tree: TreeNodes, progress: unknown, unlocked: string[]): SkillTreeProgress {
  const base = progress && typeof progress === "object" ? { ...(progress as SkillTreeProgress) } : {};

  const previous = entryOf(progress, tree.treeId) ?? entryOf(progress, tree.jsonId) ?? {};

  if (tree.jsonId && tree.jsonId !== tree.treeId) delete base[tree.jsonId];

  base[tree.treeId] = { ...previous, unlockedSkills: unlocked };

  return base;
}

export function learnedInTree(tree: TreeNodes, unlocked: string[]): string[] {
  return unlocked.filter((id) => tree.nodes.has(id));
}
