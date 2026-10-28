import type { Choice } from "@/types/choices";
import type { GameClassData, Subclass } from "@/types/classes";

export const classChoiceDefs = (cls: GameClassData, subclass: Subclass | null): Choice[] => [...cls.features, ...(subclass?.features ?? [])].flatMap((f) => f.choices ?? []);

export const levelUpChoiceDefs = (cls: GameClassData, subclass: Subclass | null, nextLevel: number): Choice[] =>
  classChoiceDefs(cls, subclass).filter((c) => c.level === nextLevel || (c.level < nextLevel && typeof c.count !== "number"));
