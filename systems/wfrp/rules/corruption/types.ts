import type { CharacteristicKey } from "../characteristics/constants";
import type { TestOutcome } from "../downtime/types";

import type { LogLine } from "@/types/text";

export type MutationKind = "physical" | "mental";

export type MutationEffect = { type: "characteristic"; key: CharacteristicKey; amount: number } | { type: "move"; amount: number } | { type: "maxWounds"; amount: number };

export type Mutation = { id: string; at: string; kind: MutationKind; roll: number; text: LogLine; effects: MutationEffect[] };

export type GrantSummary = {
  points: number;
  total: number;
  threshold: number;
  pointsCapped?: true;
  test?: TestOutcome;
  mutation?: { kind: MutationKind; typeRoll: number; roll: number; text: LogLine; effects: MutationEffect[] };
  capped?: true;
};

export type GrantSnapshot = { id: string; at: string; reason: string; before: { points: number }; after: { points: number; mutationId?: string }; summary: GrantSummary };

export type CorruptionState = { points: number; mutations: Mutation[]; last?: GrantSnapshot };

export const EMPTY_CORRUPTION: CorruptionState = { points: 0, mutations: [] };
