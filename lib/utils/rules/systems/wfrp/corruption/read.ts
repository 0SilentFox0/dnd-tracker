import { CHARACTERISTIC_KEYS } from "../characteristics/constants";
import { MUTATIONS_MAX, POINTS_MAX, REASON_MAX } from "./constants";
import type { CorruptionState, GrantSnapshot, Mutation, MutationEffect } from "./types";

import { MUTATION_EFFECT_LIMITS, MUTATION_EFFECTS_MAX } from "@/lib/constants/wfrp-mutations";
import { isRecord } from "@/lib/utils/common/is-record";
import type { LogLine } from "@/types/text";

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

const isStr = (v: unknown, min: number, max: number): v is string => typeof v === "string" && v.length >= min && v.length <= max;

const hasOnly = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));

const isSigned = (v: unknown, limit: number): v is number => isInt(v, -limit, limit) && v !== 0;

function readText(raw: unknown): LogLine | undefined {
  if (isStr(raw, 1, 200)) return raw;

  if (isRecord(raw) && isStr(raw.message, 1, 200) && raw.params === undefined && hasOnly(raw, ["message"])) return { message: raw.message };

  return undefined;
}

export function readEffect(raw: unknown): MutationEffect | undefined {
  if (!isRecord(raw)) return undefined;

  const limits = MUTATION_EFFECT_LIMITS;

  if (raw.type === "characteristic" && hasOnly(raw, ["type", "key", "amount"]) && (CHARACTERISTIC_KEYS as readonly unknown[]).includes(raw.key) && isSigned(raw.amount, limits.characteristic)) return { type: "characteristic", key: raw.key as (typeof CHARACTERISTIC_KEYS)[number], amount: raw.amount };

  if (raw.type === "move" && hasOnly(raw, ["type", "amount"]) && isSigned(raw.amount, limits.move)) return { type: "move", amount: raw.amount };

  if (raw.type === "maxWounds" && hasOnly(raw, ["type", "amount"]) && isSigned(raw.amount, limits.maxWounds)) return { type: "maxWounds", amount: raw.amount };

  return undefined;
}

export function readEffects(raw: unknown): MutationEffect[] | undefined {
  if (!Array.isArray(raw) || raw.length > MUTATION_EFFECTS_MAX) return undefined;

  const list = raw.map(readEffect);

  return list.every((e): e is MutationEffect => e !== undefined) ? list : undefined;
}

function readMutation(raw: unknown): Mutation | undefined {
  if (!isRecord(raw) || !isStr(raw.id, 1, 64) || !isStr(raw.at, 1, 40) || (raw.kind !== "physical" && raw.kind !== "mental") || !isInt(raw.roll, 1, 100)) return undefined;

  const text = readText(raw.text);

  const effects = readEffects(raw.effects);

  return text !== undefined && effects ? { id: raw.id, at: raw.at, kind: raw.kind, roll: raw.roll, text, effects } : undefined;
}

function readLast(raw: unknown): GrantSnapshot | undefined {
  if (!isRecord(raw) || !isStr(raw.id, 1, 64) || !isStr(raw.at, 1, 40) || !isStr(raw.reason, 0, REASON_MAX) || !isRecord(raw.summary) || !isRecord(raw.before) || !isRecord(raw.after)) return undefined;

  if (!isInt(raw.before.points, 0, POINTS_MAX) || !isInt(raw.after.points, 0, POINTS_MAX)) return undefined;

  if (raw.after.mutationId !== undefined && !isStr(raw.after.mutationId, 1, 64)) return undefined;

  return {
    id: raw.id,
    at: raw.at,
    reason: raw.reason,
    before: { points: raw.before.points },
    after: { points: raw.after.points, ...(raw.after.mutationId === undefined ? {} : { mutationId: raw.after.mutationId }) },
    summary: raw.summary as GrantSnapshot["summary"],
  };
}

export function readCorruption(raw: unknown): CorruptionState | undefined {
  if (!isRecord(raw)) return undefined;

  if (raw.points !== undefined && !isInt(raw.points, 0, POINTS_MAX)) return undefined;

  const rawMutations = raw.mutations ?? [];

  if (!Array.isArray(rawMutations) || rawMutations.length > MUTATIONS_MAX) return undefined;

  const mutations = rawMutations.map(readMutation);

  if (!mutations.every((m): m is Mutation => m !== undefined) || new Set(mutations.map((m) => m.id)).size !== mutations.length) return undefined;

  const last = raw.last === undefined ? undefined : readLast(raw.last);

  if (raw.last !== undefined && !last) return undefined;

  return { points: (raw.points as number | undefined) ?? 0, mutations, ...(last ? { last } : {}) };
}
