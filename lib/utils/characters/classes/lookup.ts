import type { GameClassData } from "@/types/classes";

export const classModeOf = (rulesEnabled: boolean, classCount: number): boolean => rulesEnabled && classCount > 0;

export const classesById = (classes: GameClassData[]): Record<string, GameClassData> => Object.fromEntries(classes.map((c) => [c.id, c]));
