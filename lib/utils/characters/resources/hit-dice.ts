import { currentHp, withHp } from "./hp";

import { CharacterClassesSchema } from "@/lib/schemas/classes";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { CharacterResources } from "@/types/characters";
import type { ResolvedClassEntry } from "@/types/classes";

export interface HitDiceEntry {
  classId: string;
  name: string;
  die: number;
  level: number;
}

export function hitDicePool(entries: ResolvedClassEntry[]): HitDiceEntry[] {
  return entries.flatMap((e) => (e.class ? [{ classId: e.classId, name: e.class.name, die: e.class.hitDie, level: e.level }] : []));
}

export function hitDicePoolFor(classes: unknown, classesById: Parameters<typeof resolveClassEntries>[1]): HitDiceEntry[] {
  const entries = CharacterClassesSchema.safeParse(classes);

  return entries.success ? hitDicePool(resolveClassEntries(entries.data, classesById)) : [];
}

export function restoreHitDice(spent: Record<string, number> | undefined, pool: HitDiceEntry[], mode: "half" | "all"): Record<string, number> | undefined {
  if (!spent) return undefined;

  const total = pool.reduce((sum, e) => sum + e.level, 0);

  let left = mode === "all" ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(total / 2));

  const next: Record<string, number> = {};

  for (const e of [...pool].sort((a, b) => b.die - a.die)) {
    const was = spent[e.classId] ?? 0;

    const back = Math.min(was, left);

    left -= back;

    if (was - back > 0) next[e.classId] = was - back;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

export type SpendHitDieError = "closed" | "dead" | "no_dice" | "hp_full";

export type SpendHitDieResult =
  | { ok: true; resources: CharacterResources; die: number; healed: number; hpBefore: number; hpAfter: number }
  | { ok: false; error: SpendHitDieError };

export function spendHitDie(r: CharacterResources, input: { pool: HitDiceEntry[]; classId: string; roll: number; conMod: number; maxHp: number }): SpendHitDieResult {
  if (!r.shortRestOpen) return { ok: false, error: "closed" };

  if (r.dead) return { ok: false, error: "dead" };

  const entry = input.pool.find((e) => e.classId === input.classId);

  const spent = r.hitDiceSpent?.[input.classId] ?? 0;

  if (!entry || spent >= entry.level) return { ok: false, error: "no_dice" };

  const hpBefore = currentHp(r, input.maxHp);

  if (hpBefore >= input.maxHp) return { ok: false, error: "hp_full" };

  const healed = Math.max(0, input.roll + input.conMod);

  const hpAfter = Math.min(input.maxHp, hpBefore + healed);

  const counted = { ...r, hitDiceSpent: { ...r.hitDiceSpent, [input.classId]: spent + 1 } };

  return { ok: true, die: entry.die, healed, hpBefore, hpAfter, resources: withHp(counted, hpAfter, input.maxHp) };
}
