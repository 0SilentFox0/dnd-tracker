import type { WfrpConditionKey } from "../conditions/catalog";

export interface MiscastEffect {
  max: number;
  condition?: { key: WfrpConditionKey; levels: number };
  wounds?: number;
}

// verify against 5e book
export const MISCAST_TABLE: Record<"minor" | "major", readonly MiscastEffect[]> = {
  minor: [
    { max: 20, condition: { key: "fatigued", levels: 1 } },
    { max: 40, condition: { key: "deafened", levels: 1 } },
    { max: 60, condition: { key: "stunned", levels: 1 } },
    { max: 80, wounds: 1 },
    { max: 100, condition: { key: "blinded", levels: 1 }, wounds: 2 },
  ],
  major: [
    { max: 20, condition: { key: "ablaze", levels: 1 }, wounds: 2 },
    { max: 40, condition: { key: "stunned", levels: 2 } },
    { max: 60, condition: { key: "blinded", levels: 1 }, wounds: 3 },
    { max: 80, condition: { key: "broken", levels: 2 } },
    { max: 100, wounds: 5 },
  ],
};
